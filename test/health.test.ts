import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { getGlobalHealth } from '../server/utils/health'
import { getEventosFeed, getGastronomiaFeed } from '../server/utils/data'
import { getBootstrapData } from '../server/utils/bootstrap'

vi.mock('../server/utils/bootstrap', () => ({ getBootstrapData: vi.fn() }))
vi.mock('../server/utils/data', () => ({
  getEventosFeed: vi.fn(),
  getGastronomiaFeed: vi.fn(),
}))

const fetchedAt = '2026-10-03T12:00:00.000Z'
const successfulFeed = () => ({
  data: [{}],
  sourceUrl: 'https://visitacaguas.net/',
  fetchedAt,
  lastSuccessAt: fetchedAt,
  lastAttemptAt: fetchedAt,
  stale: false,
  staleReason: null,
  complete: true,
  pagesFetched: 1,
  pagesDiscovered: 1,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-03T12:01:00Z'))
  vi.mocked(getBootstrapData).mockResolvedValue({
    positions: [{ when: fetchedAt }],
    fetchedAt,
  } as any)
  vi.mocked(getEventosFeed).mockResolvedValue(successfulFeed() as any)
  vi.mocked(getGastronomiaFeed).mockResolvedValue(successfulFeed() as any)
})

afterEach(() => vi.useRealTimers())

describe('Health Service', () => {
  it.each([
    undefined,
    '',
    'invalid',
    '2026-10-03T12:00:00',
    '2026-10-03T11:58:59Z',
    '2026-10-03T12:01:00.001Z',
  ])(
    'does not declare unknown, stale or future telemetry healthy (%s)',
    async (when) => {
      vi.mocked(getBootstrapData).mockResolvedValueOnce({
        positions: [{ when }],
        fetchedAt,
      } as any)
      const health = await getGlobalHealth()
      expect(health.dependencies.transport.status).toBe('degraded')
      expect(health.dependencies.transport.lastSuccessAt).toBe(fetchedAt)
    }
  )

  it('accepts the exact 120-second boundary but reports incompatible telemetry as degraded', async () => {
    const data = { positions: [{ when: '2026-10-03T11:59:00Z' }], fetchedAt }
    vi.mocked(getBootstrapData).mockResolvedValueOnce(data as any)
    expect((await getGlobalHealth()).dependencies.transport.status).toBe(
      'healthy'
    )
    vi.mocked(getBootstrapData).mockResolvedValueOnce({
      ...data,
      telemetry: { state: 'incompatible', receivedRows: 2, rejectedRows: 1 },
    } as any)
    const health = await getGlobalHealth()
    expect(health.dependencies.transport.status).toBe('degraded')
    expect(health.dependencies.transport.message).toContain('incompatible')
  })

  it('keeps a fallback degraded even when it contains a recent signal', async () => {
    vi.mocked(getBootstrapData).mockResolvedValueOnce({
      positions: [{ when: fetchedAt }],
      fetchedAt,
      stale: true,
      staleReason: 'Upstream timeout',
    } as any)
    const health = await getGlobalHealth()
    expect(health.dependencies.transport.status).toBe('degraded')
    expect(health.dependencies.transport.message).toBe('Upstream timeout')
  })
  it('reports source success timestamps instead of the health request time', async () => {
    const health = await getGlobalHealth()
    expect(health.status).toBe('healthy')
    expect(health.dependencies.agenda.lastSuccessAt).toBe(fetchedAt)
    expect(health.dependencies.gastronomia.lastSuccessAt).toBe(fetchedAt)
  })

  it('reports stale last-known-good as degraded with its original timestamp', async () => {
    vi.mocked(getGastronomiaFeed).mockResolvedValueOnce({
      ...successfulFeed(),
      stale: true,
      staleReason: 'Gastronomy pagination incomplete (33/34 pages)',
      lastAttemptAt: '2026-10-03T13:00:00.000Z',
    } as any)
    const health = await getGlobalHealth()
    expect(health.status).toBe('degraded')
    expect(health.dependencies.gastronomia.status).toBe('degraded')
    expect(health.dependencies.gastronomia.lastSuccessAt).toBe(fetchedAt)
    expect(health.dependencies.gastronomia.message).toContain('33/34')
  })

  it('reports offline without inventing success when no valid source snapshot exists', async () => {
    vi.mocked(getEventosFeed).mockResolvedValueOnce({
      ...successfulFeed(),
      data: [],
      fetchedAt: null,
      lastSuccessAt: null,
      complete: false,
      stale: true,
      staleReason: 'Event source unavailable',
    } as any)
    const health = await getGlobalHealth()
    expect(health.status).toBe('offline')
    expect(health.dependencies.agenda.lastSuccessAt).toBeNull()
  })

  it('reports offline if a dependency unexpectedly rejects', async () => {
    vi.mocked(getEventosFeed).mockRejectedValueOnce(new Error('Failed'))
    const health = await getGlobalHealth()
    expect(health.status).toBe('offline')
    expect(health.dependencies.agenda.status).toBe('offline')
  })

  it('does not call an empty vehicle snapshot an upstream outage', async () => {
    vi.mocked(getBootstrapData).mockResolvedValueOnce({
      positions: [],
      fetchedAt,
    } as any)
    const health = await getGlobalHealth()
    expect(health.dependencies.transport.status).toBe('degraded')
    expect(health.dependencies.transport.lastSuccessAt).toBe(fetchedAt)
  })
})
