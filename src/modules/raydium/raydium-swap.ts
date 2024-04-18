import { type Logger, highlight, message } from '@kdt310722/logger'
import { Emitter } from '@kdt310722/utils/event'
import { tap } from '@kdt310722/utils/function'
import { format } from '@kdt310722/utils/number'
import { Liquidity, type LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'
import { ComputeBudgetProgram, type Connection, type PublicKey, type SignatureResult } from '@solana/web3.js'
import type { Repository } from 'typeorm'
import { ZERO } from '../../constants'
import { datasource } from '../../core/database'
import { createChildLogger } from '../../core/logger'
import { SwapTransaction } from '../../entities/swap-transaction'
import { TransactionConfirmFailed } from '../../errors/transaction-confirm-failed'
import type { BigNumberish, PublicKeyLike } from '../../types/entities'
import { toBN } from '../../utils/numbers'
import { getSwapTokens } from '../../utils/swaps/get-swap-tokens'
import { getUserKeys } from '../../utils/swaps/get-user-keys'
import type { Wallet } from '../account/common/wallet'
import type { Common } from '../common'
import type { Sender } from '../sender/sender'

export interface CreateSwapInstructionsParams {
    useWsol?: boolean
    wallet: Wallet
    poolKeys: LiquidityPoolKeysV4
    outputToken: PublicKeyLike
    amountIn: BigNumberish
    minimumAmountOut: BigNumberish
}

export interface SwapParams extends CreateSwapInstructionsParams {
    sender: Sender
    priorityFee?: BigNumberish
    tip?: BigNumberish
    antiMev?: boolean
}

export type SwapEvents = {
    'sent': (payer: PublicKey, signature: string) => void
    'confirmed': (payer: PublicKey, signature: string) => void
    'failed': (payer: PublicKey, signature: string, error: Error) => void
}

export class RaydiumSwap extends Emitter<SwapEvents> {
    protected readonly common: Common
    protected readonly logger: Logger
    protected readonly repository: Repository<SwapTransaction>

    public constructor(protected readonly connection: Connection, common: Common) {
        super()

        this.common = common
        this.logger = createChildLogger('app:modules:swap')
        this.repository = datasource.getRepository(SwapTransaction)
    }

    public async execute(params: SwapParams) {
        const timer = this.printDebugMessage(params)

        const { sender, priorityFee = 0, tip = 0, antiMev = false, ...createParams } = params
        const _priorityFee = toBN(priorityFee)
        const _tip = toBN(tip)
        const [{ instructions, signers, tokenIn, tokenOut }, latestBlock] = await Promise.all([this.createSwapInstructions(createParams), this.common.getLatestBlockHash()])

        if (_priorityFee.gt(ZERO)) {
            instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: _priorityFee.toNumber() * 10 }))
            instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: 10 ** 5 }))
        }

        const address = highlight(params.wallet.address.toString())
        const transaction = sender.buildTransaction({ signers, instructions, tip: _tip, recentBlockhash: latestBlock.blockhash, payer: params.wallet.address, antiMev })
        const sendTimer = tap(this.logger.createTimer(), () => this.logger.stopTimer(timer, 'info', `Created swap transaction for wallet ${address}, sending to the blockchain...`))

        const saving = this.repository.save({
            payer: params.wallet.address,
            pool: params.poolKeys.id,
            tokenIn,
            tokenOut,
            inputAmount: toBN(params.amountIn),
            status: 'created',
        })

        const signature = await sender.sendTransaction(transaction, antiMev).then((signature) => {
            this.emit('sent', params.wallet.address, signature)
            this.logger.stopTimer(sendTimer, 'info', `Swap transaction for wallet ${address} sent to the blockchain with signature ${highlight(signature)}, waiting for confirmation...`)

            saving.then((transaction) => {
                this.repository.update(transaction, { status: 'sent', signature })
            })

            return signature
        })

        const confirmTimer = this.logger.createTimer()

        this.connection.confirmTransaction({ signature, ...latestBlock }, 'confirmed').then(({ value }) => this.onTransactionConfirmed(confirmTimer, signature, value, sender, params.wallet.address, saving)).catch((error) => {
            sender.emit('confirm', signature)
            this.emit('failed', params.wallet.address, signature, error)

            saving.then((transaction) => {
                this.repository.update(transaction, { status: 'failed', signature })
            })

            this.logger.stopTimer(confirmTimer, 'error', `Failed to confirm transaction ${highlight(signature)}`, error)
        })

        return signature
    }

    public async createSwapInstructions(params: CreateSwapInstructionsParams) {
        const { wallet, poolKeys, outputToken, minimumAmountOut, useWsol = false } = params
        const { tokenIn, tokenOut } = getSwapTokens(poolKeys, outputToken)

        const amountIn = toBN(params.amountIn)
        const minAmountOut = toBN(minimumAmountOut)
        const [tokenAccounts, rentExemption] = await Promise.all([wallet.getTokenAccounts(), this.common.getAccountLayoutRentExemption()])

        const { userKeys, frontInstructions, endInstructions, signers } = getUserKeys({ useWsol, tokenIn, tokenOut, tokenAccounts, owner: wallet.address, amountIn, rentExemption })
        const { innerTransaction } = Liquidity.makeSwapFixedInInstruction({ poolKeys, userKeys, amountIn, minAmountOut }, poolKeys.version)
        const instructions = [...frontInstructions, ...innerTransaction.instructions, ...endInstructions]

        return { instructions, tokenIn, tokenOut, signers: [wallet.keypair, ...signers, ...innerTransaction.signers] }
    }

    protected onTransactionConfirmed(timer: string, signature: string, result: SignatureResult, sender: Sender, payer: PublicKey, saving: Promise<SwapTransaction>) {
        saving.then((transaction) => this.repository.update(transaction, { status: 'confirmed', signature }))
        sender.emit('confirm', signature)

        if (result.err) {
            throw new TransactionConfirmFailed(result.err)
        }

        this.emit('confirmed', payer, signature)
        this.logger.stopTimer(timer, 'info', `Transaction ${highlight(signature)} confirmed`)
    }

    protected printDebugMessage(params: SwapParams) {
        this.logger.debug(message(() => {
            const message = [
                `Building swap transaction for wallet ${highlight(params.wallet.address.toString())}...`,
                `  + Token: ${highlight(params.outputToken.toString())}`,
                `  + Pool: ${highlight(params.poolKeys.id.toString())}`,
                `  + Amount in: ${highlight(format(params.amountIn.toString()))}`,
                `  + Minimum amount out: ${highlight(format(params.minimumAmountOut.toString()))}`,
            ]

            return message.join('\n')
        }))

        return this.logger.createTimer()
    }
}
