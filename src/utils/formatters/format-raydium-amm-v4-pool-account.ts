import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity } from '@raydium-io/raydium-sdk'
import type { AccountInfo, PublicKey } from '@solana/web3.js'
import { RaydiumAmmV4Pool } from '../../entities/raydium-amm-v4-pool'

export function formatRaydiumAmmV4PoolAccount(id: PublicKey, accountInfo: AccountInfo<Buffer>) {
    const data = LIQUIDITY_STATE_LAYOUT_V4.decode(accountInfo.data)
    const entity = new RaydiumAmmV4Pool()

    entity.id = id
    entity.programId = accountInfo.owner
    entity.baseMint = data.baseMint
    entity.quoteMint = data.quoteMint
    entity.lpMint = data.lpMint
    entity.baseDecimals = data.baseDecimal.toNumber()
    entity.quoteDecimals = data.quoteDecimal.toNumber()
    entity.lpDecimals = data.baseDecimal.toNumber()
    entity.authority = Liquidity.getAssociatedAuthority({ programId: accountInfo.owner }).publicKey
    entity.openOrders = data.openOrders
    entity.targetOrders = data.targetOrders
    entity.baseVault = data.baseVault
    entity.quoteVault = data.quoteVault
    entity.withdrawQueue = data.withdrawQueue
    entity.lpVault = data.lpVault
    entity.openTime = data.poolOpenTime.toNumber()
    entity.marketId = data.marketId

    return Object.assign(entity, { status: data.status, baseNeedTakePnl: data.baseNeedTakePnl, quoteNeedTakePnl: data.quoteNeedTakePnl })
}
