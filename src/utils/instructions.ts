import { isKeysOf, isObject } from '@kdt310722/utils/object'
import { TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import type { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js'

export function isPartialDecodedInstruction(instruction: unknown): instruction is PartiallyDecodedInstruction {
    return isObject(instruction) && isKeysOf(instruction, ['programId', 'accounts', 'data'])
}

export function isParsedInstruction(instruction: unknown): instruction is ParsedInstruction {
    return isObject(instruction) && isKeysOf(instruction, ['program', 'programId', 'parsed'])
}

export function getInstructions({ transaction, meta }: ParsedTransactionWithMeta) {
    const instructions = transaction.message.instructions

    if (meta?.innerInstructions) {
        for (const innerInstructions of meta.innerInstructions) {
            instructions.push(...innerInstructions.instructions)
        }
    }

    return instructions
}

export function isCloseAccountInstruction(instruction: ParsedInstruction) {
    return instruction.programId.equals(TOKEN_PROGRAM_ID) && instruction.parsed.type === 'closeAccount'
}

export function getCloseAccounts(tx: ParsedTransactionWithMeta) {
    const accounts: PublicKey[] = []

    for (const instruction of getInstructions(tx)) {
        if (isParsedInstruction(instruction) && isCloseAccountInstruction(instruction)) {
            accounts.push(instruction.parsed.info.account)
        }
    }

    return accounts
}
