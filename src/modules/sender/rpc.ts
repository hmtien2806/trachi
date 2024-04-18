import { tap } from '@kdt310722/utils/function'
import { poll, withRetry, withTimeout } from '@kdt310722/utils/promise'
import { TxVersion } from '@raydium-io/raydium-sdk'
import type { Connection, VersionedTransaction } from '@solana/web3.js'
import { connection } from '../../common/connection'
import { createTransaction } from '../../utils/transactions/create-transaction'
import { type BuildTransactionParams, Sender } from './sender'

export class Rpc extends Sender {
    public readonly features = { name: 'Default', tip: false, antiMev: false }

    protected readonly connection: Connection
    protected readonly retries: number
    protected readonly pollingInterval: number

    public constructor() {
        super()

        this.connection = connection
        this.retries = 10
        this.pollingInterval = 200
    }

    public buildTransaction(params: BuildTransactionParams) {
        return createTransaction({ version: TxVersion.LEGACY, ...params })
    }

    public async sendTransaction(transaction: VersionedTransaction) {
        const send = async () => await withRetry(async () => withTimeout(this.connection.sendTransaction(transaction, { skipPreflight: true }), 1000, `Timeout when send transaction to RPC`), this.retries)

        return tap(await send(), (signature) => {
            const stop = poll(async () => send().catch((error) => this.logger.error(error)), this.pollingInterval)
            const timer = setTimeout(() => this.emit('confirm', signature), 5 * 1000)

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
