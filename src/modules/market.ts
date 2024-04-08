import { type Logger, highlight, message } from '@kdt310722/logger'
import { Emitter } from '@kdt310722/utils/event'
import { tap } from '@kdt310722/utils/function'
import { format } from '@kdt310722/utils/number'
import { MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, Market as RaydiumMarket } from '@raydium-io/raydium-sdk'
import type { AccountInfo, Connection } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { Repository } from 'typeorm'
import { MARKET_V3_PROGRAM_IDS } from '../constants'
import { datasource } from '../core/database'
import { createChildLogger } from '../core/logger'
import { Market as MarketEntity } from '../entities/market'
import type { PublicKeyLike } from '../types/entities'
import { upsert } from '../utils/databases/upsert'
import { toPublicKey } from '../utils/public-key'

export type MarketEvents = {
    'new': (market: MarketEntity) => void
}

export class Market extends Emitter<MarketEvents> {
    protected readonly programId = MAINNET_PROGRAM_ID.OPENBOOK_MARKET
    protected readonly repository: Repository<MarketEntity>
    protected readonly markets: Map<string, MarketEntity>
    protected readonly logger: Logger
    protected readonly defaultPubKey = PublicKey.default

    public constructor(protected readonly connection: Connection) {
        super()

        this.markets = new Map()
        this.repository = datasource.getRepository(MarketEntity)
        this.logger = createChildLogger('app:modules:market')
    }

    public async findOrFail(id: PublicKeyLike) {
        const market = await this.find(id)

        if (!market) {
            throw new Error(`Market account ${id.toString()} not found`)
        }

        return market
    }

    public async find(id: PublicKeyLike) {
        const cached = this.markets.get(id.toString())

        if (cached) {
            return cached
        }

        const pubkey = toPublicKey(id)
        const account = await this.connection.getAccountInfo(pubkey)

        if (!account || account.data.length !== MARKET_STATE_LAYOUT_V3.span) {
            return
        }

        return this.handleAccount(pubkey, account, true)
    }

    public async init() {
        await this.load().then(() => this.watch())
    }

    public async load() {
        const countTimer = tap(this.logger.createTimer(), () => this.logger.info('Counting market accounts in database...'))

        const total = tap(await this.repository.count(), (count) => {
            this.logger.stopTimer(countTimer, 'info', `Found ${highlight(format(count))} market accounts in database`)
        })

        if (total === 0) {
            return
        }

        const timer = tap(this.logger.createTimer(), () => this.logger.info('Importing...'))
        const limit = 1000
        const pages = Math.ceil(total / limit)

        for (let page = 0; page < pages; page++) {
            const accounts = await this.repository.find({ take: limit, skip: page * limit })

            for (const account of accounts) {
                this.markets.set(account.id.toString(), account)
            }
        }

        this.logger.stopTimer(timer, 'info', `Imported ${highlight(format(total))} market accounts from database`)
    }

    public watch() {
        this.logger.info('Start watching market accounts...')

        const subscriptionId = this.connection.onProgramAccountChange(this.programId, ({ accountId, accountInfo }) => this.onAccountChange(accountId, accountInfo), 'confirmed', [
            { dataSize: MARKET_STATE_LAYOUT_V3.span },
        ])

        return () => this.connection.removeProgramAccountChangeListener(subscriptionId)
    }

    public add(market: MarketEntity) {
        if (!this.isValidMarket(market)) {
            return
        }

        const id = market.id.toString()

        this.logger.debug(message(() => `Found new market: ${highlight(id)}`))
        this.markets.set(id, market)
        this.emit('new', market)

        return upsert(this.repository, market, { conflictPaths: ['id'], conflictType: 'update' }).catch((error) => {
            this.logger.error(`Failed when save market account ${highlight(id)} to the database`, error)
        })
    }

    protected onAccountChange(pubkey: PublicKey, account: AccountInfo<Buffer>) {
        const id = pubkey.toString()

        if (this.markets.has(id)) {
            return
        }

        this.handleAccount(pubkey, account)
    }

    protected handleAccount(pubkey: PublicKey, account: AccountInfo<Buffer>, ignoreOnExists = false) {
        if (!MARKET_V3_PROGRAM_IDS.some((programId) => programId.equals(account.owner))) {
            return tap(void 0, () => this.logger.warn(`Ignore market account ${highlight(pubkey.toString())} with unknown program id (${highlight(account.owner.toString())})`))
        }

        const id = pubkey.toString()
        const cached = this.markets.get(id)

        if (ignoreOnExists && cached) {
            return cached
        }

        const authority = RaydiumMarket.getAssociatedAuthority({ programId: account.owner, marketId: pubkey }).publicKey
        const marketData = MARKET_STATE_LAYOUT_V3.decode(account.data)

        return tap(this.repository.create({ id, programId: account.owner, authority, ...marketData }), (market) => this.add(market))
    }

    protected isValidMarket(market: MarketEntity) {
        return !market.baseVault.equals(this.defaultPubKey) && !market.quoteVault.equals(this.defaultPubKey) && !market.bids.equals(this.defaultPubKey) && !market.asks.equals(this.defaultPubKey)
    }
}
