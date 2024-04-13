import { highlight } from '@kdt310722/logger'
import { tap } from '@kdt310722/utils/function'
import { createDeferred, poll } from '@kdt310722/utils/promise'
import { TxVersion } from '@raydium-io/raydium-sdk'
import { Connection, PublicKey, type VersionedTransaction } from '@solana/web3.js'
import { config } from '../../config/config'
import { ZERO } from '../../constants'
import { createTransaction } from '../../utils/transactions/create-transaction'
import { type BuildTransactionParams, Sender } from './sender'

export class Jito extends Sender {
    public readonly features = { name: 'Jito', tip: true, antiMev: false }

    protected readonly connections: Connection[]
    protected readonly tipAccount: PublicKey

    public constructor() {
        super()

        this.tipAccount = new PublicKey(config.jito.tipAccount)
        this.connections = config.jito.blockEngineUrls.map((i) => new Connection(new URL('/api/v1/transactions', i).href, { commitment: 'confirmed', disableRetryOnRateLimit: true }))
    }

    public buildTransaction(params: BuildTransactionParams) {
        const { payer, signers, recentBlockhash, tip = ZERO, instructions } = params

        if (tip.gt(ZERO)) {
            instructions.push(this.createTipInstruction(payer, this.tipAccount, tip))
        }

        return createTransaction({ version: TxVersion.LEGACY, payer, signers, recentBlockhash, instructions })
    }

    public async sendTransaction(transaction: VersionedTransaction) {
        const execute = async (waitAllComplete = false) => {
            const signature = createDeferred<string>()
            const requests: Array<Promise<void>> = []

            for (const connection of this.connections) {
                this.logger.debug(`Sending transaction to ${highlight(connection.rpcEndpoint)}...`)

                const request = connection.sendTransaction(transaction, { skipPreflight: true }).then(
                    (tx) => {
                        if (!signature.isSettled) {
                            signature.resolve(tx)
                        }

                        signature.then((sign) => {
                            if (sign !== tx) {
                                this.logger.warn(`${highlight(connection.rpcEndpoint)} returned a different signature: ${highlight(tx)} !== ${highlight(sign)}`)
                            }
                        })
                    },
                    (error) => {
                        this.logger.error(`Unable to send transaction to ${highlight(connection.rpcEndpoint)}`, error)
                    },
                )

                requests.push(request)
            }

            const all = Promise.allSettled(requests).then(() => {
                this.logger.debug('Transaction sent to all connections')

                if (!signature.isSettled) {
                    signature.reject(new Error('All connections failed to send transaction'))
                }
            })

            if (waitAllComplete) {
                await all
            }

            return signature
        }

        return tap(await execute(), (signature) => {
            const stop = poll(async () => execute(true).catch((error) => tap(this.logger.error(error), () => this.emit('confirm', signature))), 500)
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
