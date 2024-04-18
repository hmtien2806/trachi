import { type Logger, context } from '@kdt310722/logger'
import { tap } from '@kdt310722/utils/function'
import { pick, resolveNestedOptions } from '@kdt310722/utils/object'
import { withRetry, withTimeout } from '@kdt310722/utils/promise'

export interface RetryOptions {
    delay?: number
    attempts?: number
}

export interface FetchOptions {
    timeout?: number
    retry?: RetryOptions | boolean
    headers?: Record<string, string>
    logger?: Logger
}

let incrementId = 0

export function createFetch(options: FetchOptions = {}) {
    const { delay = 0, attempts = 3 } = resolveNestedOptions(options.retry ?? true) || { delay: 0, attempts: 0 }
    const { timeout = 10_000, logger, headers = {} } = options

    return async (input: Request | URL | string, init: RequestInit = {}, requestTimeout?: number): Promise<Response> => {
        init.headers = { ...headers, ...init.headers }

        const id = ++incrementId
        const timer = tap(logger?.createTimer(), () => logger?.debug('request', context(() => [{ id, input, init: init && pick(init, 'method', 'body') }])))

        const response = await withRetry(async () => withTimeout(fetch(input, init), requestTimeout ?? timeout), {
            delay,
            retries: attempts,
        })

        if (logger) {
            response.clone().text().then((body) => {
                logger.stopTimer(timer!, 'debug', 'response', context(() => [
                    { id, response: { status: response.status, body } },
                ]))
            })
        }

        return response
    }
}
