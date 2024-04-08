import { isArray } from '@kdt310722/utils/array'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createGetPoolKeysHandler(): RpcMethod {
    const schema = z.union([z.tuple([publicKey]), z.object({ id: publicKey })]).transform((value) => (isArray(value) ? value[0] : value.id))

    return async (params, { raydiumAmmV4Pool }) => (
        raydiumAmmV4Pool.getPoolKeys(schema.parse(params)).then((i) => toJson(i))
    )
}
