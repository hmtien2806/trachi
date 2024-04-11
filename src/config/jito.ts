import { isHttpUrl } from '@kdt310722/utils/string'
import { z } from 'zod'
import { isPublicKey } from '../utils/public-key'

export const jito = z.object({
    blockEngineUrls: z.string().url().refine((val) => isHttpUrl(val)).array().nonempty().default([
        'https://mainnet.block-engine.jito.wtf',
        'https://amsterdam.mainnet.block-engine.jito.wtf',
        'https://frankfurt.mainnet.block-engine.jito.wtf',
        'https://ny.mainnet.block-engine.jito.wtf',
        'https://tokyo.mainnet.block-engine.jito.wtf',
    ]),
    tipAccount: z.string().refine((val) => isPublicKey(val)),
})
