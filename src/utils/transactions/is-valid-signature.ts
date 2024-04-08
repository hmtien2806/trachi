import { tryCatch } from '@kdt310722/utils/function'
import bs58 from 'bs58'

export function isValidSignature(signature: string) {
    return tryCatch(() => bs58.decode(signature).length === 64, false)
}
