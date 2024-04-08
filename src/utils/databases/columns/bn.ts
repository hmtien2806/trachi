import BN from 'bn.js'
import { Column, type ColumnOptions } from 'typeorm'

export const BigIntColumn = (options: ColumnOptions = {}) => Column({
    ...options,
    type: 'varchar',
    transformer: {
        from: (value?: string) => (value ? new BN(value) : undefined),
        to: (value?: BN) => value?.toString(),
    },
})
