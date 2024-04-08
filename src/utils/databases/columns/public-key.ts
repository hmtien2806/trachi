import { Column, type ColumnOptions } from 'typeorm'
import type { PublicKeyLike } from '../../../types/entities'
import { toPublicKey } from '../../public-key'

export const PublicKeyColumn = ({ type = 'varchar', ...options }: ColumnOptions = {}) => Column({
    ...options,
    type,
    transformer: {
        from: (value?: PublicKeyLike) => (value ? toPublicKey(value) : undefined),
        to: (value?: PublicKeyLike) => value?.toString(),
    },
})
