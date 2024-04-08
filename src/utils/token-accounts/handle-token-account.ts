import { Spl, TOKEN_PROGRAM_ID, Token } from '@raydium-io/raydium-sdk'
import type { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import type BN from 'bn.js'
import { makeCreateWsolAccountInstructions } from './make-create-wsol-account-instructions'

export interface HandleTokenAccountParams {
    useWsol?: boolean
    amount: BN
    programId: PublicKey
    mint: PublicKey
    tokenAccount?: PublicKey | null
    owner: PublicKey
    payer?: PublicKey
    rentExemption: number
    frontInstructions: TransactionInstruction[]
    endInstructions: TransactionInstruction[]
    signers: Signer[]
}

export function handleTokenAccount(params: HandleTokenAccountParams) {
    const { useWsol = false, amount, programId, mint, tokenAccount, owner, payer = owner, rentExemption, frontInstructions, endInstructions, signers } = params

    if (!useWsol && Token.WSOL.mint.equals(mint)) {
        const { address: { newAccount }, innerTransaction } = makeCreateWsolAccountInstructions({ amount, payer, owner, rentExemption })

        frontInstructions.push(...innerTransaction.instructions)
        signers.push(...innerTransaction.signers)

        endInstructions.push(Spl.makeCloseAccountInstruction({
            programId: TOKEN_PROGRAM_ID,
            tokenAccount: newAccount,
            owner,
            payer,
            instructionsType: [],
        }))

        return newAccount
    }

    if (!tokenAccount) {
        const ata = Spl.getAssociatedTokenAccount({ mint, owner, programId })

        frontInstructions.push(Spl.makeCreateAssociatedTokenAccountInstruction({
            programId,
            mint,
            associatedAccount: ata,
            owner,
            payer,
            instructionsType: [],
        }))

        return ata
    }

    return tokenAccount
}
