import type { TransactionError } from '@solana/web3.js'

export class TransactionConfirmFailed extends Error {
    public constructor(public readonly data: TransactionError, message?: string, options?: ErrorOptions) {
        super(message, options)
    }
}
