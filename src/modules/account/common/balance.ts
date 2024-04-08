import { type Logger, highlight } from '@kdt310722/logger'
import { Emitter } from '@kdt310722/utils/event'
import { shorten } from '@kdt310722/utils/string'
import type { Connection, PublicKey } from '@solana/web3.js'
import { createChildLogger } from '../../../core/logger'
import type { PublicKeyLike } from '../../../types/entities'
import { toPublicKey } from '../../../utils/public-key'

export type BalanceEvents = {
    'update': (account: PublicKey, balance: number) => void
}

export class Balance extends Emitter<BalanceEvents> {
    protected readonly connection: Connection
    protected readonly logger: Logger
    protected readonly balances = new Map<string, number>()

    public constructor(connection: Connection) {
        super()

        this.connection = connection
        this.logger = createChildLogger('app:modules:account:balance')
    }

    public async init(account: PublicKeyLike) {
        this.logger.info(`Initializing balance module for account ${highlight(shorten(account.toString(), 4))}...`)
        this.watch(account)

        await this.fetchBalance(account).then((balance) => {
            const id = account.toString()

            if (!this.balances.has(id)) {
                this.balances.set(id, balance)
            }
        })
    }

    public watch(account: PublicKeyLike) {
        const pubkey = toPublicKey(account)
        const id = pubkey.toString()

        const subscriptionId = this.connection.onAccountChange(pubkey, ({ lamports }) => {
            this.balances.set(id, lamports)
            this.emit('update', pubkey, lamports)
        })

        return () => this.connection.removeAccountChangeListener(subscriptionId)
    }

    public async getBalance(account: PublicKeyLike) {
        return this.balances.get(toPublicKey(account).toString()) ?? (await this.fetchBalance(account))
    }

    public async fetchBalance(account: PublicKeyLike) {
        return this.connection.getBalance(toPublicKey(account))
    }
}
