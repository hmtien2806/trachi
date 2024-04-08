import type { LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'
import type { PublicKey } from '@solana/web3.js'
import type { PublicKeyLike } from '../../types/entities'
import { toPublicKey } from '../public-key'

export function getSwapTokens(poolKeys: LiquidityPoolKeysV4, output: PublicKeyLike) {
    const outputToken = toPublicKey(output)

    let tokenIn: PublicKey
    let tokenOut: PublicKey

    if (poolKeys.baseMint.equals(outputToken)) {
        tokenIn = poolKeys.quoteMint
        tokenOut = poolKeys.baseMint
    } else {
        tokenIn = poolKeys.baseMint
        tokenOut = poolKeys.quoteMint
    }

    return { tokenIn, tokenOut }
}
