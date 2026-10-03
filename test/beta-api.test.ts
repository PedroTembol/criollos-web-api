import { describe, expect, it, vi } from 'vitest'
import * as h3 from 'h3'
import beta from '../server/api/v1/beta.post'
import auth from '../server/middleware/auth'
import { BETA_SIGNUP_RETENTION_SECONDS } from '../server/utils/betaSignup'

const fakeSignup = { email: 'integration@example.invalid', platform: 'ios' }
let client = 0

function fixture(binding?: unknown, contextKey = 'cloudflare') {
  const app = h3.createApp({ debug: false })
  app.use(
    h3.defineEventHandler((event) => {
      event.context[contextKey] = { env: { BETA_SIGNUPS: binding } }
    })
  )
  app.use(auth)
  app.use('/api/v1/beta', beta)
  const handler = h3.toWebHandler(app)
  return (
    body: unknown = fakeSignup,
    options: {
      ip?: string
      contentType?: string
      method?: string
    } = {}
  ) =>
    handler(
      new Request('http://localhost/api/v1/beta', {
        method: options.method ?? 'POST',
        headers: {
          'content-type': options.contentType ?? 'application/json',
          'cf-connecting-ip': options.ip ?? `192.0.2.${++client}`,
        },
        ...(options.method === 'GET'
          ? {}
          : {
              body: typeof body === 'string' ? body : JSON.stringify(body),
            }),
      })
    )
}

function fakeKV() {
  const records = new Map<string, string>()
  return {
    records,
    get: vi.fn(async (key: string) => {
      const value = records.get(key)
      return value ? JSON.parse(value) : null
    }),
    put: vi.fn(async (key: string, value: string, _options: unknown) => {
      records.set(key, value)
    }),
  }
}

describe('beta public route with isolated storage', () => {
  it('confirms success only after one durable write with a 90-day expiration', async () => {
    const kv = fakeKV()
    const request = fixture(kv)
    const response = await request()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ ok: true, persisted: true })
    expect(kv.put).toHaveBeenCalledOnce()
    const [key, raw, options] = kv.put.mock.calls[0]
    expect(key).toMatch(/^beta:v1:[a-f0-9]{64}$/)
    expect(key).not.toContain(fakeSignup.email)
    expect(JSON.parse(raw)).toMatchObject(fakeSignup)
    expect(options).toEqual({ expirationTtl: BETA_SIGNUP_RETENTION_SECONDS })
    expect(await (await request()).json()).toMatchObject({ persisted: true })
    expect(kv.put).toHaveBeenCalledOnce()
  })

  it('does not expose saved records through an anonymous GET', async () => {
    const kv = fakeKV()
    const response = await fixture(kv)(undefined, { method: 'GET' })
    expect([401, 503]).toContain(response.status)
    expect(kv.get).not.toHaveBeenCalled()
    expect(kv.put).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    {
      get: async () => null,
      put: async () => {
        throw new Error('fixture persistence failure')
      },
    },
  ])(
    'rejects unavailable storage without pretending to persist',
    async (kv) => {
      const response = await fixture(kv)()
      expect(response.status).toBe(503)
      expect(await response.json()).not.toMatchObject({ persisted: true })
    }
  )

  it('supports the platform context used by Pages adapters', async () => {
    const kv = fakeKV()
    const app = h3.createApp({ debug: false })
    app.use(
      h3.defineEventHandler((event) => {
        event.context._platform = { cloudflare: { env: { BETA_SIGNUPS: kv } } }
      })
    )
    app.use('/api/v1/beta', beta)
    const response = await h3.toWebHandler(app)(
      new Request('http://localhost/api/v1/beta', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': `192.0.2.${++client}`,
        },
        body: JSON.stringify(fakeSignup),
      })
    )
    expect(response.status).toBe(200)
    expect(kv.put).toHaveBeenCalledOnce()
  })

  it.each([
    ['{broken', 'application/json', 400],
    [{ email: 'invalid' }, 'application/json', 400],
    ['x'.repeat(1025), 'application/json', 413],
    [fakeSignup, 'text/plain', 415],
  ])(
    'validates bodies before attempting storage',
    async (body, contentType, status) => {
      const kv = fakeKV()
      const response = await fixture(kv)(body, { contentType })
      expect(response.status).toBe(status)
      expect(kv.put).not.toHaveBeenCalled()
    }
  )

  it('limits invalid attempts before body handling and advertises retry delay', async () => {
    const kv = fakeKV()
    const request = fixture(kv)
    const ip = '198.51.100.250'
    for (let attempt = 0; attempt < 5; attempt++)
      expect((await request('{broken', { ip })).status).toBe(400)
    const response = await request(fakeSignup, { ip })
    expect(response.status).toBe(429)
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(kv.put).not.toHaveBeenCalled()
  })
})
