import type { RpcMethod } from '../../common/rpc'

export const createGetBalanceHandler = (): RpcMethod => async (_, { account }, wallet) => {
    return account.balance.getBalance(wallet.address)
}
