import { TOKEN_PROGRAM_ID, type TokenAccount } from '@raydium-io/raydium-sdk'
import type { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import type BN from 'bn.js'
import { ZERO } from '../../constants'
import { handleTokenAccount } from '../token-accounts/handle-token-account'
import { selectTokenAccount } from '../token-accounts/select-token-account'

export interface GetTokenAccountParams {
    useWsol?: boolean
    amount: BN
    mint: PublicKey
    rentExemption: number
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    associatedOnly?: boolean
    frontInstructions: TransactionInstruction[]
    endInstructions: TransactionInstruction[]
    signers: Signer[]
}

export function getTokenAccount(params: GetTokenAccountParams) {
    const { useWsol, amount, mint, rentExemption, tokenAccounts, owner, associatedOnly, frontInstructions, endInstructions, signers } = params
    const tokenAccountIn = selectTokenAccount({ tokenAccounts, mint, programId: TOKEN_PROGRAM_ID, owner, associatedOnly })

    return handleTokenAccount({
        useWsol,
        amount,
        programId: TOKEN_PROGRAM_ID,
        mint,
        tokenAccount: tokenAccountIn?.pubkey,
        owner,
        rentExemption,
        frontInstructions,
        endInstructions,
        signers,
    })
}

export interface GetUserKeysParams {
    useWsol?: boolean
    tokenIn: PublicKey
    tokenOut: PublicKey
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    amountIn: BN
    rentExemption: number
}

export function getUserKeys(params: GetUserKeysParams) {
    const { useWsol, tokenIn, tokenOut, tokenAccounts, owner, amountIn, rentExemption } = params
    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const signers: Signer[] = []

    const tokenAccountIn = getTokenAccount({ tokenAccounts, mint: tokenIn, amount: amountIn, rentExemption, useWsol, owner, frontInstructions, endInstructions, signers, associatedOnly: false })
    const tokenAccountOut = getTokenAccount({ tokenAccounts, mint: tokenOut, amount: ZERO, rentExemption, useWsol, owner, frontInstructions, endInstructions, signers })
    const userKeys = { tokenAccountIn, tokenAccountOut, owner }

    return { userKeys, frontInstructions, endInstructions, signers }
}
