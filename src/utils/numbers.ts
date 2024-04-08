import BN from 'bn.js'
import type { BigNumberish } from '../types/entities'

export function toBN(value: BigNumberish) {
    return new BN(value.toString())
}
