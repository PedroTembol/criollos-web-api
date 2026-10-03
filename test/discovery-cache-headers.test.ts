import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import * as h3 from 'h3'
import { getAppConfig } from '../server/utils/config'
import { globalSearch } from '../server/utils/search'

vi.mock('../server/utils/search', () => ({ globalSearch: vi.fn() }))
vi.mock('../server/utils/bootstrap', () => ({ getBootstrapData: vi.fn() }))
vi.mock('../server/utils/data', () => ({
  getCachedEventos: vi.fn(),
  getCachedGastronomia: vi.fn(),
}))

let runtimeConfig: Record<string, unknown> = {}
let handlers: { name: string; handler: h3.EventHandler; revalidate: number }[]

beforeAll(async () => {
  // Supply Nitro's auto-imports while executing the real handlers outside Nuxt.
  for (const name of [
    'defineEventHandler',
    'getQuery',
    'setResponseHeader',
    'createError',
  ] as const) {
    vi.stubGlobal(name, h3[name])
  }
  vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
  handlers = [
    {
      name: 'assistant',
      handler: (await import('../server/api/v1/assistant.get')).default,
      revalidate: 30,
    },
    {
      name: 'search',
      handler: (await import('../server/api/v1/search.get')).default,
      revalidate: 30,
    },
    {
      name: 'proactive recommendations',
      handler: (await import('../server/api/v1/proactive-recommendations.get'))
        .default,
      revalidate: 60,
    },
  ]
})

beforeEach(() => {
  runtimeConfig = {}
  vi.mocked(globalSearch).mockResolvedValue({
    results: [
      {
        type: 'gastronomia',
        id: 'fixture-cafe',
        title: 'Cafe de Prueba',
        subtitle: 'Cafe local',
        link: '/gastronomia',
      },
    ],
    nearbyEnabled: false,
  } as Awaited<ReturnType<typeof globalSearch>>)
})

afterEach(() => vi.unstubAllEnvs())
afterAll(() => vi.unstubAllGlobals())

async function request(handler: h3.EventHandler) {
  const app = h3.createApp({ debug: false })
  app.use('/', handler)
  return h3.toWebHandler(app)(new Request('http://localhost/?q=cafe'))
}

describe('discovery cache TTL configuration', () => {
  it('supplies the default when Nitro runtime configuration omits the TTL', () => {
    expect(getAppConfig().cacheTtlDiscovery).toBe(900)
  })

  it('falls back to the default for malformed runtime TTL', () => {
    runtimeConfig = { cacheTtlDiscovery: 'invalid' }
    expect(getAppConfig().cacheTtlDiscovery).toBe(900)
  })

  it('reads the isolated environment override outside Nitro', () => {
    vi.stubEnv('CRIOLLOS_CACHE_TTL_DISCOVERY', '1200')
    vi.stubGlobal('useRuntimeConfig', () => {
      throw new Error('No Nitro runtime')
    })
    expect(getAppConfig().cacheTtlDiscovery).toBe(1200)
    vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
  })
})

describe('discovery response cache headers', () => {
  for (const name of ['assistant', 'search', 'proactive recommendations']) {
    it(`${name} emits a valid default cache header`, async () => {
      const { handler, revalidate } = handlers.find(
        (item) => item.name === name
      )!
      const response = await request(handler)
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe(
        `public, max-age=900, stale-while-revalidate=${revalidate}`
      )
      expect((await response.json()).status).toBe('success')
    })

    it(`${name} honors the configured discovery TTL`, async () => {
      runtimeConfig = { cacheTtlDiscovery: '1200' }
      const { handler, revalidate } = handlers.find(
        (item) => item.name === name
      )!
      const response = await request(handler)
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe(
        `public, max-age=1200, stale-while-revalidate=${revalidate}`
      )
    })
  }
})
