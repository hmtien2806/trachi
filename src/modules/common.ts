import { type Logger, highlight, message } from '@kdt310722/logger'
import { poll } from '@kdt310722/utils/promise'
import { SPL_ACCOUNT_LAYOUT } from '@raydium-io/raydium-sdk'
import type { Connection } from '@solana/web3.js'
import { createChildLogger } from '../core/logger'

export interface RecentBlock {
    blockhash: string
    lastValidBlockHeight: number
}

export class Common {
    protected latestBlock?: RecentBlock
    protected accountLayoutRentExemption?: number

    protected readonly connection: Connection
    protected readonly logger: Logger

    public constructor(connection: Connection) {
        this.connection = connection
        this.logger = createChildLogger('app:modules:common')
    }

    public async getLatestBlock() {
        return this.latestBlock ?? await this.connection.getLatestBlockhash()
    }

    public async getAccountLayoutRentExemption() {
        return this.accountLayoutRentExemption ?? await this.connection.getMinimumBalanceForRentExemption(SPL_ACCOUNT_LAYOUT.span)
    }

    public async init() {
        const stopLoading = this.logger.createLoading().start('Initializing common module...')

        this.latestBlock = await this.getLatestBlock().finally(() => {
            this.watchBlock()
        })

        this.accountLayoutRentExemption = await this.getAccountLayoutRentExemption().finally(() => {
            this.watchAccountLayoutRentExemption()
        })

        stopLoading('Common module initialized')
    }

    public watchBlock() {
        const update = async () => {
            const block = await this.connection.getLatestBlockhash()

            if (this.latestBlock && this.latestBlock.lastValidBlockHeight <= block.lastValidBlockHeight) {
                this.latestBlock = block
                this.logger.debug(message(() => `Updated latest block to ${highlight(block.blockhash)} (last valid block height: ${highlight(block.lastValidBlockHeight.toString())})`))
            }
        }

        return poll(update, 30 * 1000)
    }

    public watchAccountLayoutRentExemption() {
        const update = async () => {
            const balance = await this.connection.getMinimumBalanceForRentExemption(SPL_ACCOUNT_LAYOUT.span)

            if (this.accountLayoutRentExemption !== balance) {
                this.accountLayoutRentExemption = balance
                this.logger.debug(message(() => `Updated account layout minimum balance for rent exemption to ${highlight(balance.toString())}`))
            }
        }

        return poll(update, 5 * 60 * 1000)
    }
}
