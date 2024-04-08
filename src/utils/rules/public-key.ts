import { validateAndParsePublicKey } from '@raydium-io/raydium-sdk'
import { z } from 'zod'
import { isPublicKey } from '../public-key'

export const publicKey = z.string().refine((value) => isPublicKey(value), 'Not a valid public key').transform((val) => validateAndParsePublicKey(val))
