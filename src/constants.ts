import { MAINNET_PROGRAM_ID, struct, u64 } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const ZERO = new BN(0)

export const ONE = new BN(1)

export const MARKET_V3_PROGRAM_IDS = [MAINNET_PROGRAM_ID.SERUM_MARKET, MAINNET_PROGRAM_ID.OPENBOOK_MARKET]

export const RAYDIUM_AMM_POOL_V4_PROGRAM_IDS = [MAINNET_PROGRAM_ID.AmmV4]

export const MINIMAL_POOL_STATE_LAYOUT_V4 = struct([
    u64('baseNeedTakePnl'),
    u64('quoteNeedTakePnl'),
])

export const MINIMAL_OPEN_ORDERS_LAYOUT_V2 = struct([
    u64('baseTokenTotal'),
    u64('quoteTokenFree'),
    u64('quoteTokenTotal'),
])

export const RAYDIUM_AMM_STATUS = {
    Uninitialized: 0,
    Initialized: 1,
    Disabled: 2,
    WithdrawOnly: 3,
    LiquidityOnly: 4,
    OrderBookOnly: 5,
    SwapOnly: 6,
    WaitingTrade: 7,
}

export const RAYDIUM_AMM_V4_AUTHORITY_PROGRAM_ID = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1')
