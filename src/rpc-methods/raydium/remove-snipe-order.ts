import { JsonRpcError } from '@kdt310722/rpc'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'

export function createRemoveSnipeOrderHandler(): RpcMethod {
    const schema = z.tuple([z.string()])

    return async (params, { account, sniper }, wallet) => {
        const _wallet = account.get(wallet.id)

        if (!_wallet) {
            throw new JsonRpcError(-32_401, 'Unauthenticated')
        }

        return Promise.resolve().then(() => sniper.remove(_wallet, schema.parse(params)[0]))
    }
}
