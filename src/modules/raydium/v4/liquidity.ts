import { isNullish } from '@kdt310722/utils/common'
import { Emitter } from '@kdt310722/utils/event'
import { type PromiseLock, createLock } from '@kdt310722/utils/promise'
import { Price, TOKEN_PROGRAM_ID, Token } from '@raydium-io/raydium-sdk'
import type { Connection, PublicKey } from '@solana/web3.js'
import type BN from 'bn.js'
import type { PublicKeyLike } from '../../../types/entities'
import type { OpenOrders, OpenOrdersEntity } from '../../open-orders'
import type { RaydiumAmmV4Pool, RaydiumAmmV4PoolEntity } from './pool'
import type { RaydiumAmmV4Vault } from './vault'

export interface RaydiumAmmV4LiquidityContext {
    pool: RaydiumAmmV4Pool
    openOrders: OpenOrders
    vault: RaydiumAmmV4Vault
}

export interface Reserves {
    base: BN
    quote: BN
    source: number
}

export type RaydiumAmmV4LiquidityEvents = {
    update: (pool: Required<RaydiumAmmV4PoolEntity>, reserves: Reserves) => void
}

export class RaydiumAmmV4Liquidity extends Emitter<RaydiumAmmV4LiquidityEvents> {
    protected readonly lockers: Record<string, PromiseLock>
    protected readonly reserves: Map<string, Reserves>
    protected readonly cacheOnly = true
    protected readonly tokens: Record<string, Token>

    public constructor(protected readonly context: RaydiumAmmV4LiquidityContext, protected readonly connection: Connection) {
        super()

        this.lockers = {}
        this.reserves = new Map()
        this.tokens = {}

        this.registerListeners()
    }

    public async getPrice(id: PublicKeyLike) {
        return this.calculatePrice(id, await this.get(id))
    }

    public async calculatePrice(id: PublicKeyLike, reserves: Reserves) {
        const pool = await this.context.pool.findOrFail(id)
        const baseToken = this.tokens[pool.baseMint.toString()] ??= new Token(TOKEN_PROGRAM_ID, pool.baseMint, pool.baseDecimals)
        const quoteToken = this.tokens[pool.quoteMint.toString()] ??= new Token(TOKEN_PROGRAM_ID, pool.quoteMint, pool.quoteDecimals)

        return new Price(baseToken, reserves.base, quoteToken, reserves.quote)
    }

    public async get(poolId: PublicKeyLike) {
        const reserves = this.reserves.get(poolId.toString())

        if (reserves) {
            return reserves
        }

        const pool = await this.getPool(await this.context.pool.findOrFail(poolId))

        if (!pool) {
            throw new Error('Pool not found')
        }

        const [openOrders, [baseVaultTokenAmount, quoteVaultTokenAmount]] = await Promise.all([
            this.context.openOrders.findOrFail(pool.openOrders),
            this.getVaultTokenAmounts(pool, false),
        ])

        if (!baseVaultTokenAmount || !quoteVaultTokenAmount) {
            throw new Error('Vault token amount not found')
        }

        this.updateReserves(pool, openOrders, baseVaultTokenAmount, quoteVaultTokenAmount, 0)

        return this.reserves.get(poolId.toString())!
    }

    protected updateReserves(pool: Required<RaydiumAmmV4PoolEntity>, openOrders: OpenOrdersEntity, baseVaultTokenAmount: BN, quoteVaultTokenAmount: BN, source: number) {
        const id = pool.id.toString()
        const previousReserves = this.reserves.get(id)
        const base = baseVaultTokenAmount.add(openOrders.baseTokenTotal.sub(pool.baseNeedTakePnl))
        const quote = quoteVaultTokenAmount.add(openOrders.quoteTokenTotal.sub(pool.quoteNeedTakePnl))

        if (previousReserves && base.eq(previousReserves.base) && quote.eq(previousReserves.quote)) {
            return
        }

        this.reserves.set(id, { base, quote, source })
        this.emit('update', pool, { base, quote, source })
    }

    protected async onPoolUpdate(pool: RaydiumAmmV4PoolEntity) {
        await this.run(pool.id.toString(), async () => {
            const [fullPool, openOrders, [baseVaultTokenAmount, quoteVaultTokenAmount]] = await Promise.all([
                this.getPool(pool),
                this.context.openOrders.find(pool.openOrders, this.cacheOnly),
                this.getVaultTokenAmounts(pool, this.cacheOnly),
            ])

            if (!fullPool || !openOrders || !baseVaultTokenAmount || !quoteVaultTokenAmount) {
                return
            }

            this.updateReserves(fullPool, openOrders, baseVaultTokenAmount, quoteVaultTokenAmount, 1)
        })
    }

    protected async onOpenOrdersUpdate(pubkey: PublicKey, openOrders: OpenOrdersEntity) {
        const pool = await this.context.pool.findByOpenOrderId(pubkey, this.cacheOnly)

        if (!pool) {
            return
        }

        await this.run(pool.id.toString(), async () => {
            const [fullPool, [baseVaultTokenAmount, quoteVaultTokenAmount]] = await Promise.all([
                this.getPool(pool), this.getVaultTokenAmounts(pool, this.cacheOnly),
            ])

            if (!fullPool || !baseVaultTokenAmount || !quoteVaultTokenAmount) {
                return
            }

            this.updateReserves(fullPool, openOrders, baseVaultTokenAmount, quoteVaultTokenAmount, 2)
        })
    }

    protected async onVaultUpdate(account: PublicKey, amount: BN) {
        const pool = (await this.context.pool.findByBaseVault(account, this.cacheOnly)) ?? (await this.context.pool.findByQuoteVault(account, this.cacheOnly))

        if (!pool) {
            return
        }

        await this.run(pool.id.toString(), async () => {
            const fullPool = await this.getPool(pool)

            if (!fullPool) {
                return
            }

            const openOrders = await this.context.openOrders.find(pool.openOrders, this.cacheOnly)

            if (!openOrders) {
                return
            }

            const isBaseVault = pool.baseVault.equals(account)
            const baseVaultTokenAmount = isBaseVault ? amount : await this.context.vault.find(pool.baseVault, this.cacheOnly)
            const quoteVaultTokenAmount = isBaseVault ? await this.context.vault.find(pool.quoteVault, this.cacheOnly) : amount

            if (!baseVaultTokenAmount || !quoteVaultTokenAmount) {
                return
            }

            this.updateReserves(fullPool, openOrders, baseVaultTokenAmount, quoteVaultTokenAmount, 3)
        })
    }

    protected async getPool(pool: RaydiumAmmV4PoolEntity) {
        return isNullish(pool.baseNeedTakePnl) || isNullish(pool.quoteNeedTakePnl) ? await this.context.pool.find(pool.id, this.cacheOnly) : (pool as Required<RaydiumAmmV4PoolEntity>)
    }

    protected getVaultTokenAmounts(pool: RaydiumAmmV4PoolEntity, cacheOnly = true) {
        return Promise.all([this.context.vault.find(pool.baseVault, cacheOnly), this.context.vault.find(pool.quoteVault, cacheOnly)])
    }

    protected registerListeners() {
        this.context.pool.on('new', this.onPoolUpdate.bind(this))
        this.context.pool.on('update', this.onPoolUpdate.bind(this))
        this.context.openOrders.on('update', this.onOpenOrdersUpdate.bind(this))
        this.context.vault.on('update', this.onVaultUpdate.bind(this))
    }

    protected async run(id: string, fn: () => Promise<void>) {
        this.lockers[id] ??= createLock()

        await this.lockers[id].wait().then(() => (
            this.lockers[id].run(fn)
        ))
    }
}
