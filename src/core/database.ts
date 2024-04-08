import { DataSource } from 'typeorm'
import { config } from '../config/config'
import { DatabaseLogger } from '../utils/databases/logger'
import { NamingStrategy } from '../utils/databases/naming-strategy'
import { appPath } from '../utils/path'
import { createChildLogger } from './logger'

const logger = createChildLogger('core:database')

export const datasource = new DataSource({
    ...config.database,
    type: 'better-sqlite3',
    entities: [appPath('entities/*.{js,ts}')],
    logger: new DatabaseLogger(logger, config.database.logging),
    namingStrategy: new NamingStrategy(),
})

export async function connect() {
    const stop = logger.createLoading().start('Initializing database connection...')

    await datasource.initialize().then(() => {
        return stop('Initialized database connection')
    })

    return datasource
}

export const database = await connect()
