import { describe, expect, test } from 'bun:test'
import {
  combineFeedMetadata,
  feedCacheMaxAge,
  getFeedMetadata,
} from '../server/utils/feedMetadata'
import { getFeedStatus, getFeedSourceStatuses } from '../app/utils/feedStatus'

const metadata = (overrides = {}) =>
  getFeedMetadata({
    data: [{}],
    sourceUrl: 'https://visitacaguas.net/',
    fetchedAt: '2026-10-03T12:00:00.000Z',
    lastSuccessAt: '2026-10-03T12:00:00.000Z',
    lastAttemptAt: '2026-10-03T12:00:00.000Z',
    stale: false,
    staleReason: null,
    complete: true,
    pagesFetched: 1,
    pagesDiscovered: 1,
    ...overrides,
  })

describe('public feed metadata and UI copy', () => {
  test('keeps different source clocks and does not invent aggregate success', () => {
    const combined = combineFeedMetadata({
      eventos: metadata({
        data: [],
        fetchedAt: null,
        lastSuccessAt: null,
        complete: false,
        stale: true,
      }),
      gastronomia: metadata(),
    })
    expect(combined.state).toBe('partial')
    expect(combined.fetchedAt).toBe('2026-10-03T12:00:00.000Z')
    expect(combined.lastSuccessAt).toBeNull()
    expect(combined.sources.eventos?.state).toBe('unavailable')
    expect(feedCacheMaxAge(combined, 900)).toBe(60)
  })

  test('does not mark stale complete data as a fresh source', () => {
    const stale = metadata({
      stale: true,
      staleReason: 'Source refresh failed',
    })
    expect(stale.state).toBe('stale')
    expect(getFeedStatus(stale).title).toBe('Mostrando información anterior')
    expect(feedCacheMaxAge(stale, 3600)).toBe(60)
  })

  test('shows previous results on network failure without confirming current filters', () => {
    const status = getFeedStatus(metadata(), { error: true, hasData: true })
    expect(status.title).toBe('No pudimos actualizar')
    expect(status.message).toContain(
      'filtros actuales pueden no estar confirmados'
    )
  })

  test('identifies loading, unavailable and unverified response dates', () => {
    expect(getFeedStatus(undefined, { pending: true }).title).toBe(
      'Actualizando información'
    )
    expect(
      getFeedStatus(
        metadata({
          data: [],
          fetchedAt: null,
          lastSuccessAt: null,
          complete: false,
        })
      ).title
    ).toBe('Fuente no disponible')
    expect(getFeedStatus(undefined).title).toBe('Actualización sin confirmar')
  })

  test('shows individual clocks when one source is stale', () => {
    const combined = combineFeedMetadata({
      eventos: metadata({ stale: true }),
      gastronomia: metadata({
        fetchedAt: '2026-10-03T13:00:00.000Z',
        lastSuccessAt: '2026-10-03T13:00:00.000Z',
      }),
    })
    expect(combined.lastSuccessAt).toBe('2026-10-03T12:00:00.000Z')
    const sources = getFeedSourceStatuses(combined)
    expect(sources[0]?.state).toBe('Información anterior')
    expect(sources[0]?.updated).not.toBe(sources[1]?.updated)
  })
})
