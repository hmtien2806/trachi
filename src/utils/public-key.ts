import { tryCatch } from '@kdt310722/utils/function'
import { validateAndParsePublicKey } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import type { PublicKeyLike } from '../types/entities'

export function isPublicKey(value: unknown): value is PublicKeyLike {
    return tryCatch(() => (toPublicKey(value as any) instanceof PublicKey), false)
}

export function toPublicKey(value: PublicKeyLike) {
    return validateAndParsePublicKey(value)
}
