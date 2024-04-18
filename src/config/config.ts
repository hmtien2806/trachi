import { createConfig } from '../core/config'
import { auth } from './auth'
import { chain } from './chain'
import { database } from './database'
import { logger } from './logger'
import { rpc } from './rpc'
import { server } from './server'

export const config = createConfig({
    chain,
    rpc,
    server,
    database,
    logger,
    auth,
})
