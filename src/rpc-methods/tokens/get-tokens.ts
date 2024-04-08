import type { RpcMethod } from '../../common/rpc'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createGetTokensHandler(): RpcMethod {
    const schema = publicKey.array().min(1).max(50)

    return async (params, { token }) => (
        token.findMultiple(schema.parse(params)).then((i) => toJson(i))
    )
}
