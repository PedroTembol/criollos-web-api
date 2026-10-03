import { readdirSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const localTests = readdirSync('test')
  .filter((name) => /\.test\.ts$/.test(name))
  .filter((name) =>
    /from ['"]vitest['"]/.test(readFileSync(`test/${name}`, 'utf8'))
  )
  .map((name) => `test/${name}`)

export default defineConfig({
  test: {
    globals: true,
    include:
      process.env.CRIOLLOS_LIVE_TESTS === '1'
        ? ['tests/api.spec.ts']
        : localTests,
    testTimeout: 15000,
  },
})
