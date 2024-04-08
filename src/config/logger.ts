import { LOG_LEVEL_NAMES, LogLevel, type LogLevelName, LogRotatorFrequency } from '@kdt310722/logger'
import { isTrueLike } from '@kdt310722/utils/common'
import { isInProduction } from '@kdt310722/utils/node'
import { z } from 'zod'
import { logsPath } from '../utils/path'

const level = z.union([z.nativeEnum(LogLevel), z.enum(Object.values(LOG_LEVEL_NAMES) as [LogLevelName, ...LogLevelName[]])])

const debug = z.object({
    level: level.default(LogLevel.DEBUG),
    filter: z.string().default(process.env.LOG_DEBUG ?? '-*'),
})

const transport = z.object({ enabled: z.boolean().default(true), level: level.optional() })
const asyncTransport = transport.merge(z.object({ maxWaitTime: z.number().positive().optional() }))

const file = asyncTransport.merge(z.object({
    level: level.default(LogLevel.ERROR),
    path: z.string().default(logsPath()),
    frequency: z.nativeEnum(LogRotatorFrequency).optional(),
    dateFormat: z.string().optional(),
    maxSize: z.string().optional(),
    weekStartsOn: z.number().min(0).max(6).transform((v) => v as 0 | 1 | 2 | 3 | 4 | 5 | 6).optional(),
    extension: z.string().optional(),
}))

const telegramSendOptions = z.object({
    disableWebPagePreview: z.boolean().optional(),
    allowSendingWithoutReply: z.boolean().optional(),
    messageThreadId: z.number().optional(),
    replyToMessageId: z.number().optional(),
    disableNotification: z.boolean().optional(),
})

const telegram = asyncTransport.merge(z.object({
    level: level.default(LogLevel.ERROR),
    token: z.string(),
    chatId: z.union([z.string(), z.number()]),
    dateFormat: z.string().optional(),
    inspectOptions: z.record(z.string(), z.any()).optional(),
    sendOptions: telegramSendOptions.default({}),
}))

const schema = z.object({
    enabled: z.boolean().default(!isTrueLike(process.env.LOG_DISABLE)),
    name: z.string().optional(),
    level: level.default(isInProduction() ? LogLevel.INFO : LogLevel.TRACE),
    debug: debug.default({}),
    file: z.union([z.string(), file]).default({}),
    telegram: telegram.optional(),
})

export const logger = schema.default({})
