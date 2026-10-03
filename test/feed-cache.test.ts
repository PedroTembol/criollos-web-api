import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { getEventosFeed, getGastronomiaFeed } from '../server/utils/data'
import {
  scrapeEventosFeed,
  scrapeGastronomiaFeed,
} from '../server/utils/scraper'

vi.mock('../server/utils/scraper', () => ({
  scrapeEventosFeed: vi.fn(),
  scrapeGastronomiaFeed: vi.fn(),
}))
vi.mock('../server/utils/bootstrap', () => ({
  getBootstrapData: vi.fn().mockRejectedValue(new Error('Catalog unavailable')),
}))

const source = (overrides: Record<string, unknown> = {}) => ({
  data: [{ id: 'cafe', title: 'Cafe' }],
  sourceUrl: 'https://visitacaguas.net/',
  fetchedAt: '2026-10-03T12:00:00.000Z',
  complete: true,
  error: null,
  pagesFetched: 34,
  pagesDiscovered: 34,
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-03T12:00:00.000Z'))
  ;(globalThis as any).__memoryCache = new Map()
  ;(globalThis as any).__inflightCache = new Map()
  vi.clearAllMocks()
})
afterEach(() => vi.useRealTimers())

describe('source feed snapshots', () => {
  it('keeps the source timestamp on cache hits and coalesces refreshes', async () => {
    vi.mocked(scrapeGastronomiaFeed).mockResolvedValue(source() as any)
    const [first, simultaneous] = await Promise.all([
      getGastronomiaFeed(),
      getGastronomiaFeed(),
    ])
    expect(first).toEqual(simultaneous)
    vi.advanceTimersByTime(10 * 60 * 1000)
    const cached = await getGastronomiaFeed()
    expect(cached.fetchedAt).toBe('2026-10-03T12:00:00.000Z')
    expect(cached.lastSuccessAt).toBe(cached.fetchedAt)
    expect(scrapeGastronomiaFeed).toHaveBeenCalledTimes(1)
  })

  it('preserves the complete catalog after a partial refresh, then recovers', async () => {
    vi.mocked(scrapeGastronomiaFeed).mockResolvedValueOnce(source() as any)
    await getGastronomiaFeed()
    vi.advanceTimersByTime(60 * 60 * 1000 + 1)
    vi.mocked(scrapeGastronomiaFeed).mockResolvedValueOnce(
      source({
        data: [{ id: 'different', title: 'Partial' }],
        fetchedAt: '2026-10-03T13:00:00.001Z',
        complete: false,
        error: 'Gastronomy pagination incomplete (33/34 pages)',
        pagesFetched: 33,
      }) as any
    )
    const fallback = await getGastronomiaFeed()
    expect(fallback.data[0]?.id).toBe('cafe')
    expect(fallback.stale).toBe(true)
    expect(fallback.lastSuccessAt).toBe('2026-10-03T12:00:00.000Z')
    expect(fallback.lastAttemptAt).toBe('2026-10-03T13:00:00.001Z')
    expect(fallback.staleReason).toContain('33/34')
    vi.advanceTimersByTime(60 * 1000 + 1)
    vi.mocked(scrapeGastronomiaFeed).mockResolvedValueOnce(
      source({
        fetchedAt: '2026-10-03T13:01:00.002Z',
      }) as any
    )
    const recovered = await getGastronomiaFeed()
    expect(recovered.stale).toBe(false)
    expect(recovered.lastSuccessAt).toBe('2026-10-03T13:01:00.002Z')
  })

  it('does not claim a successful fetch when the first request fails', async () => {
    vi.mocked(scrapeEventosFeed).mockResolvedValue(
      source({
        data: [],
        fetchedAt: null,
        complete: false,
        error: 'Event source unavailable',
        pagesFetched: 0,
      }) as any
    )
    const failed = await getEventosFeed()
    expect(failed.data).toEqual([])
    expect(failed.lastSuccessAt).toBeNull()
    expect(failed.fetchedAt).toBeNull()
    expect(failed.stale).toBe(true)
    // Negative cache prevents every health/UI request from hammering the source.
    await getEventosFeed()
    expect(scrapeEventosFeed).toHaveBeenCalledTimes(1)
  })

  it('expires last-known-good instead of retaining it indefinitely', async () => {
    vi.mocked(scrapeGastronomiaFeed).mockResolvedValueOnce(source() as any)
    await getGastronomiaFeed()
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)
    vi.mocked(scrapeGastronomiaFeed).mockResolvedValueOnce(
      source({
        data: [],
        fetchedAt: null,
        complete: false,
        error: 'Gastronomy source unavailable',
        pagesFetched: 0,
      }) as any
    )
    const failed = await getGastronomiaFeed()
    expect(failed.data).toEqual([])
    expect(failed.lastSuccessAt).toBeNull()
  })

  it('preserves last-known-good on unexpected parser failure without exposing error details', async () => {
    vi.mocked(scrapeGastronomiaFeed).mockResolvedValueOnce(source() as any)
    await getGastronomiaFeed()
    vi.advanceTimersByTime(60 * 60 * 1000 + 1)
    vi.mocked(scrapeGastronomiaFeed).mockRejectedValueOnce(
      new Error('Private provider context')
    )
    const fallback = await getGastronomiaFeed()
    expect(fallback.data[0]?.id).toBe('cafe')
    expect(fallback.lastSuccessAt).toBe('2026-10-03T12:00:00.000Z')
    expect(fallback.staleReason).toBe('Source refresh failed')
  })
})
