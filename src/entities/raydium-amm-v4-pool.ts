import { PublicKey } from '@solana/web3.js'
import { Column, Entity, Index } from 'typeorm'
import { PublicKeyColumn } from '../utils/databases/columns/public-key'

@Entity()
export class RaydiumAmmV4Pool {
    @PublicKeyColumn({ primary: true })
    public declare id: PublicKey

    @PublicKeyColumn()
    public declare programId: PublicKey

    @Index()
    @PublicKeyColumn()
    public declare baseMint: PublicKey

    @Index()
    @PublicKeyColumn()
    public declare quoteMint: PublicKey

    @PublicKeyColumn()
    public declare lpMint: PublicKey

    @Column()
    public declare baseDecimals: number

    @Column()
    public declare quoteDecimals: number

    @Column()
    public declare lpDecimals: number

    @PublicKeyColumn()
    public declare authority: PublicKey

    @PublicKeyColumn()
    public declare openOrders: PublicKey

    @PublicKeyColumn()
    public declare targetOrders: PublicKey

    @PublicKeyColumn()
    public declare baseVault: PublicKey

    @PublicKeyColumn()
    public declare quoteVault: PublicKey

    @PublicKeyColumn()
    public declare lpVault: PublicKey

    @PublicKeyColumn()
    public declare withdrawQueue: PublicKey

    @PublicKeyColumn()
    public declare marketId: PublicKey

    @Column()
    public declare openTime: number
}
