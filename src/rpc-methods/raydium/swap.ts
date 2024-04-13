import { JsonRpcError } from '@kdt310722/rpc'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'
import { SUPPORTED_SENDERS } from '../../modules/sender/manager'
import { poolKeysV4 } from '../../utils/rules/pool-keys-v4'
import { publicKey } from '../../utils/rules/public-key'

export function createSwapHandler(): RpcMethod {
    const schema = z.object({
        useWsol: z.boolean().default(false),
        poolKeys: poolKeysV4,
        outputToken: publicKey,
        amountIn: z.union([z.string(), z.number()]),
        minimumAmountOut: z.union([z.string(), z.number()]),
        priorityFee: z.union([z.string(), z.number()]),
        tip: z.union([z.string(), z.number()]),
        antiMev: z.boolean().default(false),
        sender: z.enum([...SUPPORTED_SENDERS, 'combined']).default('bloXRoute'),
    })

    return async (params, { swap, account, senderManager }, wallet) => {
        const swapParams = schema.parse(params)
        const _wallet = account.get(wallet.id)

        if (!_wallet) {
            throw new JsonRpcError(-32_401, 'Unauthenticated')
        }

        return swap.execute({ ...swapParams, poolKeys: swapParams.poolKeys, wallet: _wallet, sender: senderManager.get(swapParams.sender) }).catch((error) => {
            throw new JsonRpcError(-32_000, error.message)
        })
    }
}
