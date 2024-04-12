import type { Constructor } from '@kdt310722/utils/common'
import { map } from '@kdt310722/utils/object'
import { BloXRoute } from './blox-route'
import { Combined } from './combined'
import { Jito } from './jito'
import { LiteRpc } from './lite-rpc'
import { Rpc } from './rpc'
import type { Sender } from './sender'

const senders: Record<string, Constructor<Sender>> = {
    'jito': Jito,
    'bloXRoute': BloXRoute,
    'lite-rpc': LiteRpc,
    'rpc': Rpc,
}

export const SUPPORTED_SENDERS = Object.keys(senders) as [string, ...string[]]

export class SenderManager {
    protected readonly senders: Record<string, Sender>

    public constructor() {
        this.senders = map(senders, (name, instance) => [name, new instance()] as const)
        this.senders['combined'] = new Combined(this.senders['jito'] as Jito, this.senders['rpc'] as Rpc)
    }

    public get(id: typeof SUPPORTED_SENDERS[number]) {
        if (id in this.senders) {
            return this.senders[id]
        }

        throw new Error(`Unsupported sender: ${id}`)
    }

    public getAvailableSenders() {
        return map(this.senders, (name, sender) => [name, sender.features])
    }
}
