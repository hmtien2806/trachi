import type { Numberish } from '@kdt310722/utils/number'
import type { PublicKeyish } from '@raydium-io/raydium-sdk'
import type BN from 'bn.js'
import type { Decimal } from 'decimal.js'

export type PublicKeyLike = PublicKeyish

export type BigNumberish = Numberish | Decimal | BN
