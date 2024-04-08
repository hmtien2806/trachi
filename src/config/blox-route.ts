import { MAINNET_API_UK_HTTP } from '@bloxroute/solana-trader-client-ts'
import { z } from 'zod'

export const bloXRoute = z.object({
    url: z.string().default(MAINNET_API_UK_HTTP),
    token: z.string(),
    tipAccount: z.string().default('HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY'),
})
