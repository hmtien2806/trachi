import { type Logger, highlight, message } from '@kdt310722/logger'
import { Emitter } from '@kdt310722/utils/event'
import { tap } from '@kdt310722/utils/function'
import { format } from '@kdt310722/utils/number'
import { OpenOrders as OpenOrdersInstance } from '@project-serum/serum'
import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import type { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import type BN from 'bn.js'
import { MINIMAL_OPEN_ORDERS_LAYOUT_V2 } from '../constants'
import { createChildLogger } from '../core/logger'
import type { PublicKeyLike } from '../types/entities'
import { toPublicKey } from '../utils/public-key'

export interface OpenOrdersEntity {
    baseTokenTotal: BN
    quoteTokenTotal: BN
}

export type OpenOrdersEvents = {
    'update': (id: PublicKey, openOrders: OpenOrdersEntity) => void
}

export class OpenOrders extends Emitter<OpenOrdersEvents> {
    protected readonly programId = MAINNET_PROGRAM_ID.OPENBOOK_MARKET
    protected readonly logger: Logger
    protected readonly layout = OpenOrdersInstance.getLayout(this.programId)
    protected readonly openOrders: Map<string, OpenOrdersEntity>
    protected readonly offset = 5 + 8 + 32 + 32 + 8
    protected readonly end = this.offset + MINIMAL_OPEN_ORDERS_LAYOUT_V2.span

    public constructor(protected readonly connection: Connection) {
        super()

        this.logger = createChildLogger('app:modules:market')
        this.openOrders = new Map()
    }

    public async findOrFail(id: PublicKeyLike) {
        const openOrders = await this.find(id)

        if (!openOrders) {
            throw new Error(`Open orders account ${id.toString()} not found`)
        }

        return openOrders
    }

    public async find(id: PublicKeyLike, cacheOnly = false) {
        const cached = this.openOrders.get(id.toString())

        if (cached) {
            return cached
        }

        if (cacheOnly) {
            return
        }

        const pubkey = toPublicKey(id)
        const account = await this.connection.getAccountInfo(pubkey)

        if (!account || account.data.length !== this.layout.span) {
            return
        }

        return this.handleAccount(pubkey, account, true)
    }

    public async init() {
        await Promise.resolve().then(() => this.watch())
    }

    public watch() {
        this.logger.info('Start watching open orders accounts...')

        const subscriptionId = this.connection.onProgramAccountChange(this.programId, ({ accountId, accountInfo }) => this.handleAccount(accountId, accountInfo), 'confirmed', [
            { dataSize: this.layout.span },
        ])

        return () => this.connection.removeProgramAccountChangeListener(subscriptionId)
    }

    protected handleAccount(pubkey: PublicKey, account: AccountInfo<Buffer>, ignoreOnExists = false) {
        const id = pubkey.toString()
        const cached = this.openOrders.get(id)

        if (ignoreOnExists && cached) {
            return cached
        }

        const data = MINIMAL_OPEN_ORDERS_LAYOUT_V2.decode(account.data.subarray(this.offset, this.end))

        return tap<OpenOrdersEntity>({ baseTokenTotal: data.baseTokenTotal, quoteTokenTotal: data.quoteTokenTotal }, (openOrders) => {
            this.logger.debug(message(() => `Updated open orders: ${highlight(id)} (base token total: ${highlight(format(openOrders.baseTokenTotal.toString()))}, quote token total: ${highlight(format(openOrders.quoteTokenTotal.toString()))})`))
            this.openOrders.set(id, openOrders)
            this.emit('update', pubkey, openOrders)
        })
    }
}
