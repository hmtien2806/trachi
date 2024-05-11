import { type Logger, highlight, message } from '@kdt310722/logger'
import { tap } from '@kdt310722/utils/function'
import { poll } from '@kdt310722/utils/promise'
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk'
import type { Connection } from '@solana/web3.js'
import { createChildLogger } from '../core/logger'

export interface RecentBlock {
    blockhash: string
    lastValidBlockHeight: number
}

export class Common {
    protected recentBlock?: RecentBlock
    protected accountLayoutRentExemption?: number

    protected readonly connection: Connection
    protected readonly logger: Logger

    public constructor(connection: Connection) {
        this.connection = connection
        this.logger = createChildLogger('app:modules:common')
    }

    public async getLatestBlockHash(): Promise<RecentBlock> {
        return this.recentBlock ?? await this.connection.getLatestBlockhash('finalized')
    }

    public async getAccountLayoutRentExemption() {
        return this.accountLayoutRentExemption ?? await this.connection.getMinimumBalanceForRentExemption(SPL_ACCOUNT_LAYOUT.span)
    }

    public async init() {
        const timer = tap(this.logger.createTimer(), () => this.logger.info('Initializing common module...'))

        this.recentBlock = await this.getLatestBlockHash().finally(() => {
            this.watchBlock()
        })

        this.accountLayoutRentExemption = await this.getAccountLayoutRentExemption().finally(() => {
            this.watchAccountLayoutRentExemption()
        })

        this.logger.stopTimer(timer, 'info', 'Common module initialized')
    }

    public watchBlock() {
        const update = async () => {
            const block = await this.connection.getLatestBlockhash('finalized')

            if (!this.recentBlock || this.recentBlock.lastValidBlockHeight < block.lastValidBlockHeight) {
                this.recentBlock = block
                this.logger.debug(message(() => `Updated latest blockhash to ${highlight(this.recentBlock!.blockhash)} (blockheight: ${highlight(highlight(this.recentBlock!.lastValidBlockHeight.toString()))})`))
            }
        }

        return poll(update, 10 * 1000)
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
