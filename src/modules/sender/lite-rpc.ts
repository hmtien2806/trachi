import { tap } from '@kdt310722/utils/function'
import { poll, withRetry } from '@kdt310722/utils/promise'
import { TxVersion } from '@raydium-io/raydium-sdk'
import { Connection, type VersionedTransaction } from '@solana/web3.js'
import { config } from '../../config/config'
import { createTransaction } from '../../utils/transactions/create-transaction'
import { type BuildTransactionParams, Sender } from './sender'

export class LiteRpc extends Sender {
    public readonly features = { name: 'LiteRPC', tip: false, antiMev: false }

    protected readonly connection: Connection
    protected readonly retries: number
    protected readonly pollingInterval: number

    public constructor() {
        super()

        this.connection = new Connection(config.liteRpc.url, { commitment: 'confirmed', disableRetryOnRateLimit: true })
        this.retries = config.liteRpc.retries
        this.pollingInterval = 100
    }

    public buildTransaction(params: BuildTransactionParams) {
        return createTransaction({ version: TxVersion.LEGACY, ...params })
    }

    public async sendTransaction(transaction: VersionedTransaction) {
        const send = async () => await withRetry(async () => this.connection.sendTransaction(transaction, { skipPreflight: true }), this.retries)

        return tap(await send(), (signature) => {
            const stop = poll(async () => send().catch((error) => this.logger.error(error)), this.pollingInterval)
            const timer = setTimeout(() => this.emit('confirm', signature), 30 * 1000)

            const onConfirm = (tx: string) => {
                if (tx === signature) {
                    clearTimeout(timer)
                    stop()
                    this.off('confirm', onConfirm)
                }
            }

            this.on('confirm', onConfirm)
        })
    }
}
