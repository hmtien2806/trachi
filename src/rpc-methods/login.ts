import { JsonRpcError } from '@kdt310722/rpc'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { RpcMethod } from '../common/rpc'
import { config } from '../config/config'
import { datasource } from '../core/database'
import { Wallet } from '../entities/wallet'
import { isPublicKey } from '../utils/public-key'

export function createLoginHandler(): RpcMethod {
    const schema = z.object({
        address: z.string().refine((val) => isPublicKey(val)),
        password: z.string(),
    })

    const repository = datasource.getRepository(Wallet)

    return async (params) => {
        const { address, password } = schema.parse(params)
        const wallet = await repository.findOne({ where: { address, isActive: true } })

        if (!wallet || !bcrypt.compareSync(password, wallet.password)) {
            throw new JsonRpcError(-32_000, 'Invalid address or password')
        }

        return { address, token: jwt.sign({ address }, config.auth.accessToken.secret, { expiresIn: config.auth.accessToken.life }) }
    }
}
