import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  noExternal: [
    'defu',
  ],
  sourcemap: true
})
