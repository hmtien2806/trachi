import { isHttpUrl } from '@kdt310722/utils/string'
import { z } from 'zod'

export const liteRpc = z.object({
    url: z.string().url().refine((val) => isHttpUrl(val)),
    retries: z.number().int().positive().default(10),
})
