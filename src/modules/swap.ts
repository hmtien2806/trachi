import { type Logger, highlight, message } from '@kdt310722/logger'
import { Emitter } from '@kdt310722/utils/event'
import { tap } from '@kdt310722/utils/function'
import { format } from '@kdt310722/utils/number'
import { Liquidity, type LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk'
import { ComputeBudgetProgram, type Connection, type SignatureResult } from '@solana/web3.js'
import { ZERO } from '../constants'
import { createChildLogger } from '../core/logger'
import { TransactionConfirmFailed } from '../errors/transaction-confirm-failed'
import type { BigNumberish, PublicKeyLike } from '../types/entities'
import { toBN } from '../utils/numbers'
import { getSwapTokens } from '../utils/swaps/get-swap-tokens'
import { getUserKeys } from '../utils/swaps/get-user-keys'
import type { Wallet } from './account/common/wallet'
import type { Common } from './common'
import type { Sender } from './sender/sender'

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
    'confirmed': (signature: string) => void
    'failed': (signature: string, error: Error) => void
}

export class Swap extends Emitter<SwapEvents> {
    protected readonly common: Common
    protected readonly logger: Logger

    public constructor(protected readonly connection: Connection, common: Common) {
        super()

        this.common = common
        this.logger = createChildLogger('app:modules:swap')
    }

    public async execute(params: SwapParams) {
        const timer = this.printDebugMessage(params)

        const { sender, priorityFee = 0, tip = 0, antiMev = false, ...createParams } = params
        const _priorityFee = toBN(priorityFee)
        const _tip = toBN(tip)
        const [{ instructions, signers }, latestBlock] = await Promise.all([this.createSwapInstructions(createParams), this.common.getLatestBlock()])

        if (_priorityFee.gt(ZERO)) {
            instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: _priorityFee.toNumber() }))
            instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: 10 ** 6 }))
        }

        const address = highlight(params.wallet.address.toString())
        const transaction = sender.buildTransaction({ signers, instructions, tip: _tip, recentBlockhash: latestBlock.blockhash, payer: params.wallet.address, antiMev })
        const sendTimer = tap(this.logger.createTimer(), () => this.logger.stopTimer(timer, 'info', `Created swap transaction for wallet ${address}, sending to the blockchain...`))

        const signature = await sender.sendTransaction(transaction, antiMev).then((signature) => tap(signature, () => this.logger.stopTimer(sendTimer, 'info', `Swap transaction for wallet ${address} sent to the blockchain with signature ${highlight(signature)}, waiting for confirmation...`)))
        const confirmTimer = this.logger.createTimer()

        this.connection.confirmTransaction({ signature, ...latestBlock }, 'confirmed').then(({ value }) => this.onTransactionConfirmed(confirmTimer, signature, value)).catch((error) => {
            this.emit('failed', signature, error)
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

        return { instructions, signers: [wallet.keypair, ...signers, ...innerTransaction.signers] }
    }

    protected onTransactionConfirmed(timer: string, signature: string, result: SignatureResult) {
        if (result.err) {
            throw new TransactionConfirmFailed(result.err)
        }

        this.emit('confirmed', signature)
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
