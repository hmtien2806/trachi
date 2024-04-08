import type { Logger } from '@kdt310722/logger'
import { notNullish } from '@kdt310722/utils/common'
import { tap, tryCatch } from '@kdt310722/utils/function'
import { findMetadataPda, getMetadataAccountDataSerializer } from '@metaplex-foundation/mpl-token-metadata'
import { type Umi, publicKey } from '@metaplex-foundation/umi'
import { SPL_MINT_LAYOUT } from '@raydium-io/raydium-sdk'
import { type Connection, PublicKey } from '@solana/web3.js'
import { In, type Repository } from 'typeorm'
import { connection, umi } from '../common/connection'
import { datasource } from '../core/database'
import { createChildLogger } from '../core/logger'
import { Token as TokenEntity } from '../entities/token'
import { TokenMetadata } from '../entities/token-metadata'
import type { PublicKeyLike } from '../types/entities'
import { upsert } from '../utils/databases/upsert'

export class Token {
    protected readonly connection: Connection
    protected readonly umi: Umi
    protected readonly repository: Repository<TokenEntity>
    protected readonly metadataRepository: Repository<TokenMetadata>
    protected readonly logger: Logger

    public constructor() {
        this.connection = connection
        this.umi = umi
        this.repository = datasource.getRepository(TokenEntity)
        this.metadataRepository = datasource.getRepository(TokenMetadata)
        this.logger = createChildLogger('app:modules:token')
    }

    public async find(mint: PublicKeyLike) {
        return this.findMultiple([mint]).then((tokens) => tokens.at(0))
    }

    public async findOrFail(mint: PublicKeyLike) {
        const token = await this.find(mint)

        if (!token) {
            throw new Error(`Token not found: ${mint.toString()}`)
        }

        return token
    }

    public async findMultiple(mints: PublicKeyLike[]) {
        const tokens = await this.repository.find({ where: { mint: In(mints) }, relations: { metadata: true } })

        if (tokens.length === mints.length && tokens.every((i) => notNullish(i.metadata))) {
            return tokens
        }

        const pubKeys = mints.map((mint) => new PublicKey(mint))
        const metadatas = pubKeys.map((mint) => tryCatch(() => new PublicKey(findMetadataPda(this.umi, { mint: publicKey(mint) })[0]), null)).filter(notNullish)

        if (metadatas.length !== pubKeys.length) {
            return []
        }

        const accounts = await this.connection.getMultipleAccountsInfo([...metadatas, ...pubKeys])
        const metadataAccounts = accounts.splice(0, metadatas.length).map((account, i) => (account ? this.metadataRepository.create({ id: metadatas[i], ...getMetadataAccountDataSerializer().deserialize(account.data)[0] }) : undefined))
        const tokenAccounts = accounts.map((account, i) => (account ? this.repository.create({ mint: pubKeys[i], metadata: metadataAccounts[i], ...SPL_MINT_LAYOUT.decode(account.data) }) : undefined))

        return tap(tokenAccounts, () => this.save(tokenAccounts, metadataAccounts).catch((error) => {
            this.logger.error('Failed to save tokens', error)
        }))
    }

    protected async save(tokens: Array<TokenEntity | undefined>, metadatas: Array<TokenMetadata | undefined>) {
        await upsert(this.repository, tokens.filter((i) => i && i.mintAuthorityOption === 0), { conflictPaths: ['mint'] })
        await upsert(this.metadataRepository, metadatas.filter((i) => i && !i.isMutable), { conflictPaths: ['id'] })
    }
}
