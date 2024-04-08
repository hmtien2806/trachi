import { createServer } from 'node:http'
import { type Logger, highlight } from '@kdt310722/logger'
import { JsonRpcError, RpcWebSocketServer, createErrorResponse, createResponseMessage, isJsonRpcMessage, isJsonRpcRequestMessage } from '@kdt310722/rpc'
import { isArray } from '@kdt310722/utils/array'
import { tap } from '@kdt310722/utils/function'
import { type AnyObject, isObject } from '@kdt310722/utils/object'
import { createDeferred } from '@kdt310722/utils/promise'
import cors from 'cors'
import express, { text, urlencoded } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { WebSocketServer } from 'ws'
import { ZodError } from 'zod'
import { config } from '../config/config'
import { createChildLogger } from '../core/logger'
import type { Wallet } from '../entities/wallet'
import type { Context } from '../types/context'
import { authenticate } from './authenticate'

function exceptionHandler(logger: Logger, error: Error) {
    if (error instanceof ZodError) {
        return new JsonRpcError(-32_602, 'Validation Error', error.issues)
    }

    return tap(new JsonRpcError(-32_000, error.message), () => {
        logger.error('Error while processing RPC request', error)
    })
}

export type RpcMethod = (params: any, context: Context, wallet: Wallet) => Promise<any>

const methods = new Map<string, RpcMethod>()
const publicMethods = new Set<string>(['auth_login', 'auth_register'])

async function handleRequest(message: AnyObject, context: Context, logger: Logger, wallet?: Wallet) {
    if (!isJsonRpcMessage(message)) {
        return createErrorResponse(null, new JsonRpcError(-32_600, 'Invalid request'))
    }

    if (!isJsonRpcRequestMessage(message)) {
        return
    }

    const method = methods.get(message.method)

    if (!method) {
        return createErrorResponse(message.id, new JsonRpcError(-32_601, 'Method not found'))
    }

    if (!publicMethods.has(message.method) && !wallet) {
        return createErrorResponse(message.id, new JsonRpcError(-32_600, 'Unauthorized'))
    }

    try {
        return createResponseMessage(message.id, await method(message.params ?? null, context, wallet!))
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unexpected error', { cause: error })

        if (err instanceof JsonRpcError) {
            return createResponseMessage(message.id, undefined, err)
        }

        return exceptionHandler(logger, err)
    }
}

export function createRpcServer(context: Context) {
    const logger = createChildLogger('app:common:rpc')
    const loading = logger.createLoading()
    const app = express()
    const httpServer = createServer(app)
    const wsServer = new WebSocketServer({ noServer: true, path: '/' })

    const server = new RpcWebSocketServer({
        batchSize: config.server.batchSize,
        exceptionHandler: (error) => exceptionHandler(logger, error),
        onClientError: (error) => {
            logger.warn('Client error', { error })
        },
        onUnhandledError: (error) => {
            logger.error('Unhandled error', { error })
        },
    })

    wsServer.on('connection', (socket) => {
        server.handleConnection(<any>socket, { wallet: socket['wallet'] })
    })

    httpServer.on('upgrade', (request, socket, head) => {
        authenticate(request.headers.authorization?.split(' ')[1] ?? new URL(request.url ?? '', `ws://${request.headers.host}`).searchParams.get('token')).then((wallet) => {
            if (!wallet) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
                socket.destroy()

                return
            }

            wsServer.handleUpgrade(request, socket, head, (ws) => {
                wsServer.emit('connection', Object.assign(ws, { wallet }), request)
            })
        })
    })

    app.use(helmet())
    app.use(cors({ origin: config.server.corsOrigins }))
    app.use(rateLimit({ windowMs: 1000, limit: config.server.maxRequestsPerSecond, message: createErrorResponse(null, new JsonRpcError(-32_600, 'Rate limit exceeded')) }))
    app.use(text({ type: 'application/json' }))
    app.use(urlencoded({ extended: true }))

    app.post('/', async (request, response) => {
        const wallet = await authenticate(request.header('authorization')?.split(' ')[1] ?? request.query.token?.toString())

        if (!isObject(request.body) || !isArray(request.body)) {
            try {
                request.body = JSON.parse(request.body)
            } catch {
                return response.status(400).json(createErrorResponse(null, new JsonRpcError(-32_600, 'Invalid request')))
            }
        }

        if (isArray(request.body)) {
            if (request.body.length > config.server.batchSize) {
                return response.status(400).json(createErrorResponse(null, new JsonRpcError(-32_603, 'Batch size exceeded')))
            }

            return response.json(await Promise.all(request.body.map(async (message) => handleRequest(message, context, logger, wallet!))))
        }

        return response.json(await handleRequest({ ...request.query, ...request.body }, context, logger, wallet!))
    })

    app.all('/', (_, res) => res.status(405).json(createErrorResponse(null, new JsonRpcError(-32_600, 'Used HTTP Method is not allowed. POST is required'))))
    app.all('*', (_, res) => res.status(404).json(createErrorResponse(null, new JsonRpcError(-32_601, 'Not Found'))))

    // eslint-disable-next-line ts/no-unused-vars
    app.use((err: any, _: any, res: any, __: any) => {
        res.status(500).json(createErrorResponse(null, exceptionHandler(logger, err instanceof Error ? err : new Error('Unknown error', { cause: err }))))
    })

    const start = async () => {
        const stop = loading.start('Starting RPC server...')
        const isStarted = createDeferred<void>()

        httpServer.listen(config.server.port, config.server.host, () => {
            isStarted.resolve()
            stop(`RPC server is listening on ${highlight(`${config.server.host}:${config.server.port}`)}`)
        })

        await isStarted
    }

    const addRpcMethod = (name: string, handler: RpcMethod) => {
        methods.set(name, handler)
        server.addMethod(name, async (params: any, { socket }) => handler(params, context, socket['wallet']))
    }

    return Object.assign(server, { start, addRpcMethod })
}
