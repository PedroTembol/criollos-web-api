import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as h3 from 'h3'
import { getEventosFeed, getGastronomiaFeed } from '../server/utils/data'
import { getBootstrapData } from '../server/utils/bootstrap'
import { normalizeGetAll } from '../server/utils/normalize'
import eventos from '../server/api/v1/eventos.get'
import gastronomia from '../server/api/v1/gastronomia.get'
import discovery from '../server/api/v1/discovery.get'
import recommendations from '../server/api/v1/recommendations.get'
import notifications from '../server/api/v1/notifications.get'
import calendar from '../server/api/v1/eventos/calendar.get'
import calendarAlias from '../server/routes/calendars/eventos.ics.get'

vi.mock('../server/utils/data', () => ({
  getEventosFeed: vi.fn(),
  getGastronomiaFeed: vi.fn(),
}))
vi.mock('../server/utils/bootstrap', () => ({ getBootstrapData: vi.fn() }))

const fetchedAt = '2026-10-03T12:00:00.000Z'
const event = {
  id: 'fiesta',
  title: 'Fiesta local',
  category: 'Familia',
  categories: ['Familia'],
  summary: 'Una actividad.',
  description: 'Una actividad.',
  venue: null,
  imageUrl: null,
  imageAlt: null,
  sourceUrl: 'https://visitacaguas.net/eventos',
  publishedAt: '2026-10-04T00:00:00.000Z',
  rawDate: '4 de octubre de 2026',
}
const place = {
  id: 'cafe',
  title: 'Cafe local',
  category: 'Café',
  categories: ['Café'],
  summary: 'Comida local.',
  description: 'Comida local.',
  imageUrl: null,
  imageAlt: null,
  sourceUrl: 'https://visitacaguas.net/gastronomia/1',
}
const snapshot = (data: any[], overrides = {}) => ({
  data,
  sourceUrl: 'https://visitacaguas.net/',
  fetchedAt,
  lastSuccessAt: fetchedAt,
  lastAttemptAt: fetchedAt,
  stale: false,
  staleReason: null,
  complete: true,
  pagesFetched: 1,
  pagesDiscovered: 1,
  ...overrides,
})

beforeEach(() => {
  vi.mocked(getEventosFeed).mockResolvedValue(snapshot([event]))
  vi.mocked(getGastronomiaFeed).mockResolvedValue(snapshot([place]))
  vi.mocked(getBootstrapData).mockResolvedValue({
    ...normalizeGetAll([[], [], [], [], [], []]),
    fetchedAt,
  })
})

async function request(handler: any, path = '/', headers?: HeadersInit) {
  const app = h3.createApp({ debug: false })
  app.use('/', handler)
  return h3.toWebHandler(app)(
    new Request(`http://localhost${path}`, { headers })
  )
}

describe('source state propagation through API handlers', () => {
  it('keeps an all-day event on its original date regardless of server timezone', async () => {
    const response = await request(discovery)
    const body = await response.json()
    const item = body.data.find((item: any) => item.type === 'evento')
    expect(item.eventDate).toBe('2026-10-04T00:00:00.000Z')
    expect(item.date).toContain('4')
  })

  it('serves stale gastronomia arrays with short cache and the actual source clock', async () => {
    vi.mocked(getGastronomiaFeed).mockResolvedValueOnce(
      snapshot([place], {
        stale: true,
        staleReason: 'Pagination failed',
        lastAttemptAt: '2026-10-03T13:00:00.000Z',
      })
    )
    const response = await request(gastronomia, '/?q=cafe')
    const body = await response.json()
    expect(body.data[0].id).toBe('cafe')
    expect(body.metadata.state).toBe('stale')
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(response.headers.get('last-modified')).toBe(
      new Date(fetchedAt).toUTCString()
    )
  })

  it('distinguishes unavailable agenda from a filtered empty result', async () => {
    vi.mocked(getEventosFeed).mockResolvedValueOnce(
      snapshot([], {
        fetchedAt: null,
        lastSuccessAt: null,
        stale: true,
        complete: false,
      })
    )
    const response = await request(eventos)
    const body = await response.json()
    expect(body.data).toEqual([])
    expect(body.metadata.state).toBe('unavailable')
    expect(response.headers.get('last-modified')).toBeNull()
  })

  it('keeps usable discovery when the other source is unavailable', async () => {
    vi.mocked(getEventosFeed).mockResolvedValueOnce(
      snapshot([], {
        fetchedAt: null,
        lastSuccessAt: null,
        stale: true,
        complete: false,
      })
    )
    const response = await request(discovery)
    const body = await response.json()
    expect(body.data.some((item: any) => item.type === 'gastronomia')).toBe(
      true
    )
    expect(body.metadata.state).toBe('partial')
    expect(body.metadata.lastSuccessAt).toBeNull()
    expect(body.metadata.sources.eventos.state).toBe('unavailable')
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
  })

  it('keeps food recommendations when transport fails without declaring live sources', async () => {
    vi.mocked(getBootstrapData).mockRejectedValueOnce(
      new Error('Transport unavailable')
    )
    const response = await request(recommendations)
    const body = await response.json()
    expect(body.source).toBe('partial')
    expect(body.metadata.sources.transport.state).toBe('unavailable')
    expect(body.data.some((item: any) => item.type === 'food')).toBe(true)
  })

  it('propagates source state to the notifications envelope', async () => {
    vi.mocked(getGastronomiaFeed).mockResolvedValueOnce(
      snapshot([place], { stale: true })
    )
    const response = await request(notifications)
    const body = await response.json()
    expect(body.metadata.state).toBe('stale')
    expect(body.metadata.sources.gastronomia.fetchedAt).toBe(fetchedAt)
  })

  it.each([calendar, calendarAlias])(
    'uses the same snapshot clock and stale cache for calendar exports',
    async (handler) => {
      vi.mocked(getEventosFeed).mockResolvedValueOnce(
        snapshot([event], { stale: true })
      )
      const response = await request(handler)
      const text = await response.text()
      expect(response.headers.get('content-type')).toContain('text/calendar')
      expect(response.headers.get('x-criollos-source-state')).toBe('stale')
      expect(response.headers.get('cache-control')).toBe('public, max-age=60')
      expect(text).toContain('DTSTAMP:20261003T120000Z')
      expect(text).toContain('DTSTART;VALUE=DATE:20261004')
    }
  )

  it.each([calendar, calendarAlias])(
    'rejects calendar downloads without a valid source rather than returning an empty success',
    async (handler) => {
      vi.mocked(getEventosFeed).mockResolvedValueOnce(
        snapshot([], {
          fetchedAt: null,
          lastSuccessAt: null,
          stale: true,
          complete: false,
        })
      )
      const response = await request(handler)
      expect(response.status).toBe(503)
      expect(response.headers.get('content-type')).not.toContain(
        'text/calendar'
      )
    }
  )
})
