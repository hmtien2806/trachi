import type { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import type { Market } from '../../entities/market'
import type { RaydiumAmmV4PoolEntity } from '../../modules/raydium/v4/pool'

export const formatRaydiumAmmV4PoolKeys = (pool: RaydiumAmmV4PoolEntity, market: Market, lookupTableAccount?: PublicKey): LiquidityPoolKeysV4 => ({
    ...pool,
    version: 4,
    marketVersion: 3,
    programId: pool.programId,
    marketProgramId: market.programId,
    marketAuthority: market.authority,
    marketBaseVault: market.baseVault,
    marketQuoteVault: market.quoteVault,
    marketBids: market.bids,
    marketAsks: market.asks,
    marketEventQueue: market.eventQueue,
    lookupTableAccount: lookupTableAccount ?? PublicKey.default,
})
