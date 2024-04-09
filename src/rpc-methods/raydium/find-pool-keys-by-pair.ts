import { isArray } from '@kdt310722/utils/array'
import { notNullish } from '@kdt310722/utils/common'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'
import { logger } from '../../core/logger'
import { formatRaydiumAmmV4PoolKeys } from '../../utils/formatters/format-raydium-amm-v4-pool-keys'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createFindPoolKeysByPairHandler(): RpcMethod {
    const schema = z.union([z.tuple([publicKey, publicKey]), z.object({ tokenA: publicKey, tokenB: publicKey })]).transform((value) => (isArray(value) ? value : [value.tokenA, value.tokenB]))

    return async (params, { raydiumAmmV4Pool, market, raydiumAmmV4Liquidity }) => {
        const [tokenA, tokenB] = schema.parse(params)

        const pools = await raydiumAmmV4Pool.findByPair(tokenA, tokenB).then((pools) => Promise.all(pools.map(async (pool) => {
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
}
