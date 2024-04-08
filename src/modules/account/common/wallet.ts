import type { PublicKey } from '@solana/web3.js'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import type { Wallet as WalletEntity } from '../../../entities/wallet'
import type { Balance } from './balance'
import type { TokenAccount } from './token-account'

export class Wallet {
    public readonly address: PublicKey
    public readonly keypair: Keypair

    protected readonly _balance: Balance
    protected readonly _tokenAccount: TokenAccount

    public constructor(wallet: WalletEntity, balance: Balance, tokenAccount: TokenAccount) {
        this._balance = balance
        this._tokenAccount = tokenAccount
        this.address = wallet.address
        this.keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    }

    public get balance() {
        return this.balance.getBalance(this.address)
    }

    public async getTokenAccounts() {
        return this._tokenAccount.find(this.address)
    }

    public async init() {
        await this._balance.init(this.address)
        await this._tokenAccount.init(this.address)

        return this
    }
}
