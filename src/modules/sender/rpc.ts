import { TxVersion } from '@raydium-io/raydium-sdk'
import type { Connection, VersionedTransaction } from '@solana/web3.js'
import { connection } from '../../common/connection'
import { createTransaction } from '../../utils/transactions/create-transaction'
import { type BuildTransactionParams, Sender } from './sender'

export class Rpc extends Sender {
    public readonly features = { name: 'Default', tip: false, antiMev: false }

    protected readonly connection: Connection

    public constructor() {
        super()

        this.connection = connection
    }

    public buildTransaction(params: BuildTransactionParams) {
        return createTransaction({ version: TxVersion.LEGACY, ...params })
    }

    public async sendTransaction(transaction: VersionedTransaction) {
        return this.connection.sendTransaction(transaction, { skipPreflight: true })
    }
}
