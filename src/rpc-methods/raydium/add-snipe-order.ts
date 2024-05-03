import { JsonRpcError } from '@kdt310722/rpc'
import { Percent } from '@raydium-io/raydium-sdk'
import BN from 'bn.js'
import { z } from 'zod'
import type { RpcMethod } from '../../common/rpc'
import { serializeSnipeItem } from '../../modules/raydium/sniper'
import { SUPPORTED_SENDERS } from '../../modules/sender/manager'
import { toJson } from '../../utils/json'
import { publicKey } from '../../utils/rules/public-key'

export function createAddSnipeOrderHandler(): RpcMethod {
    const schema = z.object({
        pair: z.tuple([publicKey, publicKey]),
        outputToken: publicKey,
        useWsol: z.boolean().default(false),
        amountIn: z.union([z.string(), z.number()]).transform((i) => new BN(i)),
        slippage: z.number().min(0).max(100).transform((i) => new Percent(Number(i.toFixed(2)) * 100, 10_000)),
        sender: z.enum(SUPPORTED_SENDERS).default('rpc'),
        priorityFee: z.union([z.string(), z.number()]).transform((i) => new BN(i)),
        tip: z.union([z.string(), z.number()]).transform((i) => new BN(i)),
        antiMev: z.boolean().default(false),
        delay: z.number().default(0),
    })

    return async (params, { account, sniper, senderManager }, wallet) => {
        const snipeParams = schema.parse(params)
        const _wallet = account.get(wallet.id)

        if (!_wallet) {
            throw new JsonRpcError(-32_401, 'Unauthenticated')
        }

        return Promise.resolve().then(() => toJson(serializeSnipeItem(sniper.add({ ...snipeParams, wallet: _wallet, sender: senderManager.get(snipeParams.sender) }))))
    }
}
