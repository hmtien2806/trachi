import { TxVersion } from '@raydium-io/raydium-sdk'
import { type AddressLookupTableAccount, type Keypair, type PublicKey, type Signer, type TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js'

export interface CreateTransactionParams {
    version: TxVersion
    payer: PublicKey
    signers: Array<Signer | Keypair>
    instructions: TransactionInstruction[]
    recentBlockhash: string
    lookupTableInfos?: AddressLookupTableAccount[]
}

export function createTransaction(params: CreateTransactionParams) {
    const { version, payer, signers, instructions, recentBlockhash, lookupTableInfos } = params

    const message = new TransactionMessage({
        instructions,
        recentBlockhash,
        payerKey: payer,
    })

    const complied = version === TxVersion.LEGACY ? message.compileToLegacyMessage() : message.compileToV0Message(lookupTableInfos)
    const transaction = new VersionedTransaction(complied)

    transaction.sign(signers)

    return transaction
}
