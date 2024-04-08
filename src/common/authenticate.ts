import { isKeysOf, isObject } from '@kdt310722/utils/object'
import { isString } from '@kdt310722/utils/string'
import jwt from 'jsonwebtoken'
import { config } from '../config/config'
import { datasource } from '../core/database'
import { Wallet } from '../entities/wallet'

const repository = datasource.getRepository(Wallet)

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, config.auth.accessToken.secret)
    } catch {
        return null
    }
}

export async function authenticate(token?: string | null) {
    if (!token) {
        return
    }

    const data = verifyToken(token)

    if (!isObject(data) || !isKeysOf(data, ['address']) || !isString(data.address)) {
        return
    }

    return repository.findOne({ where: { address: data.address, isActive: true } })
}
