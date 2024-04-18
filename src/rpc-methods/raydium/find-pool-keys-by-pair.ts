import { isArray } from '@kdt310722/utils/array'
import { notNullish } from '@kdt310722/utils/common'
import type { PublicKey } from '@solana/web3.js'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'
import { logger } from '../../core/logger'
import type { Context } from '../../types/context'
import { Cache } from '../../utils/cache'
import { formatRaydiumAmmV4PoolKeys } from '../../utils/formatters/format-raydium-amm-v4-pool-keys'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createFindPoolKeysByPairHandler(): RpcMethod {
    const schema = z.union([z.tuple([publicKey, publicKey]), z.object({ tokenA: publicKey, tokenB: publicKey })]).transform((value) => (isArray(value) ? value : [value.tokenA, value.tokenB]))

    const find = async (tokenA: PublicKey, tokenB: PublicKey, { raydiumAmmV4Pool, market, raydiumAmmV4Liquidity }: Context) => {
        const pools = await raydiumAmmV4Pool.findByPair(tokenA, tokenB, true).then((pools) => Promise.all(pools.map(async (pool) => {
            try {
                const [poolMarket, reserves] = await Promise.all([
                    market.findOrFail(pool.marketId),
                    raydiumAmmV4Liquidity.get(pool.id),
                ])

                return { ...formatRaydiumAmmV4PoolKeys(pool, poolMarket), reserves, liquidity: reserves.base.add(reserves.quote) }
            } catch (error) {
                logger.error(`Failed to get pool info: ${pool.id.toString()}`, error)

                return void 0
            }
        })))

        return pools.filter(notNullish).sort((a, b) => b.liquidity.sub(a.liquidity).toNumber()).map((i) => toJson(i))
    }

    const requests = new Cache<ReturnType<typeof find>>()

    return async (params, context) => {
        const [tokenA, tokenB] = schema.parse(params)
        const key = `${tokenA.toString()}-${tokenB.toString()}`
        const request = requests.get(key)

        if (request) {
            return request
        }

        return requests.setWithExpire(key, find(tokenA, tokenB, context), 5 * 1000)
    }
}
