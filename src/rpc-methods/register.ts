import { JsonRpcError } from '@kdt310722/rpc'
import { tryCatch } from '@kdt310722/utils/function'
import { Keypair } from '@solana/web3.js'
import bcrypt from 'bcrypt'
import bs58 from 'bs58'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { RpcMethod } from '../common/rpc'
import { config } from '../config/config'
import { datasource } from '../core/database'
import { Wallet } from '../entities/wallet'

export function parsePrivateKey(privateKey: string) {
    return tryCatch(() => Keypair.fromSecretKey(bs58.decode(privateKey)), null)
}

const repository = datasource.getRepository(Wallet)

export function createRegisterHandler(): RpcMethod {
    const schema = z.object({
        privateKey: z.string(),
        password: z.string().min(6).max(256),
        token: z.string().optional(),
    })

    return async (params, { account }) => {
        const { privateKey, password, token } = schema.parse(params)

        if (!config.auth.register.enabled && token !== config.auth.register.token) {
            throw new JsonRpcError(-32_000, 'Registration is disabled')
        }

        const keypair = parsePrivateKey(privateKey)

        if (!keypair) {
            throw new JsonRpcError(-32_602, 'Invalid private key')
        }

        if (await repository.exists({ where: { address: keypair.publicKey } })) {
            throw new JsonRpcError(-32_602, 'Wallet already exists')
        }

        const encryptedPassword = bcrypt.hashSync(password, `$2a$10$${privateKey}`)
        const wallet = repository.create({ address: keypair.publicKey, isActive: true, password: encryptedPassword, privateKey, role: 0 })

        await account.add(wallet).then(async () => {
            await repository.save(wallet)
        })

        return { address: wallet.address, token: jwt.sign({ address: wallet.address }, config.auth.accessToken.secret, { expiresIn: config.auth.accessToken.life }) }
    }
}
