import { TransactionExpiredBlockheightExceededError, TransactionExpiredNonceInvalidError, TransactionExpiredTimeoutError } from '@solana/web3.js'
import { TransactionConfirmFailed } from '../../errors/transaction-confirm-failed'

export function handleTransactionError(error: unknown) {
    if (error instanceof TransactionExpiredTimeoutError) {
        return 'Transaction expired: timeout'
    }

    if (error instanceof TransactionExpiredBlockheightExceededError) {
        return 'Transaction expired: blockheight exceeded'
    }

    if (error instanceof TransactionExpiredNonceInvalidError) {
        return 'Transaction expired: the nonce is no longer valid'
    }

    if (error instanceof TransactionConfirmFailed) {
        return `Transaction failed: ${JSON.stringify(error.data)}`
    }

    return 'Transaction failed'
}
