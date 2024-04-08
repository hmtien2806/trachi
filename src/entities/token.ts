import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Column, Entity, OneToOne, type Relation } from 'typeorm'
import { BigIntColumn } from '../utils/databases/columns/bn'
import { PublicKeyColumn } from '../utils/databases/columns/public-key'
import { TokenMetadata } from './token-metadata'

@Entity()
export class Token {
    @PublicKeyColumn({ primary: true })
    public declare mint: PublicKey

    @Column()
    public declare decimals: number

    @BigIntColumn()
    public declare supply: BN

    @Column()
    public declare mintAuthorityOption: number

    @OneToOne(() => TokenMetadata, (metadata) => metadata.token)
    public declare metadata?: Relation<TokenMetadata>
}
