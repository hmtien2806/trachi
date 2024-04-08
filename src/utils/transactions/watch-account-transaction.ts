import { notNullish } from '@kdt310722/utils/common'
import type { Connection, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js'

export interface WatchAccountTransactionOptions {
    onTransaction?: (signature: string, transaction: ParsedTransactionWithMeta) => void
    filter?: (logs: string[]) => boolean
}

export function watchAccountTransaction(connection: Connection, account: PublicKey, options: WatchAccountTransactionOptions = {}) {
    const { onTransaction, filter = () => true } = options

    const subscriptionId = connection.onLogs(account, ({ err, signature, logs }) => {
        if (notNullish(err) || !filter(logs)) {
            return
        }

        connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 }).then((transaction) => {
            if (transaction) {
                onTransaction?.(signature, transaction)
            }
        })
    })

    return async () => connection.removeOnLogsListener(subscriptionId)
}
