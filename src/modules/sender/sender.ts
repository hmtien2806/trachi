import { type Keypair, type PublicKey, type Signer, SystemProgram, type TransactionInstruction, type VersionedTransaction } from '@solana/web3.js'
import type BN from 'bn.js'

export interface BuildTransactionParams {
    payer: PublicKey
    instructions: TransactionInstruction[]
    signers: Array<Signer | Keypair>
    recentBlockhash: string
    tip?: BN
    antiMev?: boolean
}

export interface SenderFeatures {
    readonly name: string
    readonly tip: boolean
    readonly antiMev: boolean
}

export abstract class Sender {
    public abstract readonly features: SenderFeatures

    public abstract buildTransaction(params: BuildTransactionParams): VersionedTransaction

    public abstract sendTransaction(transaction: VersionedTransaction, antiMev?: boolean): Promise<string>

    protected createTipInstruction(payer: PublicKey, tipAccount: PublicKey, tip: BN) {
        return SystemProgram.transfer({ fromPubkey: payer, toPubkey: tipAccount, lamports: tip.toNumber() })
    }
}
