import type { Logger } from '@kdt310722/logger'
import { Emitter } from '@kdt310722/utils/event'
import { tap } from '@kdt310722/utils/function'
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk'
import type { Connection, PublicKey } from '@solana/web3.js'
import type BN from 'bn.js'
import { RAYDIUM_AMM_V4_AUTHORITY_PROGRAM_ID } from '../../../constants'
import { createChildLogger } from '../../../core/logger'
import type { PublicKeyLike } from '../../../types/entities'
import { toPublicKey } from '../../../utils/public-key'
import { watchTokenAccount } from '../../../utils/token-accounts/watch-token-account'

export type RaydiumAmmV4VaultEvents = {
    update: (account: PublicKey, amount: BN) => void
}

export class RaydiumAmmV4Vault extends Emitter<RaydiumAmmV4VaultEvents> {
    protected readonly logger: Logger
    protected readonly vaults: Map<string, BN>

    public constructor(protected readonly connection: Connection) {
        super()

        this.logger = createChildLogger('app:modules:raydium-amm-v4:vault')
        this.vaults = new Map()
    }

    public async findOrFail(id: PublicKeyLike) {
        const item = await this.find(id)

        if (!item) {
            throw new Error(`Token account not found: ${id.toString()}`)
        }

        return item
    }

    public async find(id: PublicKeyLike, cacheOnly = false) {
        const item = this.vaults.get(id.toString())

        if (item ?? cacheOnly) {
            return item
        }

        const account = await this.connection.getAccountInfo(toPublicKey(id))

        if (!account || account.data.length !== SPL_ACCOUNT_LAYOUT.span) {
            return
        }

        return tap(SPL_ACCOUNT_LAYOUT.decode(account.data).amount, (amount) => {
            const address = id.toString()

            if (!this.vaults.has(address)) {
                this.vaults.set(address, amount)
            }
        })
    }

    public async init() {
        await Promise.resolve().then(() => this.watch())
    }

    public watch() {
        this.logger.info('Start watching vaults accounts...')

        const stop = watchTokenAccount(this.connection, RAYDIUM_AMM_V4_AUTHORITY_PROGRAM_ID, ({ accountId: id, accountInfo }) => {
            const account = SPL_ACCOUNT_LAYOUT.decode(accountInfo.data)

            this.vaults.set(id.toString(), account.amount)
            this.emit('update', id, account.amount)
        })

        return () => stop()
    }
}
