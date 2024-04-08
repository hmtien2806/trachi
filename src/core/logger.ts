import { type ChildLoggerOptions, createDefaultLogger } from '@kdt310722/logger'
import { config } from '../config/config'

export const logger = createDefaultLogger(config.logger)

export function createChildLogger(name?: string, options?: ChildLoggerOptions) {
    return logger.child({ name, ...options })
}
