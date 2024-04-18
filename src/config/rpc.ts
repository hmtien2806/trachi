import { isHttpUrl, isWebSocketUrl } from '@kdt310722/utils/string'
import { z } from 'zod'

export const transaction = z.object({
    pollingInterval: z.number().positive().default(100),
    retries: z.number().positive().default(10),
})

export const rpc = z.object({
    http: z.string().url().refine((val) => isHttpUrl(val)),
    websocket: z.string().url().refine((val) => isWebSocketUrl(val)),
    transaction: transaction.default({}),
})
