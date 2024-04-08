import { isHttpUrl } from '@kdt310722/utils/string'
import { z } from 'zod'
import { isPublicKey } from '../utils/public-key'

export const jito = z.object({
    blockEngineUrl: z.string().url().refine((val) => isHttpUrl(val)),
    tipAccount: z.string().refine((val) => isPublicKey(val)),
})
