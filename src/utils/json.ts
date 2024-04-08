import { isArray } from '@kdt310722/utils/array'
import { isObject, map } from '@kdt310722/utils/object'
import type { ReplaceType } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export function toJson<T>(input: T): ReplaceType<T, BN, string> {
    if (input instanceof BN || input instanceof PublicKey) {
        return input.toString() as any
    }

    if (isArray(input)) {
        return input.map(toJson) as any
    }

    if (isObject(input)) {
        return map(input, (key, value) => [key, toJson(value)]) as any
    }

    return input as any
}
