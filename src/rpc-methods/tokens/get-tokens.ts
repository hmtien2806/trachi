import type { RpcMethod } from '../../common/rpc'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createGetTokensHandler(): RpcMethod {
    const schema = publicKey.array().min(0).max(50)

    return async (params, { token }) => {
        const tokens = schema.parse(params)

        if (tokens.length === 0) {
            return []
        }

        return token.findMultiple(tokens).then((i) => toJson(i))
    }
}
