import { isString, trim } from '@kdt310722/utils/string'
import { type ZodTypeAny, z } from 'zod'
import { databasePath } from '../utils/path'

const logging = <ZodTypeAny>z.preprocess(
    (value) => (isString(value) ? (value === 'all' ? 'all' : value.split(',').map((i) => trim(i))) : value),
    z.union([z.literal('all'), z.enum(['query', 'schema', 'error', 'warn', 'info', 'log', 'migration']).array()]),
)

const schema = z.object({
    database: z.string().default(databasePath('app.db')),
    logging: logging.default(['error', 'warn', 'migration']),
    dropSchema: z.boolean().default(false),
    synchronize: z.boolean().default(true),
    maxQueryExecutionTime: z.number().positive().default(500),
})

export const database = schema.default({})
