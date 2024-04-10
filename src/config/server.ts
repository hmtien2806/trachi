import { z } from 'zod'

const schema = z.object({
    host: z.string().ip().default('127.0.0.1'),
    port: z.number().default(6688),
    batchSize: z.number().int().positive().default(100),
    maxRequestsPerSecond: z.number().int().positive().default(100),
    corsOrigins: z.string().default('*'),
    proxyCount: z.number().int().nonnegative().default(1),
})

export const server = schema.default({})
