import { z } from 'zod'

export const accessToken = z.object({
    life: z.number().int().positive().default(12 * 60 * 60),
    secret: z.string().default('this is a secret key'),
})

export const register = z.object({
    enabled: z.boolean().default(false),
    token: z.string().default('i-want-to-register-123'),
})

const schema = z.object({
    accessToken: accessToken.default({}),
    register: register.default({}),
})

export const auth = schema.default({})
