import { describe, expect, test } from 'bun:test'
import type { H3Event } from 'h3'
import auth from '../server/middleware/auth'

const event = (method: string, url: string, key?: string) =>
  ({
    node: { req: { method, url, headers: key ? { 'x-api-key': key } : {} } },
  }) as H3Event

async function withKeys(keys: string, operation: () => Promise<void>) {
  const prior = process.env.CRIOLLOS_API_KEYS
  process.env.CRIOLLOS_API_KEYS = keys
  try {
    await operation()
  } finally {
    if (prior === undefined) delete process.env.CRIOLLOS_API_KEYS
    else process.env.CRIOLLOS_API_KEYS = prior
  }
}

describe('authentication middleware', () => {
  test('anonymous public transport reads still work without a configured key', async () => {
    await withKeys('', async () => {
      expect(await auth(event('GET', '/api/v1/tracking'))).toBeUndefined()
      expect(
        await auth(event('HEAD', '/api/v1/routes/21/stops'))
      ).toBeUndefined()
      expect(await auth(event('GET', '/'))).toBeUndefined()
    })
  })
  test('writes fail closed when protected access is unconfigured', async () => {
    await withKeys('', async () => {
      expect(await auth(event('POST', '/api/v1/beta'))).toBeUndefined()
      await expect(
        auth(event('POST', '/api/v1/eventos'))
      ).rejects.toMatchObject({ statusCode: 503 })
    })
  })
  test('feedback, admin and unknown child routes require a valid configured key', async () => {
    await withKeys('fixture-only-key', async () => {
      for (const [method, path] of [
        ['POST', '/api/v1/feedback'],
        ['GET', '/api/v1/admin'],
        ['GET', '/api/v1/eventos/admin'],
      ]) {
        await expect(auth(event(method, path))).rejects.toMatchObject({
          statusCode: 401,
        })
        await expect(
          auth(event(method, path, 'wrong-fixture'))
        ).rejects.toMatchObject({ statusCode: 403 })
        expect(
          await auth(event(method, path, 'fixture-only-key'))
        ).toBeUndefined()
      }
    })
  })
})
