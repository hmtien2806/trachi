import { PublicKey } from '@solana/web3.js'
import { Column, Entity, JoinColumn, OneToOne, type Relation } from 'typeorm'
import { PublicKeyColumn } from '../utils/databases/columns/public-key'
import { Token } from './token'

@Entity({ name: 'token_metadatas' })
export class TokenMetadata {
    @PublicKeyColumn({ primary: true })
    public declare id: PublicKey

    @PublicKeyColumn({ unique: true })
    public declare mint: PublicKey

    @Column()
    public declare name: string

    @Column()
    public declare symbol: string

    @Column({ nullable: true })
    public declare uri?: string

    @Column()
    public declare isMutable: boolean

    @OneToOne(() => Token, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'mint' })
    public declare token: Relation<Token>
}
