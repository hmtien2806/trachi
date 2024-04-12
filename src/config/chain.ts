import { z } from 'zod'

const schema = z.object({
    wsolPool: z.string().default('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'),
    commitment: z.string().default('confirmed'),
    maxRecentBlockHashes: z.number().default(145),
})

export const chain = schema.default({})
