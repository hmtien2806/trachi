import { isArray } from '@kdt310722/utils/array'
import { tap } from '@kdt310722/utils/function'
import type { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'
import { findPools } from '../../modules/raydium/v4/utils/find-pool'
import { Cache } from '../../utils/cache'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createFindPoolKeysByPairHandler(): RpcMethod {
    const schema = z.union([z.tuple([publicKey, publicKey]), z.object({ tokenA: publicKey, tokenB: publicKey })]).transform((value) => (isArray(value) ? value : [value.tokenA, value.tokenB]))
    const requests = new Cache<LiquidityPoolKeysV4[]>()

    return async (params, { raydiumAmmV4Pool, raydiumAmmV4Liquidity, market }) => {
        const [tokenA, tokenB] = schema.parse(params)
        const key = `${tokenA.toString()}-${tokenB.toString()}`
        const request = requests.get(key)

        if (request) {
            return request
        }

        return tap(await findPools(tokenA, tokenB, raydiumAmmV4Pool, raydiumAmmV4Liquidity, market).then((items) => items.map((i) => toJson(i))), (i) => requests.setWithExpire(key, i, 5 * 1000))
    }
}
