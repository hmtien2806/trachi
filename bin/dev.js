#!/usr/bin/env node
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('ts-node/esm', pathToFileURL('./'))

import('../src/index.js').catch((error) => {
    throw error
})
