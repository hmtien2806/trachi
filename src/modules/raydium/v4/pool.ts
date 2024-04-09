import { type Logger, highlight, message } from '@kdt310722/logger'
import { notNullish } from '@kdt310722/utils/common'
import { Emitter } from '@kdt310722/utils/event'
import { tap } from '@kdt310722/utils/function'
import { format } from '@kdt310722/utils/number'
import { timestamp } from '@kdt310722/utils/time'
import { LIQUIDITY_STATE_LAYOUT_V4, type LiquidityPoolKeysV4, MAINNET_PROGRAM_ID, u64 } from '@raydium-io/raydium-sdk'
import type { AccountInfo, Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type BN from 'bn.js'
import type { Repository } from 'typeorm'
import { connection } from '../../../common/connection'
import { MINIMAL_POOL_STATE_LAYOUT_V4, RAYDIUM_AMM_POOL_V4_PROGRAM_IDS } from '../../../constants'
import { datasource } from '../../../core/database'
import { createChildLogger } from '../../../core/logger'
import { RaydiumAmmV4Pool as BaseRaydiumAmmV4Pool } from '../../../entities/raydium-amm-v4-pool'
import type { PublicKeyLike } from '../../../types/entities'
import { upsert } from '../../../utils/databases/upsert'
import { formatRaydiumAmmV4PoolAccount } from '../../../utils/formatters/format-raydium-amm-v4-pool-account'
import { formatRaydiumAmmV4PoolKeys } from '../../../utils/formatters/format-raydium-amm-v4-pool-keys'
import { isRaydiumAmmPoolSwapableStatus } from '../../../utils/pools'
import { toPublicKey } from '../../../utils/public-key'
import type { Market } from '../../market'

export interface RaydiumAmmV4PoolEntity extends BaseRaydiumAmmV4Pool {
    status?: BN
    baseNeedTakePnl?: BN
    quoteNeedTakePnl?: BN
}

export type RaydiumAmmV4Events = {
    'new': (pool: RaydiumAmmV4PoolEntity) => void
    'update': (pool: RaydiumAmmV4PoolEntity) => void
}

export class RaydiumAmmV4Pool extends Emitter<RaydiumAmmV4Events> {
    protected readonly pools: Map<string, RaydiumAmmV4PoolEntity>
    protected readonly poolKeys: Map<string, LiquidityPoolKeysV4>
    protected readonly repository: Repository<BaseRaydiumAmmV4Pool>
    protected readonly logger: Logger
    protected readonly defaultPubKey = PublicKey.default

    protected readonly poolByOpenOrder: Map<string, string>
    protected readonly poolByBaseVault: Map<string, string>
    protected readonly poolByQuoteVault: Map<string, string>

    public constructor(protected readonly connection: Connection, protected readonly market: Market) {
        super()

        this.pools = new Map()
        this.poolKeys = new Map()
        this.poolByOpenOrder = new Map()
        this.poolByBaseVault = new Map()
        this.poolByQuoteVault = new Map()
        this.repository = datasource.getRepository(BaseRaydiumAmmV4Pool)
        this.logger = createChildLogger('app:modules:raydium-amm-v4:pool')
    }

    public hasPoolInCache(id: PublicKeyLike) {
        return this.pools.has(id.toString())
    }

    public async getPoolKeys(pubkeyOrPool: PublicKeyLike | BaseRaydiumAmmV4Pool) {
        const pubkey = pubkeyOrPool instanceof BaseRaydiumAmmV4Pool ? pubkeyOrPool.id : pubkeyOrPool
        const id = pubkey.toString()
        const poolKeys = this.poolKeys.get(id)

        if (poolKeys) {
            return poolKeys
        }

        const pool = pubkeyOrPool instanceof BaseRaydiumAmmV4Pool ? pubkeyOrPool : await this.findOrFail(pubkey)
        const market = await this.market.findOrFail(pool.marketId)

        return tap(formatRaydiumAmmV4PoolKeys(pool, market), (result) => {
            this.poolKeys.set(id, result)
        })
    }

    public async findByPair(tokenA: PublicKeyLike, tokenB: PublicKeyLike) {
        const poolIds = await this.repository.find({ select: ['id', 'baseMint', 'quoteMint'], where: [{ baseMint: tokenA, quoteMint: tokenB }, { baseMint: tokenB, quoteMint: tokenA }] })

        if (poolIds.length > 0) {
            return poolIds.map(({ id }) => this.pools.get(id.toString())).filter(notNullish)
        }

        const [poolsByBaseMint, poolsByQuoteMint] = await Promise.all([
            this.findBy({ baseMint: tokenA.toString(), quoteMint: tokenB.toString() }),
            this.findBy({ baseMint: tokenB.toString(), quoteMint: tokenA.toString() }),
        ])

        return [...poolsByBaseMint, ...poolsByQuoteMint]
    }

    public async findBy(filterKeys: Record<string, string>, cacheProperty?: string, cacheKey?: string, cacheOnly = false) {
        if (cacheProperty && cacheKey) {
            const poolId = (this[cacheProperty] as any).get(cacheKey)

            if (poolId) {
                return [this.pools.get(poolId)].filter(notNullish)
            }
        }

        if (cacheOnly) {
            return []
        }

        const accounts = await connection.getProgramAccounts(MAINNET_PROGRAM_ID.AmmV4, {
            filters: [
                { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
                ...Object.entries(filterKeys).map(([key, value]) => ({ memcmp: { offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf(key), bytes: value } })),
            ],
        })

        return accounts.map(({ pubkey, account }) => this.handleAccount(pubkey, account, true)).filter(notNullish)
    }

    public async findByOpenOrderId(openOrderId: PublicKeyLike, cacheOnly = false) {
        return this.findBy({ openOrders: openOrderId.toString() }, 'poolByOpenOrder', openOrderId.toString(), cacheOnly).then((items) => items.at(0))
    }

    public async findByBaseVault(baseVault: PublicKeyLike, cacheOnly = false) {
        return this.findBy({ baseVault: baseVault.toString() }, 'poolByBaseVault', baseVault.toString(), cacheOnly).then((items) => items.at(0))
    }

    public async findByQuoteVault(quoteVault: PublicKeyLike, cacheOnly = false) {
        return this.findBy({ quoteVault: quoteVault.toString() }, 'poolByQuoteVault', quoteVault.toString(), cacheOnly).then((items) => items.at(0))
    }

    public async findOrFail(id: PublicKeyLike) {
        const pool = await this.find(id)

        if (!pool) {
            throw new Error(`Pool ${id.toString()} not found`)
        }

        return pool
    }

    public async find(id: PublicKeyLike, cacheOnly = false) {
        const cached = this.pools.get(id.toString())

        if (cached && notNullish(cached.status) && notNullish(cached.baseNeedTakePnl) && notNullish(cached.quoteNeedTakePnl)) {
            return cached as Required<RaydiumAmmV4PoolEntity>
        }

        if (cacheOnly) {
            return
        }

        const pubkey = toPublicKey(id)
        const account = await this.connection.getAccountInfo(pubkey)

        if (!account || account.data.length !== LIQUIDITY_STATE_LAYOUT_V4.span) {
            return
        }

        return this.handleAccount(pubkey, account, true) as Required<RaydiumAmmV4PoolEntity>
    }

    public async init() {
        await this.load().then(() => this.watch())
    }

    public async load() {
        const countTimer = tap(this.logger.createTimer(), () => this.logger.info('Counting pools in database...'))

        const total = tap(await this.repository.count(), (count) => {
            this.logger.stopTimer(countTimer, 'info', `Found ${highlight(format(count))} pools in database`)
        })

        if (total === 0) {
            return
        }

        const timer = tap(this.logger.createTimer(), () => this.logger.info('Importing...'))
        const limit = 1000
        const pages = Math.ceil(total / limit)

        for (let page = 0; page < pages; page++) {
            const pools = await this.repository.find({ take: limit, skip: page * limit })

            for (const pool of pools) {
                this.cache(pool)
            }
        }

        this.logger.stopTimer(timer, 'info', `Imported ${highlight(format(total))} pools from database`)
    }

    public watch() {
        this.logger.info('Start watching raydium amm v4 pools...')

        const subscriptionId = this.connection.onProgramAccountChange(MAINNET_PROGRAM_ID.AmmV4, ({ accountId, accountInfo }) => this.handleAccount(accountId, accountInfo), 'confirmed', [
            { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        ])

        return () => this.connection.removeProgramAccountChangeListener(subscriptionId)
    }

    public add(pool: RaydiumAmmV4PoolEntity) {
        if (!this.isValidPool(pool)) {
            return
        }

        this.logger.debug(message(() => `Found new pool: ${highlight(pool.id.toString())}`))
        this.cache(pool)
        this.emit('new', pool)
        this.save(pool)
    }

    protected handleAccountUpdate(id: string, pool: RaydiumAmmV4PoolEntity, account: AccountInfo<Buffer>) {
        const offset = 8 * 24
        const status = u64().decode(account.data.subarray(0, 8))
        const { baseNeedTakePnl, quoteNeedTakePnl } = MINIMAL_POOL_STATE_LAYOUT_V4.decode(account.data.subarray(offset, offset + MINIMAL_POOL_STATE_LAYOUT_V4.span))

        this.logger.debug(message(() => `Updated pool: ${highlight(id)} (status: ${highlight(status.toString())}, base need take pnl: ${highlight(format(baseNeedTakePnl.toString()))}, quote need take pnl: ${highlight(format(quoteNeedTakePnl.toString()))})`))

        if (notNullish(pool.status) && status !== pool.status && !pool.openTime && !isRaydiumAmmPoolSwapableStatus(pool.status.toNumber()) && isRaydiumAmmPoolSwapableStatus(status.toNumber())) {
            pool.openTime = timestamp()

            this.logger.debug(message(() => `Updated open time for pool: ${highlight(id)} (previous status: ${highlight(pool.status!.toString())}, current: ${highlight(status.toString())})`))
            this.save(pool)
        }

        pool.status = status
        pool.baseNeedTakePnl = baseNeedTakePnl
        pool.quoteNeedTakePnl = quoteNeedTakePnl

        return tap(pool, () => {
            this.pools.set(id, pool)
            this.emit('update', pool)
        })
    }

    protected handleAccount(pubkey: PublicKey, account: AccountInfo<Buffer>, ignoreOnExists = false) {
        if (!RAYDIUM_AMM_POOL_V4_PROGRAM_IDS.some((programId) => programId.equals(account.owner))) {
            return tap(void 0, () => this.logger.warn(`Ignore pool ${highlight(pubkey.toString())} with unknown program id (${highlight(account.owner.toString())})`))
        }

        const id = pubkey.toString()
        const cached = this.pools.get(id)

        if (cached) {
            if (ignoreOnExists && notNullish(cached.status) && notNullish(cached.baseNeedTakePnl) && notNullish(cached.quoteNeedTakePnl)) {
                return cached
            }

            return this.handleAccountUpdate(id, cached, account)
        }

        return tap(formatRaydiumAmmV4PoolAccount(pubkey, account), (pool) => this.add(pool))
    }

    protected cache(pool: RaydiumAmmV4PoolEntity) {
        const id = pool.id.toString()

        this.pools.set(id, pool)
        this.poolByOpenOrder.set(pool.openOrders.toString(), id)
        this.poolByBaseVault.set(pool.baseVault.toString(), id)
        this.poolByQuoteVault.set(pool.quoteVault.toString(), id)
    }

    protected save(pool: RaydiumAmmV4PoolEntity) {
        upsert(this.repository, pool, { conflictPaths: ['id'], conflictType: 'update' }).catch((error) => {
            this.logger.error(`Failed when save raydium amm v4 pool ${highlight(pool.id.toString())} to the database`, error)
        })
    }

    protected isValidPool(pool: RaydiumAmmV4PoolEntity) {
        return !pool.baseMint.equals(this.defaultPubKey) && !pool.quoteMint.equals(this.defaultPubKey) && !pool.lpMint.equals(this.defaultPubKey) && !pool.openOrders.equals(this.defaultPubKey) && !pool.targetOrders.equals(this.defaultPubKey) && !pool.baseVault.equals(this.defaultPubKey) && !pool.quoteVault.equals(this.defaultPubKey) && !pool.marketId.equals(this.defaultPubKey) && pool.baseDecimals > 0 && pool.quoteDecimals > 0
    }
}
