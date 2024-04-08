import type { Connection } from '@solana/web3.js'
import type { Repository } from 'typeorm'
import { datasource } from '../../core/database'
import { Wallet as WalletEntity } from '../../entities/wallet'
import { Balance } from './common/balance'
import { TokenAccount } from './common/token-account'
import { Wallet } from './common/wallet'

export class Account {
    public readonly balance: Balance
    public readonly tokenAccount: TokenAccount

    protected readonly wallets = new Map<number, Wallet>()
    protected readonly repository: Repository<WalletEntity>

    public constructor(protected readonly connection: Connection) {
        this.balance = new Balance(connection)
        this.tokenAccount = new TokenAccount(connection)
        this.repository = datasource.getRepository(WalletEntity)
    }

    public async init() {
        const wallets = await this.repository.find({ where: { isActive: true } })

        for (const wallet of wallets) {
            await this.add(wallet)
        }
    }

    public get(id: number) {
        return this.wallets.get(id)
    }

    public async add(wallet: WalletEntity) {
        if (this.wallets.has(wallet.id)) {
            return
        }

        await new Wallet(wallet, this.balance, this.tokenAccount).init().then((instance) => {
            this.wallets.set(wallet.id, instance)
        })
    }
}
