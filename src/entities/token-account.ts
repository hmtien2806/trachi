import { omit } from '@kdt310722/utils/object'
import type { TokenAccount as RaydiumTokenAccount } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { Column, Entity, UpdateDateColumn } from 'typeorm'
import { BigIntColumn } from '../utils/databases/columns/bn'
import { PublicKeyColumn } from '../utils/databases/columns/public-key'

@Entity()
export class TokenAccount {
    @PublicKeyColumn({ primary: true })
    public declare id: PublicKey

    @PublicKeyColumn()
    public declare programId: PublicKey

    @PublicKeyColumn()
    public declare owner: PublicKey

    @PublicKeyColumn()
    public declare mint: PublicKey

    @Column()
    public declare state: number

    @BigIntColumn()
    public declare amount: BN

    @PublicKeyColumn()
    public declare delegate: PublicKey

    @Column()
    public declare delegateOption: number

    @Column()
    public declare isNativeOption: number

    @BigIntColumn()
    public declare isNative: BN

    @BigIntColumn()
    public declare delegatedAmount: BN

    @Column()
    public declare closeAuthorityOption: number

    @PublicKeyColumn()
    public declare closeAuthority: PublicKey

    @UpdateDateColumn()
    public declare updatedAt: Date

    public format(): RaydiumTokenAccount {
        return { pubkey: this.id, programId: this.programId, accountInfo: { ...omit(this, 'id', 'programId') } }
    }
}
