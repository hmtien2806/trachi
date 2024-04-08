import type { RpcMethod } from '../../common/rpc'
import { toJson } from '../../utils/json'

export const createGetTokenAccountsHandler = (): RpcMethod => async (_, { account }, wallet) => {
    return account.tokenAccount.find(wallet.address).then((i) => toJson(i))
}
