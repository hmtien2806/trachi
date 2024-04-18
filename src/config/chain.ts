import { z } from 'zod'

const schema = z.object({
    wsolPool: z.string().default('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'),
    commitment: z.string().default('confirmed'),
})

export const chain = schema.default({})
