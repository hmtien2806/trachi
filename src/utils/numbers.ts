import { Percent } from '@raydium-io/raydium-sdk'
import BN from 'bn.js'
import type { BigNumberish } from '../types/entities'

export function toBN(value: BigNumberish) {
    return new BN(value.toString())
}

export function getPercentage(value: BigNumberish, percentage: number) {
    const percent = new Percent(Number(percentage.toFixed(2)) * 100, 10_000)
    const amount = toBN(value)

    return percent.mul(amount).quotient
}
