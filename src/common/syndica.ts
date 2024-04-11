import { highlight } from '@kdt310722/logger'
import { SyndicaChainStream } from '@kdt310722/syndica-chainstream-sdk'
import { join } from '@kdt310722/utils/buffer'
import { config } from '../config/config'
import { createChildLogger } from '../core/logger'

const logger = createChildLogger('app:common:syndica')

const client = new SyndicaChainStream(config.syndica.apiKey, {
    autoConnect: false,
})

client.on('error', (error) => {
    throw error
})

client.on('open', () => {
    logger.info('Connected to Syndica chainstream server')
})

client.on('close', (code, reason) => {
    logger.info(`Disconnected from Syndica chainstream server: ${highlight(code.toString())} - ${highlight(reason.length > 0 ? reason : 'No reason')}`)
})

client.on('reconnect', (attempt) => {
    logger.warn(`Reconnecting to Syndica chainstream server (attempt ${highlight(attempt.toString())})...`)
})

client.on('reconnect-failed', () => {
    throw new Error('Failed to reconnect to Syndica chainstream server')
})

client.on('notify', (method, params) => {
    logger.info(`Received notification from Syndica chainstream server: ${highlight(method)} ${highlight(JSON.stringify(params))}`)
})

client.on('rpc-error', (error) => {
    logger.warn(`Client error`, error)
})

client.on('unknown-message', (message) => {
    logger.warn('Received unknown message from chainstream server', join(message))
})

export const syndica = client
