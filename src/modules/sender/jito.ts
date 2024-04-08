import { TxVersion } from '@raydium-io/raydium-sdk'
import { Connection, PublicKey, type VersionedTransaction } from '@solana/web3.js'
import { config } from '../../config/config'
import { ZERO } from '../../constants'
import { createTransaction } from '../../utils/transactions/create-transaction'
import { type BuildTransactionParams, Sender } from './sender'

export class Jito extends Sender {
    public readonly features = { name: 'Jito', tip: true, antiMev: false }

    protected readonly connection: Connection
    protected readonly tipAccount: PublicKey

    public constructor() {
        super()

        this.tipAccount = new PublicKey(config.jito.tipAccount)
        this.connection = new Connection(new URL('/api/v1/transactions', config.jito.blockEngineUrl).href, { commitment: 'confirmed', disableRetryOnRateLimit: true })
    }

    public buildTransaction(params: BuildTransactionParams) {
        const { payer, signers, recentBlockhash, tip = ZERO, instructions } = params

        if (tip.gt(ZERO)) {
            instructions.push(this.createTipInstruction(payer, this.tipAccount, tip))
        }

        return createTransaction({ version: TxVersion.LEGACY, payer, signers, recentBlockhash, instructions })
    }

    public async sendTransaction(transaction: VersionedTransaction) {
        return this.connection.sendTransaction(transaction, { skipPreflight: true })
    }
}
