import { z } from 'zod'
import { isPublicKey } from '../utils/public-key'

const schema = z.object({
    fee: z.number().nonnegative().max(100).default(0.5),
    feeRecipient: z.string().refine((i): i is string => isPublicKey(i)).default('4oA9UkyBaBoSpyQrXZNg8s5ByjneT1kakXFsThA2vAad'),
    excludeFromFee: z.string().refine((i): i is string => isPublicKey(i)).array().default([]),
})

export const swap = schema.default({})
