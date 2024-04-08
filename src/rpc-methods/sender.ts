import type { RpcMethod } from '../common/rpc'

export const createGetAvailableSendersHandler = (): RpcMethod => async (_, { senderManager }) => {
    return Promise.resolve().then(() => senderManager.getAvailableSenders())
}
