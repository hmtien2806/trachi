import { createConfig } from '../core/config'
import { auth } from './auth'
import { bloXRoute } from './blox-route'
import { chain } from './chain'
import { database } from './database'
import { jito } from './jito'
import { liteRpc } from './lite-rpc'
import { logger } from './logger'
import { rpc } from './rpc'
import { server } from './server'

export const config = createConfig({
    chain,
    rpc,
    jito,
    bloXRoute,
    liteRpc,
    server,
    database,
    logger,
    auth,
})
