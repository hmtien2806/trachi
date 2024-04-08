import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isInProduction } from '@kdt310722/utils/node'

export const rootPath = (...paths: string[]) => {
    let current = resolve(dirname(fileURLToPath(import.meta.url)))

    while (!existsSync(resolve(current, 'package.json'))) {
        current = dirname(current)
    }

    return resolve(current, ...paths)
}

export const appPath = (...paths: string[]) => rootPath(isInProduction() ? 'dist' : 'src', ...paths)

export const storagePath = (...paths: string[]) => rootPath('storage', ...paths)

export const logsPath = (...paths: string[]) => storagePath('logs', ...paths)

export const databasePath = (...paths: string[]) => storagePath('database', ...paths)
