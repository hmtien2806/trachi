import { withRetry } from '@kdt310722/utils/promise'
import { TxVersion } from '@raydium-io/raydium-sdk'
import { Connection, type VersionedTransaction } from '@solana/web3.js'
import { config } from '../../config/config'
import { createTransaction } from '../../utils/transactions/create-transaction'
import { type BuildTransactionParams, Sender } from './sender'

export class LiteRpc extends Sender {
    public readonly features = { name: 'LiteRPC', tip: false, antiMev: false }

    protected readonly connection: Connection
    protected readonly retries: number

    public constructor() {
        super()

        this.connection = new Connection(config.liteRpc.url, { commitment: 'confirmed', disableRetryOnRateLimit: true })
        this.retries = config.liteRpc.retries
    }

    public buildTransaction(params: BuildTransactionParams) {
        return createTransaction({ version: TxVersion.LEGACY, ...params })
    }

    public async sendTransaction(transaction: VersionedTransaction) {
        return withRetry(async () => this.connection.sendTransaction(transaction, { skipPreflight: true }), this.retries)
    }
}
