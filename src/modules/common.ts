import { type Logger, highlight, message } from '@kdt310722/logger'
import type { SyndicaChainStream } from '@kdt310722/syndica-chainstream-sdk'
import { notNullish } from '@kdt310722/utils/common'
import { tap } from '@kdt310722/utils/function'
import { poll } from '@kdt310722/utils/promise'
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk'
import type { Connection } from '@solana/web3.js'
import { syndica } from '../common/syndica'
import { config } from '../config/config'
import { createChildLogger } from '../core/logger'
import { LruMap } from '../utils/lru-map'

export interface RecentBlock {
    blockhash: string
    lastValidBlockHeight: number
}

export class Common {
    protected latestBlock?: [number, string]
    protected accountLayoutRentExemption?: number

    protected readonly connection: Connection
    protected readonly logger: Logger
    protected readonly syndica: SyndicaChainStream
    protected readonly recentBlocks: LruMap<string>

    public constructor(connection: Connection) {
        this.connection = connection
        this.logger = createChildLogger('app:modules:common')
        this.syndica = syndica
        this.recentBlocks = new LruMap<string>(config.chain.maxRecentBlockHashes)
    }

    public async getLatestBlockHash(): Promise<RecentBlock> {
        if (notNullish(this.latestBlock)) {
            const blockheight = this.latestBlock[0] - 150 + config.chain.maxBlocksForTransaction
            const blockhash = this.recentBlocks.get(blockheight.toString())

            if (blockhash) {
                return tap({ blockhash, lastValidBlockHeight: blockheight + 150 }, (i) => this.logger.debug(message(() => `Using block: ${highlight(i.blockhash)} (${highlight(i.lastValidBlockHeight.toString())}) from cache, latest: ${highlight(this.latestBlock?.[0].toString() ?? 'N/A')}`)))
            }

            return tap({ blockhash: this.latestBlock[1], lastValidBlockHeight: this.latestBlock[0] + 150 }, (i) => this.logger.debug(message(() => `Using latest block: ${highlight(i.blockhash)} (${highlight(i.lastValidBlockHeight.toString())}) from cache`)))
        }

        return tap(await this.connection.getLatestBlockhash().then((i) => ({ ...i, lastValidBlockHeight: i.lastValidBlockHeight - 150 })), (i) => this.logger.debug(message(() => `Using block: ${highlight(i.blockhash)} (${highlight(i.lastValidBlockHeight.toString())})`)))
    }

    public async getAccountLayoutRentExemption() {
        return this.accountLayoutRentExemption ?? await this.connection.getMinimumBalanceForRentExemption(SPL_ACCOUNT_LAYOUT.span)
    }

    public async init() {
        const timer = tap(this.logger.createTimer(), () => this.logger.info('Initializing common module...'))

        await this.watchBlock()

        this.accountLayoutRentExemption = await this.getAccountLayoutRentExemption().finally(() => {
            this.watchAccountLayoutRentExemption()
        })

        this.logger.stopTimer(timer, 'info', 'Common module initialized')
    }

    public async watchBlock() {
        this.syndica.on('block', (block) => {
            this.latestBlock = [block.blockHeight, block.blockhash]
            this.recentBlocks.set(block.blockHeight.toString(), block.blockhash)
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
