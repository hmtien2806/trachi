import { LogLevel, type Logger } from '@kdt310722/logger'
import { notUndefined } from '@kdt310722/utils/common'
import { filterByValue, isEmptyObject, omit } from '@kdt310722/utils/object'
import type { LogLevel as DatabaseLogLevel, LogMessage, LoggerOptions } from 'typeorm'
import { AbstractLogger } from 'typeorm'

export const levels = <const>{
    'query': LogLevel.DEBUG,
    'query-error': LogLevel.ERROR,
    'query-slow': LogLevel.WARN,
    'schema': LogLevel.INFO,
    'schema-build': LogLevel.DEBUG,
    'error': LogLevel.ERROR,
    'warn': LogLevel.WARN,
    'info': LogLevel.DEBUG,
    'log': LogLevel.INFO,
    'migration': LogLevel.INFO,
}

export class DatabaseLogger extends AbstractLogger {
    public constructor(protected readonly logger: Logger, options?: LoggerOptions) {
        super(options)
    }

    protected override writeLog(level: DatabaseLogLevel, message: LogMessage | string | number) {
        const messages = this.prepareLogMessages(message)

        for (const msg of messages) {
            const logType = msg.type ?? level
            const context = filterByValue(omit(msg, 'type', 'prefix', 'message', 'format'), notUndefined)

            this.logger.log(levels[logType] ?? LogLevel.INFO, `[${String(logType).toUpperCase()}] ${msg.message}`, ...(isEmptyObject(context) ? [] : [context]))
        }
    }
}
