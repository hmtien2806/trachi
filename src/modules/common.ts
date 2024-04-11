import { type Logger, highlight, message } from '@kdt310722/logger'
import type { SyndicaChainStream } from '@kdt310722/syndica-chainstream-sdk'
import { tap } from '@kdt310722/utils/function'
import { poll } from '@kdt310722/utils/promise'
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk'
import type { Connection } from '@solana/web3.js'
import { syndica } from '../common/syndica'
import { createChildLogger } from '../core/logger'
import { LruSet } from '../utils/lru-set'

export interface RecentBlock {
    blockhash: string
    lastValidBlockHeight: number
}

export class Common {
    protected latestBlock?: RecentBlock & { blockheight: number }
    protected accountLayoutRentExemption?: number

    protected readonly connection: Connection
    protected readonly logger: Logger
    protected readonly syndica: SyndicaChainStream
    protected readonly recentBlocks = new LruSet<RecentBlock>(140)

    public constructor(connection: Connection) {
        this.connection = connection
        this.logger = createChildLogger('app:modules:common')
        this.syndica = syndica
    }

    public async getLatestBlockHash() {
        let blockhash = this.recentBlocks.size >= 140 ? this.recentBlocks.first() : this.recentBlocks.last()

        if (!blockhash) {
            blockhash = await this.connection.getLatestBlockhash().then((i) => ({ ...i, lastValidBlockHeight: i.lastValidBlockHeight - 150 }))
        }

        return tap(blockhash!, (i) => this.logger.debug(message(() => `Using block: ${highlight(i.blockhash)} (${highlight(i.lastValidBlockHeight.toString())}), latest: ${highlight(this.latestBlock?.blockheight.toString() ?? 'N/A')}`)))
    }

    public async getAccountLayoutRentExemption() {
        return this.accountLayoutRentExemption ?? await this.connection.getMinimumBalanceForRentExemption(SPL_ACCOUNT_LAYOUT.span)
    }

    public async init() {
        const stopLoading = this.logger.createLoading().start('Initializing common module...')

        await this.getLatestBlockHash().then((i) => this.recentBlocks.add(i)).finally(() => {
            this.watchBlock()
        })

        this.accountLayoutRentExemption = await this.getAccountLayoutRentExemption().finally(() => {
            this.watchAccountLayoutRentExemption()
        })

        stopLoading('Common module initialized')
    }

    public async watchBlock() {
        this.syndica.on('block', (block) => {
            const blockhash = { blockhash: block.blockhash, lastValidBlockHeight: block.blockHeight + 150 }

            this.latestBlock = { ...blockhash, blockheight: block.blockHeight }
            this.recentBlocks.add(blockhash)
        })

        return this.syndica.subscribeBlock()
    }

    public watchAccountLayoutRentExemption() {
        const update = async () => {
            const balance = await this.connection.getMinimumBalanceForRentExemption(SPL_ACCOUNT_LAYOUT.span)

            if (this.accountLayoutRentExemption !== balance) {
                this.accountLayoutRentExemption = balance
                this.logger.debug(message(() => `Updated account layout minimum balance for rent exemption to ${highlight(balance.toString())}`))
            }
        }

        return poll(update, 60 * 60 * 1000)
    }
}
