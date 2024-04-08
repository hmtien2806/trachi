import { type Logger, highlight, message } from '@kdt310722/logger'
import { notNullish } from '@kdt310722/utils/common'
import { Emitter } from '@kdt310722/utils/event'
import { tap } from '@kdt310722/utils/function'
import { shorten } from '@kdt310722/utils/string'
import { TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import type { AccountInfo, Connection, KeyedAccountInfo } from '@solana/web3.js'
import type { Repository } from 'typeorm'
import { datasource } from '../../../core/database'
import { createChildLogger } from '../../../core/logger'
import { TokenAccount as TokenAccountEntity } from '../../../entities/token-account'
import type { PublicKeyLike } from '../../../types/entities'
import { upsert } from '../../../utils/databases/upsert'
import { formatTokenAccount } from '../../../utils/formatters/format-token-account'
import { getCloseAccounts } from '../../../utils/instructions'
import { toPublicKey } from '../../../utils/public-key'
import { watchTokenAccount } from '../../../utils/token-accounts/watch-token-account'
import { watchAccountTransaction } from '../../../utils/transactions/watch-account-transaction'

export type TokenAccountEvents = {
    'update': (account: TokenAccountEntity) => void
    'remove': (account: TokenAccountEntity) => void
}

export class TokenAccount extends Emitter<TokenAccountEvents> {
    protected readonly repository: Repository<TokenAccountEntity>
    protected readonly logger: Logger
    protected readonly accounts = new Map<string, TokenAccountEntity>()
    protected readonly accountsByOwner = new Map<string, Set<string>>()

    public constructor(protected readonly connection: Connection) {
        super()

        this.logger = createChildLogger('app:modules:account:token-account')
        this.repository = datasource.getRepository(TokenAccountEntity)
    }

    public async init(owner: PublicKeyLike) {
        this.logger.info(`Initializing token account module for owner ${highlight(shorten(owner.toString(), 4))}...`)

        await this.repository.delete({ owner }).then(async () => this.find(owner)).then(() => {
            this.watch(owner)
        })
    }

    public async find(owner: PublicKeyLike) {
        const accounts = this.accountsByOwner.get(owner.toString())

        if (accounts) {
            return [...accounts].map((id) => this.accounts.get(id)?.format()).filter(notNullish)
        }

        const result = await this.connection.getTokenAccountsByOwner(toPublicKey(owner), { programId: TOKEN_PROGRAM_ID }).then(
            (items) => items.value.map((item) => this.handleAccountInfo(item.pubkey, item.account)),
        )

        return result.map((entity) => entity.format())
    }

    public watch(owner: PublicKeyLike) {
        const stops: Array<() => Promise<void>> = []
        const pubkey = toPublicKey(owner)

        stops.push(watchTokenAccount(this.connection, pubkey, this.onAccountUpdate.bind(this)))

        stops.push(watchAccountTransaction(this.connection, pubkey, {
            filter: (logs) => logs.some((log) => log.includes('closeAccount') || log.includes('CloseAccount')),
            onTransaction: (_, transaction) => {
                for (const account of getCloseAccounts(transaction)) {
                    this.onAccountRemove(owner, account)
                }
            },
        }))

        return async () => Promise.all(stops.map((stop) => stop()))
    }

    protected onAccountUpdate({ accountId, accountInfo }: KeyedAccountInfo) {
        this.emit('update', tap(this.handleAccountInfo(accountId, accountInfo), (entity) => {
            this.logger.debug(message(() => `Token account for wallet ${entity.owner.toString()} updated: ${entity.id.toString()}`))
        }))
    }

    protected onAccountRemove(owner: PublicKeyLike, pubkey: PublicKeyLike) {
        this.logger.debug(message(() => `Token account from wallet ${owner.toString()} removed: ${pubkey.toString()}`))

        const id = pubkey.toString()
        const entity = this.accounts.get(id)

        if (entity) {
            this.accounts.delete(id)
            this.accountsByOwner.get(owner.toString())?.delete(id)
            this.emit('remove', entity)

            this.repository.delete({ id }).catch((error) => {
                this.logger.error(`Failed when deleting token account ${id} of owner ${owner.toString()}`, error)
            })
        }
    }

    protected handleAccountInfo(id: PublicKeyLike, accountInfo: AccountInfo<Buffer>) {
        return tap(formatTokenAccount(id, accountInfo), (entity) => {
            const address = id.toString()
            const owner = entity.owner.toString()

            if (!this.accountsByOwner.has(owner)) {
                this.accountsByOwner.set(owner, new Set())
            }

            this.accountsByOwner.get(owner)!.add(address)
            this.accounts.set(address, entity)

            upsert(this.repository, entity, { conflictPaths: ['id'], conflictType: 'update' }).catch((error) => {
                this.logger.error(`Failed when saving token account ${address} of owner ${owner}`, error)
            })
        })
    }
}
