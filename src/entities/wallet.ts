import { PublicKey } from '@solana/web3.js'
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { PublicKeyColumn } from '../utils/databases/columns/public-key'

@Entity()
export class Wallet {
    @PrimaryGeneratedColumn()
    public declare id: number

    @Index()
    @PublicKeyColumn({ unique: true })
    public declare address: PublicKey

    @Column({ default: false })
    public declare isActive: boolean

    @Column()
    public declare password: string

    @Index()
    @Column({ unique: true })
    public declare privateKey: string

    @Column()
    public declare role: number

    @CreateDateColumn()
    public declare createdAt: Date

    @UpdateDateColumn()
    public declare updatedAt: Date
}
