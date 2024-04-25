import { JsonRpcError } from '@kdt310722/rpc'
import type { RpcMethod } from '../../common/rpc'
import { serializeSnipeItem } from '../../modules/raydium/sniper'
import { toJson } from '../../utils/json'

export const createGetSnipeOrdersHandler = (): RpcMethod => async (_, { account, sniper }, wallet) => {
    const _wallet = account.get(wallet.id)

    if (!_wallet) {
        throw new JsonRpcError(-32_401, 'Unauthenticated')
    }

    return Promise.resolve().then(() => sniper.get(_wallet).map((i) => toJson(serializeSnipeItem(i))))
}
