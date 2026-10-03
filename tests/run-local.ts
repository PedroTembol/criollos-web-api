import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Bun and Vitest mocks are different APIs. Explicit selection also keeps the
// opt-in tests/api.spec.ts production checks out of every local quality gate.
const directory = new URL('../test/', import.meta.url)
const tests = readdirSync(directory)
  .filter((name) => /\.test\.ts$/.test(name))
  .map((name) => join(directory.pathname, name))
for (const path of tests) {
  if (!/from ['"](?:bun:test|vitest)['"]/.test(readFileSync(path, 'utf8'))) {
    throw new Error(`Unregistered local test runner: ${path}`)
  }
}
const files = tests
  .filter((path) => /from ['"]bun:test['"]/.test(readFileSync(path, 'utf8')))
  .sort()

if (!files.length) throw new Error('No local Bun tests found')
const result = Bun.spawnSync([process.execPath, 'test', ...files], {
  stdout: 'inherit',
  stderr: 'inherit',
  env: { ...process.env, CRIOLLOS_LIVE_TESTS: '0' },
})
process.exit(result.exitCode)
