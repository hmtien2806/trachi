import type { Account } from '../modules/account/account'
import type { Common } from '../modules/common'
import type { Market } from '../modules/market'
import type { OpenOrders } from '../modules/open-orders'
import type { RaydiumSwap } from '../modules/raydium/raydium-swap'
import type { RaydiumSniper } from '../modules/raydium/sniper'
import type { RaydiumAmmV4Liquidity } from '../modules/raydium/v4/liquidity'
import type { RaydiumAmmV4Pool } from '../modules/raydium/v4/pool'
import type { RaydiumAmmV4Vault } from '../modules/raydium/v4/vault'
import type { SenderManager } from '../modules/sender/manager'
import type { Token } from '../modules/token'

export interface Context {
    common: Common
    token: Token
    account: Account
    market: Market
    openOrders: OpenOrders
    raydiumAmmV4Pool: RaydiumAmmV4Pool
    raydiumAmmV4Vault: RaydiumAmmV4Vault
    raydiumAmmV4Liquidity: RaydiumAmmV4Liquidity
    swap: RaydiumSwap
    senderManager: SenderManager
    sniper: RaydiumSniper
}
