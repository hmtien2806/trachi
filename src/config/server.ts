import { z } from 'zod'

const schema = z.object({
    host: z.string().ip().default('127.0.0.1'),
    port: z.number().default(6688),
    batchSize: z.number().int().positive().default(100),
    maxRequestsPerSecond: z.number().int().positive().default(5),
    corsOrigins: z.string().default('*'),
})

export const server = schema.default({})
