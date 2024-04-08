import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk'
import type { AccountInfo } from '@solana/web3.js'
import { TokenAccount } from '../../entities/token-account'
import type { PublicKeyLike } from '../../types/entities'
import { toPublicKey } from '../public-key'

export function formatTokenAccount(id: PublicKeyLike, accountInfo: AccountInfo<Buffer>) {
    const data = SPL_ACCOUNT_LAYOUT.decode(accountInfo.data)
    const entity = new TokenAccount()

    entity.id = toPublicKey(id)
    entity.programId = accountInfo.owner
    entity.owner = data.owner
    entity.mint = data.mint
    entity.state = data.state
    entity.amount = data.amount
    entity.delegate = data.delegate
    entity.delegateOption = data.delegateOption
    entity.isNativeOption = data.isNativeOption
    entity.isNative = data.isNative
    entity.delegatedAmount = data.delegatedAmount
    entity.closeAuthorityOption = data.closeAuthorityOption
    entity.closeAuthority = data.closeAuthority

    return entity
}
