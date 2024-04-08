import { isArray } from '@kdt310722/utils/array'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createGetTokenHandler(): RpcMethod {
    const schema = z.union([z.tuple([publicKey]), z.object({ mint: publicKey })]).transform((value) => (isArray(value) ? value[0] : value.mint))

    return async (params, { token }) => (
        token.findOrFail(schema.parse(params)).then((i) => toJson(i))
    )
}
