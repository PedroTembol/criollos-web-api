import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as h3 from 'h3'
import positions from '../server/api/v1/vehicles/positions.get'
import alias from '../server/routes/vehicles/positions.get'
import { fetchUpstreamJson } from '../server/utils/upstream'
import { getCachedJson, setCachedJson } from '../server/utils/cache'

vi.mock('../server/utils/config', () => ({
  getAppConfig: () => ({ idClient: 151, cacheTtlPositions: 10 }),
}))
vi.mock('../server/utils/upstream', () => ({ fetchUpstreamJson: vi.fn() }))
vi.mock('../server/utils/cache', () => ({
  getCachedJson: vi.fn(),
  setCachedJson: vi.fn(),
  withCacheLock: (_key: string, callback: () => Promise<unknown>) => callback(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCachedJson).mockResolvedValue(null)
  vi.mocked(setCachedJson).mockResolvedValue(undefined)
})

async function request(handler = positions) {
  const app = h3.createApp()
  app.use('/', handler)
  return h3.toWebHandler(app)(new Request('http://localhost/'))
}

describe('position API contract', () => {
  it('returns 200 for valid empty telemetry', async () => {
    vi.mocked(fetchUpstreamJson).mockResolvedValue([])
    const response = await request()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      positions: [],
      telemetry: { state: 'empty', receivedRows: 0, rejectedRows: 0 },
    })
    expect(getCachedJson).toHaveBeenCalledWith('positions:v2:151:all')
  })

  it.each([
    { raw: { data: [] } },
    { raw: Array.from({ length: 9 }, () => [1, 'summary', 'invalid']) },
  ])(
    'reports incompatible payloads without disguising them as valid empty telemetry',
    async ({ raw }) => {
      vi.mocked(fetchUpstreamJson).mockResolvedValue(raw)
      const response = await request()
      expect(response.status).toBe(502)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toMatchObject({
        positions: [],
        telemetry: { state: 'incompatible' },
      })
    }
  )

  it('preserves incompatibility when returning an internally cached diagnostic', async () => {
    vi.mocked(getCachedJson).mockResolvedValue({
      positions: [],
      fetchedAt: '2026-10-05T13:00:00Z',
      telemetry: { state: 'incompatible', receivedRows: null, rejectedRows: 0 },
    })
    const response = await request()
    expect(response.status).toBe(502)
    expect(fetchUpstreamJson).not.toHaveBeenCalled()
  })

  it('uses the exact same handler for the legacy alias', () => {
    expect(alias).toBe(positions)
  })
})
