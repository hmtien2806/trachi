import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { Connection } from '@solana/web3.js'
import { config } from '../config/config'

export const connection = new Connection(config.rpc.http, {
    wsEndpoint: config.rpc.websocket,
    commitment: 'confirmed',
    disableRetryOnRateLimit: true,
})

export const umi = createUmi(connection).use(mplTokenMetadata())
