import { EOL } from 'node:os'
import { type ConfigSchema, ParseConfigError, defineConfig, isZodError } from '@kdt310722/config'
import { badge, text } from '@kdt310722/logger'
import { fromZodError } from 'zod-validation-error'

export function printError(error: any): never {
    if (error instanceof ParseConfigError && isZodError(error.cause)) {
        const err = fromZodError(error.cause, {
            maxIssuesInMessage: Number.POSITIVE_INFINITY,
            issueSeparator: '\n  + ',
            prefix: 'Invalid config:\n  + ',
            prefixSeparator: '',
            unionSeparator: '\nor ',
        })

        process.stderr.write(`${badge('Error')} ${text(err.message)}${EOL}`)
        process.exit(1)
    }

    throw error
}

export function createConfig<S extends ConfigSchema>(schema: S) {
    const config = defineConfig(schema, {
        search: { name: 'config' },
        formatError: false,
    })

    try {
        return config.parse()
    } catch (error) {
        return printError(error)
    }
}
