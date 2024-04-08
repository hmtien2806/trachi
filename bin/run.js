#!/usr/bin/env -S NODE_ENV=production node
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('extensionless', pathToFileURL('./'))

import('../dist/index').catch((error) => {
    throw error
})
