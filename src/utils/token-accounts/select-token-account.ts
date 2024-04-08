import { Spl, type TokenAccount } from '@raydium-io/raydium-sdk'
import type { PublicKey } from '@solana/web3.js'

export interface SelectTokenAccountParams {
    tokenAccounts: TokenAccount[]
    programId: PublicKey
    mint: PublicKey
    owner: PublicKey
    associatedOnly?: boolean
}

export function selectTokenAccount(params: SelectTokenAccountParams) {
    const { programId, mint, owner, associatedOnly = true } = params
    const tokenAccounts = params.tokenAccounts.filter((i) => i.accountInfo.mint.equals(mint)).sort((a, b) => (a.accountInfo.amount.lt(b.accountInfo.amount) ? 1 : -1))

    let ata: PublicKey | undefined

    for (const tokenAccount of tokenAccounts) {
        if (associatedOnly) {
            if (!ata) {
                ata = Spl.getAssociatedTokenAccount({ mint, owner, programId })
            }

            if (ata.equals(tokenAccount.pubkey)) {
                return tokenAccount
            }
        } else {
            return tokenAccount
        }
    }

    return void 0
}
