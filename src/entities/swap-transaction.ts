import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BigIntColumn } from '../utils/databases/columns/bn'
import { PublicKeyColumn } from '../utils/databases/columns/public-key'

@Entity()
export class SwapTransaction {
    @PrimaryGeneratedColumn()
    public declare id: number

    @PublicKeyColumn()
    public declare payer: PublicKey

    @PublicKeyColumn()
    public declare pool: PublicKey

    @PublicKeyColumn()
    public declare tokenIn: PublicKey

    @PublicKeyColumn()
    public declare tokenOut: PublicKey

    @BigIntColumn()
    public declare inputAmount: BN

    @Column()
    public declare status: string

    @Column({ nullable: true })
    public declare signature?: string

    @CreateDateColumn()
    public declare createdAt: Date

    @UpdateDateColumn()
    public declare updatedAt: Date
}
