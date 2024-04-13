import { createDeferred } from '@kdt310722/utils/promise'
import type { VersionedTransaction } from '@solana/web3.js'
import type { LiteRpc } from './lite-rpc'
import type { Rpc } from './rpc'
import { type BuildTransactionParams, Sender } from './sender'

export class Combined extends Sender {
    public override readonly features = { name: 'Combined', tip: false, antiMev: false }

    public constructor(protected readonly rpc: Rpc, protected readonly liteRpc: LiteRpc) {
        super()
    }

    public buildTransaction(params: BuildTransactionParams) {
        return this.rpc.buildTransaction(params)
    }

    public async sendTransaction(transaction: VersionedTransaction) {
        const signature = createDeferred<string>()

        const rpc = this.rpc.sendTransaction(transaction).then((i) => signature.resolve(i)).catch((error) => error)
        const liteRpc = this.liteRpc.sendTransaction(transaction).then((i) => signature.resolve(i)).catch((error) => error)

        Promise.allSettled([rpc, liteRpc]).then(async () => {
            if (!signature.isSettled) {
                signature.reject(new AggregateError(await Promise.all([rpc, liteRpc]), 'All senders failed'))
            }
        })

        return signature
    }
}
