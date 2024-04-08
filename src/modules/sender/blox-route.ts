import { HttpProvider } from '@bloxroute/solana-trader-client-ts'
import { TxVersion } from '@raydium-io/raydium-sdk'
import { PublicKey, TransactionInstruction, type VersionedTransaction } from '@solana/web3.js'
import { config } from '../../config/config'
import { ZERO } from '../../constants'
import { createTransaction } from '../../utils/transactions/create-transaction'
import { type BuildTransactionParams, Sender } from './sender'

export const BX_MEMO_MARKER_MSG = Buffer.from('Powered by bloXroute Trader Api')
export const TRADER_API_MEMO_PROGRAM = new PublicKey('HQ2UUt18uJqKaQFJhgV9zaTdQxUZjNrsKFgoEDquBkcx')

export class BloXRoute extends Sender {
    public readonly features = { name: 'BloXRoute', tip: true, antiMev: true }

    protected readonly client: HttpProvider
    protected readonly tipAccount: PublicKey

    public constructor() {
        super()

        this.client = new HttpProvider(config.bloXRoute.token, undefined, config.bloXRoute.url)
        this.tipAccount = new PublicKey(config.bloXRoute.tipAccount)
    }

    public buildTransaction(params: BuildTransactionParams) {
        const { payer, signers, recentBlockhash, tip = ZERO, instructions } = params

        instructions.push(new TransactionInstruction({
            keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
            programId: TRADER_API_MEMO_PROGRAM,
            data: BX_MEMO_MARKER_MSG,
        }))

        if (tip.gt(ZERO)) {
            instructions.push(this.createTipInstruction(payer, this.tipAccount, tip))
        }

        return createTransaction({ version: TxVersion.LEGACY, payer, signers, recentBlockhash, instructions })
    }

    public async sendTransaction(transaction: VersionedTransaction, antiMev = false) {
        const { signature } = await this.client.postSubmitV2({
            transaction: { content: Buffer.from(transaction.serialize()).toString('base64'), isCleanup: true },
            skipPreFlight: true,
            frontRunningProtection: antiMev,
        })

        return signature
    }
}
