import { beforeEach, describe, it, expect, vi } from 'vitest'
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
  vi.mocked(getBootstrapData).mockResolvedValue({
    positions: [{}],
    fetchedAt,
  } as any)
  vi.mocked(getEventosFeed).mockResolvedValue(successfulFeed() as any)
  vi.mocked(getGastronomiaFeed).mockResolvedValue(successfulFeed() as any)
})

describe('Health Service', () => {
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
