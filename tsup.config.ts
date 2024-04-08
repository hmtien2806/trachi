import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts', 'src/entities/*.ts'],
    format: ['esm'],
    clean: true,
    minify: true,
    shims: true,
    env: {
        NODE_ENV: 'production',
    },
})
