import { SPL_ACCOUNT_LAYOUT, TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import type { Connection, KeyedAccountInfo } from '@solana/web3.js'
import type { PublicKeyLike } from '../../types/entities'
import { toPublicKey } from '../public-key'

export function watchTokenAccount(connection: Connection, owner: PublicKeyLike, onAccount: (account: KeyedAccountInfo) => void) {
    const subscriptionId = connection.onProgramAccountChange(TOKEN_PROGRAM_ID, onAccount, undefined, [
        { dataSize: SPL_ACCOUNT_LAYOUT.span },
        { memcmp: { offset: SPL_ACCOUNT_LAYOUT.offsetOf('owner'), bytes: toPublicKey(owner).toBase58() } },
    ])

    return async () => connection.removeProgramAccountChangeListener(subscriptionId)
}
