import { describe, expect, test } from 'bun:test'
import {
  BETA_SIGNUP_RETENTION_SECONDS,
  createBetaSignupStore,
  registerBetaSignup,
  validateBetaSignup,
} from '../server/utils/betaSignup'

describe('durable beta intake', () => {
  test('validates and normalizes input without trusting client time', () => {
    const now = new Date('2026-10-03T13:00:00Z')
    expect(
      validateBetaSignup(
        { email: ' Person@Example.com ', platform: 'ios', date: 'fake' },
        now
      )
    ).toEqual({
      email: 'person@example.com',
      platform: 'ios',
      createdAt: now.toISOString(),
    })
    for (const input of [
      null,
      {},
      { email: 'bad' },
      { email: 'a@b.c', platform: 'unsupported' },
      { email: `${'a'.repeat(254)}@b.c` },
    ]) {
      expect(() => validateBetaSignup(input)).toThrow()
    }
  })
  test('reports unavailability when storage is absent or write fails', async () => {
    expect(createBetaSignupStore({})).toBeNull()
    await expect(
      registerBetaSignup({ email: 'a@example.com' }, null)
    ).rejects.toMatchObject({ statusCode: 503 })
    await expect(
      registerBetaSignup(
        { email: 'a@example.com' },
        {
          read: async () => null,
          write: async () => {
            throw new Error('local fixture failure')
          },
        }
      )
    ).rejects.toMatchObject({ statusCode: 503 })
  })
  test('awaits durable write and deduplicates normalized emails without PII in keys', async () => {
    const values = new Map<string, string>()
    let writes = 0
    let retention = 0
    const store = createBetaSignupStore({
      get: async (key: string) =>
        values.has(key) ? JSON.parse(values.get(key)!) : null,
      put: async (
        key: string,
        value: string,
        options: { expirationTtl: number }
      ) => {
        retention = options.expirationTtl
        await Promise.resolve()
        values.set(key, value)
        writes++
      },
    })!
    expect(
      await registerBetaSignup(
        { email: 'A@example.com', platform: 'android' },
        store
      )
    ).toMatchObject({ ok: true, persisted: true })
    expect(values.size).toBe(1)
    expect(retention).toBe(7776000)
    expect(retention).toBe(BETA_SIGNUP_RETENTION_SECONDS)
    expect(
      await registerBetaSignup({ email: ' a@example.com ' }, store)
    ).toMatchObject({ persisted: true })
    expect(writes).toBe(1)
    expect([...values.keys()][0]).not.toContain('example.com')
    expect(JSON.parse([...values.values()][0]).platform).toBe('android')
  })
})
