import type { Logger } from '@kdt310722/logger'
import { Emitter } from '@kdt310722/utils/event'
import { omit } from '@kdt310722/utils/object'
import { sleep } from '@kdt310722/utils/promise'
import { Liquidity, type LiquidityPoolInfo, type LiquidityPoolKeysV4, type Percent, TOKEN_PROGRAM_ID, Token, TokenAmount } from '@raydium-io/raydium-sdk'
import type { PublicKey } from '@solana/web3.js'
import type BN from 'bn.js'
import { createChildLogger } from '../../core/logger'
import type { Wallet } from '../account/common/wallet'
import type { Sender } from '../sender/sender'
import type { RaydiumSwap, SwapParams } from './raydium-swap'
import type { RaydiumAmmV4Liquidity, Reserves } from './v4/liquidity'

export interface RaydiumSniperItem {
    wallet: Wallet
    token: PublicKey
    useWsol: boolean
    amountIn: BN
    slippage: Percent
    sender: Sender
    priorityFee: BN
    tip: BN
    antiMev: boolean
    delay?: number
}

export interface RaydiumSniperAddParams extends Omit<RaydiumSniperItem, 'token'> {
    pair: [PublicKey, PublicKey]
    outputToken: PublicKey
}

export type RaydiumSniperEvents = {
    'new': (key: string, item: RaydiumSniperItem) => void
    'remove': (key: string, item: RaydiumSniperItem) => void
}

export function serializeSnipeItem(item: RaydiumSniperItem & { key?: string }) {
    return { ...omit(item, 'sender'), wallet: item.wallet.address, slippage: item.slippage.toFixed(2) }
}

export class RaydiumSniper extends Emitter<RaydiumSniperEvents, true> {
    protected readonly logger: Logger
    protected readonly items: Record<string, { id: string, items: RaydiumSniperItem[] }>

    public constructor(protected readonly liquidity: RaydiumAmmV4Liquidity, protected readonly swap: RaydiumSwap) {
        super()

        this.logger = createChildLogger('app:modules:raydium:sniper')
        this.items = {}
    }

    public get(wallet: Wallet) {
        return Object.entries(this.items).flatMap(([key, i]) => i.items.filter((j) => j.wallet.address.equals(wallet.address)).map((k) => ({ key, ...k })))
    }

    public add({ pair, outputToken: token, ...params }: RaydiumSniperAddParams) {
        const key = this.getKey(pair)
        const item = { token, ...params }

        if (!this.items[key]) {
            this.items[key] = { id: key, items: [] }
        }

        if (this.items[key].items.some((i) => i.wallet.address.equals(item.wallet.address))) {
            throw new Error('Snipe order for this pair already exists')
        }

        this.items[key].items.push(item)
        this.emit('new', key, item)

        return { key, ...item }
    }

    public remove(wallet: Wallet, key: string) {
        const snipe = this.items[key]

        if (!snipe) {
            return
        }

        const index = snipe.items.findIndex((i) => i.wallet.address.equals(wallet.address))

        if (index === -1) {
            return
        }

        const removed = snipe.items.splice(index, 1)

        if (snipe.items.length === 0) {
            delete this.items[key]
        }

        this.emit('remove', key, removed[0])
    }

    public async handleNewPool(poolKeys: LiquidityPoolKeysV4) {
        const snipe = this.getItem(poolKeys)

        if (!snipe) {
            return
        }

        const { id, items } = snipe
        const reserves = await this.liquidity.get(poolKeys.id)

        const execute = async (item: RaydiumSniperItem) => {
            this.emit('remove', id, item)

            if (item.delay) {
                await sleep(item.delay)
            }

            await this.swap.execute(this.getSwapParams(poolKeys, item, reserves)).catch((error) => {
                this.logger.error(error)
            })
        }

        await Promise.all(items.map(execute)).finally(() => {
            delete this.items[id]
        })
    }

    public getItem(poolKeys: LiquidityPoolKeysV4): { id: string, items: RaydiumSniperItem[] } | undefined {
        const baseMint = poolKeys.baseMint.toString()
        const quoteMint = poolKeys.quoteMint.toString()

        const keyA = `${baseMint}-${quoteMint}`
        const keyB = `${quoteMint}-${baseMint}`

        return this.items[keyA] ?? this.items[keyB]
    }

    public getTokens(poolKeys: LiquidityPoolKeysV4, item: RaydiumSniperItem) {
        const baseToken = new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals)
        const quoteToken = new Token(TOKEN_PROGRAM_ID, poolKeys.quoteMint, poolKeys.quoteDecimals)

        return item.token.equals(poolKeys.baseMint) ? { input: quoteToken, output: baseToken } : { input: baseToken, output: quoteToken }
    }

    public getSwapParams(poolKeys: LiquidityPoolKeysV4, item: RaydiumSniperItem, reserves: Reserves): SwapParams {
        const { wallet, useWsol, slippage, sender, priorityFee, tip, antiMev } = item
        const { input, output } = this.getTokens(poolKeys, item)
        const { base, quote } = reserves

        const amountIn = new TokenAmount(input, item.amountIn)
        const poolInfo = { baseReserve: base, quoteReserve: quote } as LiquidityPoolInfo
        const { amountOut, minAmountOut } = Liquidity.computeAmountOut({ poolKeys, amountIn, slippage, currencyOut: output, poolInfo })

        return { useWsol, wallet, poolKeys, outputToken: output.mint, amountIn: amountIn.raw, amountOut: amountOut.raw, minimumAmountOut: minAmountOut.raw, sender, priorityFee, tip, antiMev }
    }

    protected getKey(pair: [PublicKey, PublicKey]) {
        return pair.map((i) => i.toString()).sort((a, b) => a.localeCompare(b)).join('-')
    }
}
