import 'reflect-metadata'
import './core/database'
import { connection } from './common/connection'
import { createRpcServer } from './common/rpc'
import { Account } from './modules/account/account'
import { Common } from './modules/common'
import { Market } from './modules/market'
import { OpenOrders } from './modules/open-orders'
import { RaydiumAmmV4Liquidity } from './modules/raydium/v4/liquidity'
import { RaydiumAmmV4Pool } from './modules/raydium/v4/pool'
import { RaydiumAmmV4Vault } from './modules/raydium/v4/vault'
import { SenderManager } from './modules/sender/manager'
import { Swap } from './modules/swap'
import { Token } from './modules/token'
import { createGetBalanceHandler } from './rpc-methods/accounts/get-balance'
import { createGetTokenAccountsHandler } from './rpc-methods/accounts/get-token-accounts'
import { createSwapHandler } from './rpc-methods/accounts/swap'
import { createLoginHandler } from './rpc-methods/login'
import { createFindPoolKeysByPairHandler } from './rpc-methods/raydium/find-pool-keys-by-mint'
import { createGetPoolKeysHandler } from './rpc-methods/raydium/get-pool-keys'
import { createGetReservesHandler } from './rpc-methods/raydium/get-reserves'
import { createRegisterHandler } from './rpc-methods/register'
import { createGetAvailableSendersHandler } from './rpc-methods/sender'
import { createGetTokenHandler } from './rpc-methods/tokens/get-token'
import { createGetTokensHandler } from './rpc-methods/tokens/get-tokens'
import type { Context } from './types/context'
import { isValidName } from './utils/events'
import { toJson } from './utils/json'
import { isPublicKey } from './utils/public-key'
import { handleTransactionError } from './utils/transactions/handle-transaction-error'
import { isValidSignature } from './utils/transactions/is-valid-signature'

const common = new Common(connection)
const account = new Account(connection)
const market = new Market(connection)
const openOrders = new OpenOrders(connection)
const raydiumAmmV4Pool = new RaydiumAmmV4Pool(connection, market)
const raydiumAmmV4Vault = new RaydiumAmmV4Vault(connection)
const raydiumAmmV4Liquidity = new RaydiumAmmV4Liquidity({ pool: raydiumAmmV4Pool, openOrders, vault: raydiumAmmV4Vault }, connection)
const swap = new Swap(connection, common)
const senderManager = new SenderManager()
const token = new Token()

const init = async (): Promise<Context> => {
    await common.init()
    await account.init()
    await market.init()
    await openOrders.init()
    await raydiumAmmV4Pool.init()
    await raydiumAmmV4Vault.init()

    return { common, token, account, market, openOrders, raydiumAmmV4Pool, raydiumAmmV4Vault, raydiumAmmV4Liquidity, swap, senderManager }
}

init().then(async (context) => {
    const server = createRpcServer(context)

    server.addRpcMethod('app_getAvailableSenders', createGetAvailableSendersHandler())
    server.addRpcMethod('app_getToken', createGetTokenHandler())
    server.addRpcMethod('app_getTokens', createGetTokensHandler())
    server.addRpcMethod('auth_login', createLoginHandler())
    server.addRpcMethod('auth_register', createRegisterHandler())
    server.addRpcMethod('account_getBalance', createGetBalanceHandler())
    server.addRpcMethod('account_getTokenAccounts', createGetTokenAccountsHandler())
    server.addRpcMethod('account_swap', createSwapHandler())
    server.addRpcMethod('raydium_getPoolKeys', createGetPoolKeysHandler())
    server.addRpcMethod('raydium_getReserves', createGetReservesHandler())
    server.addRpcMethod('raydium_findPoolKeysByPair', createFindPoolKeysByPairHandler())

    context.account.balance.on('update', (account, balance) => {
        server.emit(`balance:${account.toString()}`, balance)
    })

    context.account.tokenAccount.on('update', (account) => {
        server.emit(`tokenAccounts:${account.owner.toString()}`, { type: 'update', account: toJson(account) })
    })

    context.account.tokenAccount.on('remove', (account) => {
        server.emit(`tokenAccounts:${account.owner.toString()}`, { type: 'remove', account: toJson(account) })
    })

    context.raydiumAmmV4Liquidity.on('update', (pool, reserves) => {
        server.emit(`reserves:${pool.id.toString()}`, toJson(reserves))
    })

    context.swap.on('confirmed', (signature) => {
        server.emit(`transaction:${signature}`, { status: 'confirmed', message: 'Transaction confirmed' })
    })

    context.swap.on('failed', (signature, error) => {
        server.emit(`transaction:${signature}`, { status: 'failed', message: handleTransactionError(error) })
    })

    context.raydiumAmmV4Pool.on('new', (pool) => {
        server.emit('newPool', toJson(pool))
    })

    server.addEvent('newPool')
    server.addEvent((name, { wallet }) => isValidName(name, 'balance', (i) => i === wallet.address.toString()))
    server.addEvent((name, { wallet }) => isValidName(name, 'tokenAccounts', (i) => i === wallet.address.toString()))
    server.addEvent((name) => isValidName(name, 'reserves', (i) => isPublicKey(i)))
    server.addEvent((name) => isValidName(name, 'transaction', (i) => isValidSignature(i)))

    await server.start()
})
