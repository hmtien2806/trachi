import { PublicKey } from '@solana/web3.js'
import { Entity } from 'typeorm'
import { PublicKeyColumn } from '../utils/databases/columns/public-key'

@Entity()
export class Market {
    @PublicKeyColumn({ primary: true })
    public declare id: PublicKey

    @PublicKeyColumn()
    public declare programId: PublicKey

    @PublicKeyColumn()
    public declare authority: PublicKey

    @PublicKeyColumn()
    public declare baseVault: PublicKey

    @PublicKeyColumn()
    public declare quoteVault: PublicKey

    @PublicKeyColumn()
    public declare eventQueue: PublicKey

    @PublicKeyColumn()
    public declare bids: PublicKey

    @PublicKeyColumn()
    public declare asks: PublicKey
}
