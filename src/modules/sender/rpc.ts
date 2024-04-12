import type { Connection } from '@solana/web3.js'
import { connection } from '../../common/connection'
import { LiteRpc } from './lite-rpc'

export class Rpc extends LiteRpc {
    public override readonly features = { name: 'Default', tip: false, antiMev: false }

    protected override readonly connection: Connection
    protected override readonly pollingInterval: number

    public constructor() {
        super()

        this.connection = connection
        this.pollingInterval = 200
    }
}
