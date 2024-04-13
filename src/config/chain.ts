import { z } from 'zod'

const schema = z.object({
    wsolPool: z.string().default('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'),
    commitment: z.string().default('confirmed'),
    maxRecentBlockHashes: z.number().default(300),
    maxBlocksForTransaction: z.number().default(2),
})

export const chain = schema.default({})
