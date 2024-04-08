import { RAYDIUM_AMM_STATUS } from '../constants'

export function isRaydiumAmmPoolSwapableStatus(status: number) {
    const validStatus = {
        [RAYDIUM_AMM_STATUS.Uninitialized]: false,
        [RAYDIUM_AMM_STATUS.Initialized]: true,
        [RAYDIUM_AMM_STATUS.Disabled]: false,
        [RAYDIUM_AMM_STATUS.WithdrawOnly]: false,
        [RAYDIUM_AMM_STATUS.LiquidityOnly]: false,
        [RAYDIUM_AMM_STATUS.OrderBookOnly]: false,
        [RAYDIUM_AMM_STATUS.SwapOnly]: true,
        [RAYDIUM_AMM_STATUS.WaitingTrade]: true,
    }

    return validStatus[status] ?? false
}
