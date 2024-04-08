import { SPL_ACCOUNT_LAYOUT, Spl, TOKEN_PROGRAM_ID, WSOL, generatePubKey, validateAndParsePublicKey } from '@raydium-io/raydium-sdk'
import { type PublicKey, SystemProgram, type TransactionInstruction } from '@solana/web3.js'
import BN from 'bn.js'

export interface MakeCreateWsolAccountInstructionsParams {
    rentExemption: number
    amount: BN
    payer: PublicKey
    owner: PublicKey
}

export function makeCreateWsolAccountInstructions(params: MakeCreateWsolAccountInstructionsParams) {
    const { rentExemption, amount, payer, owner } = params
    const instructions: TransactionInstruction[] = []

    const lamports = amount.add(new BN(rentExemption))
    const newAccount = generatePubKey({ fromPublicKey: payer, programId: TOKEN_PROGRAM_ID })

    instructions.push(SystemProgram.createAccountWithSeed({
        fromPubkey: payer,
        basePubkey: payer,
        seed: newAccount.seed,
        newAccountPubkey: newAccount.publicKey,
        lamports: lamports.toNumber(),
        space: SPL_ACCOUNT_LAYOUT.span,
        programId: TOKEN_PROGRAM_ID,
    }))

    instructions.push(Spl.makeInitAccountInstruction({
        programId: TOKEN_PROGRAM_ID,
        mint: validateAndParsePublicKey(WSOL.mint),
        tokenAccount: newAccount.publicKey,
        owner,
        instructionTypes: [],
    }))

    return { address: { newAccount: newAccount.publicKey }, innerTransaction: { instructions, signers: [], lookupTableAddress: [] } }
}
