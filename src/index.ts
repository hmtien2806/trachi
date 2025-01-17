import 'reflect-metadata'
import './core/database'
import { highlight } from '@kdt310722/logger'
import { connection } from './common/connection'
import { createRpcServer } from './common/rpc'
import { logger } from './core/logger'
import { Account } from './modules/account/account'
import { Common } from './modules/common'
import { Market } from './modules/market'
import { OpenOrders } from './modules/open-orders'
import { RaydiumSwap } from './modules/raydium/raydium-swap'
import { RaydiumSniper, serializeSnipeItem } from './modules/raydium/sniper'
import { RaydiumAmmV4Liquidity } from './modules/raydium/v4/liquidity'
import { RaydiumAmmV4Pool } from './modules/raydium/v4/pool'
import { RaydiumAmmV4Vault } from './modules/raydium/v4/vault'
import { SenderManager } from './modules/sender/manager'
import { Token } from './modules/token'
import { createGetBalanceHandler } from './rpc-methods/accounts/get-balance'
import { createGetTokenAccountsHandler } from './rpc-methods/accounts/get-token-accounts'
import { createLoginHandler } from './rpc-methods/login'
import { createAddSnipeOrderHandler } from './rpc-methods/raydium/add-snipe-order'
import { createFindPoolKeysByPairHandler } from './rpc-methods/raydium/find-pool-keys-by-pair'
import { createGetPoolKeysHandler } from './rpc-methods/raydium/get-pool-keys'
import { createGetReservesHandler } from './rpc-methods/raydium/get-reserves'
import { createGetSnipeOrdersHandler } from './rpc-methods/raydium/get-snipe-orders'
import { createGetWsolPriceHandler } from './rpc-methods/raydium/get-wsol-price'
import { createRemoveSnipeOrderHandler } from './rpc-methods/raydium/remove-snipe-order'
import { createSwapHandler } from './rpc-methods/raydium/swap'
import { createRegisterHandler } from './rpc-methods/register'
import { createGetAvailableSendersHandler } from './rpc-methods/sender'
import { createGetTokenHandler } from './rpc-methods/tokens/get-token'
import { createGetTokensHandler } from './rpc-methods/tokens/get-tokens'
import type { Context } from './types/context'
import { isValidName } from './utils/events'
import { toJson } from './utils/json'
import { isPublicKey } from './utils/public-key'
import { handleTransactionError } from './utils/transactions/handle-transaction-error'

const common = new Common(connection)
const account = new Account(connection)
const market = new Market(connection)
const openOrders = new OpenOrders(connection)
const raydiumAmmV4Pool = new RaydiumAmmV4Pool(connection, market)
const raydiumAmmV4Vault = new RaydiumAmmV4Vault(connection)
const raydiumAmmV4Liquidity = new RaydiumAmmV4Liquidity({ pool: raydiumAmmV4Pool, openOrders, vault: raydiumAmmV4Vault }, connection)
const swap = new RaydiumSwap(connection, common)
const senderManager = new SenderManager()
const token = new Token()
const sniper = new RaydiumSniper(raydiumAmmV4Pool, raydiumAmmV4Liquidity, swap, market)

const init = async (): Promise<Context> => {
    await market.init()
    await raydiumAmmV4Pool.init()
    await openOrders.init()
    await raydiumAmmV4Vault.init()
    await account.init()
    await common.init()

    return { common, token, account, market, openOrders, raydiumAmmV4Pool, raydiumAmmV4Vault, raydiumAmmV4Liquidity, swap, senderManager, sniper }
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
    server.addRpcMethod('raydium_swap', createSwapHandler())
    server.addRpcMethod('raydium_getPoolKeys', createGetPoolKeysHandler())
    server.addRpcMethod('raydium_getReserves', createGetReservesHandler())
    server.addRpcMethod('raydium_findPoolKeysByPair', createFindPoolKeysByPairHandler())
    server.addRpcMethod('raydium_getWsolPrice', createGetWsolPriceHandler())
    server.addRpcMethod('raydium_getSnipeOrders', createGetSnipeOrdersHandler())
    server.addRpcMethod('raydium_addSnipeOrder', createAddSnipeOrderHandler())
    server.addRpcMethod('raydium_removeSnipeOrder', createRemoveSnipeOrderHandler())

    context.account.balance.on('update', (account, balance) => {
        server.emit(`balance:${account.toString()}`, balance)
    })

    context.account.tokenAccount.on('update', (account) => {
        server.emit(`tokenAccounts:${account.owner.toString()}`, { type: 'update', account: toJson(account.format()) })
    })

    context.account.tokenAccount.on('remove', (account) => {
        server.emit(`tokenAccounts:${account.owner.toString()}`, { type: 'remove', account: toJson(account.format()) })
    })

    context.raydiumAmmV4Liquidity.on('update', (pool, reserves) => {
        server.emit(`reserves:${pool.id.toString()}`, toJson(reserves))
    })

    context.swap.on('sent', (payer, signature) => {
        server.emit(`transactions:${payer.toString()}`, { status: 'sent', signature, message: 'Transaction sent' })
    })

    context.swap.on('confirmed', (payer, signature) => {
        server.emit(`transactions:${payer.toString()}`, { status: 'confirmed', signature, message: 'Transaction confirmed' })
    })

    context.swap.on('failed', (payer, signature, error) => {
        server.emit(`transactions:${payer.toString()}`, { status: 'failed', signature, message: handleTransactionError(error) })
    })

    context.raydiumAmmV4Pool.on('new', async (pool) => {
        try {
            const poolKeys = await context.raydiumAmmV4Pool.getPoolKeys(pool)

            server.emit('newPool', toJson(poolKeys))
            sniper.handleNewPool(poolKeys).catch((error) => logger.error(`Failed to snipe pool: ${highlight(poolKeys.id.toString())}`, error))
        } catch (error) {
            logger.error(`Failed to get pool keys: ${highlight(pool.id.toString())}`, error)
        }
    })

    context.raydiumAmmV4Liquidity.on('wsolPrice', (price) => {
        server.emit('wsolPrice', price.toFixed())
    })

    context.sniper.on('new', (key, item) => {
        server.emit(`snipe-orders:${item.wallet.address.toString()}`, { type: 'new', order: toJson(serializeSnipeItem({ key, ...item })) })
    })

    context.sniper.on('remove', (key, item) => {
        server.emit(`snipe-orders:${item.wallet.address.toString()}`, { type: 'remove', order: toJson(serializeSnipeItem({ key, ...item })) })
    })

    server.addEvent('newPool')
    server.addEvent('wsolPrice')
    server.addEvent((name, { wallet }) => isValidName(name, 'balance', (i) => i === wallet.address.toString()))
    server.addEvent((name, { wallet }) => isValidName(name, 'tokenAccounts', (i) => i === wallet.address.toString()))
    server.addEvent((name, { wallet }) => isValidName(name, 'transactions', (i) => i === wallet.address.toString()))
    server.addEvent((name, { wallet }) => isValidName(name, 'snipe-orders', (i) => i === wallet.address.toString()))
    server.addEvent((name) => isValidName(name, 'reserves', (i) => isPublicKey(i)))

    await server.start()
})
