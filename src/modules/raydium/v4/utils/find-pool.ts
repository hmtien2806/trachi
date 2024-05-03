import { notNullish } from '@kdt310722/utils/common'
import type { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'
import type { PublicKey } from '@solana/web3.js'
import { formatRaydiumAmmV4PoolKeys } from '../../../../utils/formatters/format-raydium-amm-v4-pool-keys'
import type { Market } from '../../../market'
import type { RaydiumAmmV4Liquidity } from '../liquidity'
import type { RaydiumAmmV4Pool } from '../pool'

export const findPools = async (tokenA: PublicKey, tokenB: PublicKey, pool: RaydiumAmmV4Pool, liquidity: RaydiumAmmV4Liquidity, market: Market, cacheOnly = true) => {
    const pools = await pool.findByPair(tokenA, tokenB, cacheOnly).then((pools) => Promise.all(pools.map(async (pool) => {
        try {
            const [poolMarket, reserves] = await Promise.all([
                market.findOrFail(pool.marketId),
                liquidity.get(pool.id),
            ])

            return { ...formatRaydiumAmmV4PoolKeys(pool, poolMarket), reserves, liquidity: reserves.base.add(reserves.quote) }
        } catch {
            return void 0
        }
    })))

    return pools.filter(notNullish).sort((a, b) => b.liquidity.sub(a.liquidity).toNumber()) as LiquidityPoolKeysV4[]
}
