import type { RpcMethod } from '../../common/rpc'

export const createGetWsolPriceHandler = (): RpcMethod => async (_, { raydiumAmmV4Liquidity }) => {
    return raydiumAmmV4Liquidity.getWsolPrice().then((i) => i.toFixed())
}
