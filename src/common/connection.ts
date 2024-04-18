import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { type Commitment, Connection } from '@solana/web3.js'
import { config } from '../config/config'
import { createChildLogger } from '../core/logger'
import { createFetch } from '../utils/fetch'

const fetcher = createFetch({ logger: createChildLogger('app:common:connection') })

export const connection = new Connection(config.rpc.http, {
    wsEndpoint: config.rpc.websocket,
    commitment: config.chain.commitment as Commitment,
    disableRetryOnRateLimit: true,
    fetch: fetcher,
})

export const umi = createUmi(connection).use(mplTokenMetadata())
