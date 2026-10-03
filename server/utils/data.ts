import { getCachedJson, setCachedJson, withCacheLock } from './cache'
import {
  scrapeEventosFeed,
  scrapeGastronomiaFeed,
  type Evento,
  type GastronomiaPlace,
  type ScrapeResult,
} from './scraper'
import { getBootstrapData } from './bootstrap'
import { resolveVenue } from './venueResolver'

const CACHE_TTL_SECONDS = 60 * 60
const FAILURE_RETRY_SECONDS = 60
const LAST_GOOD_TTL_SECONDS = 24 * 60 * 60

export interface FeedSnapshot<T> {
  data: T[]
  sourceUrl: string
  fetchedAt: string | null
  lastAttemptAt: string
  lastSuccessAt: string | null
  stale: boolean
  staleReason: string | null
  complete: boolean
  pagesFetched: number
  pagesDiscovered: number
}

/** A partial refresh must never replace a known complete catalog. */
export function buildFeedSnapshot<T>(
  result: ScrapeResult<T>,
  lastGood: FeedSnapshot<T> | null,
  attemptedAt: string
): FeedSnapshot<T> {
  if (!result.complete && lastGood) {
    return {
      ...lastGood,
      lastAttemptAt: attemptedAt,
      stale: true,
      staleReason: result.error || 'Source refresh incomplete',
    }
  }

  return {
    data: result.data,
    sourceUrl: result.sourceUrl,
    fetchedAt: result.fetchedAt,
    lastAttemptAt: attemptedAt,
    lastSuccessAt: result.complete ? result.fetchedAt : null,
    stale: !result.complete,
    staleReason: result.error,
    complete: result.complete,
    pagesFetched: result.pagesFetched,
    pagesDiscovered: result.pagesDiscovered,
  }
}

async function enrich<T extends Evento | GastronomiaPlace>(
  data: T[]
): Promise<T[]> {
  if (!data.length) return data
  try {
    const bootstrap = await getBootstrapData()
    return data.map((item) => {
      const venue = 'venue' in item ? item.venue || item.title : item.title
      const resolved = resolveVenue(venue, bootstrap)
      return {
        ...item,
        lat: resolved.lat,
        lng: resolved.lng,
        markerId: resolved.markerId,
      }
    })
  } catch {
    // Source text remains useful even when the separate transport catalog fails.
    return data
  }
}

async function getFeed<T extends Evento | GastronomiaPlace>(
  source: 'eventos' | 'gastronomia',
  scraper: () => Promise<ScrapeResult<T>>
): Promise<FeedSnapshot<T>> {
  // Versioned keys prevent legacy bare arrays from claiming a known fetch time.
  const key = `${source}:visitacaguas:snapshot:v1`
  const lastGoodKey = `${key}:last-good`
  const cached = await getCachedJson<FeedSnapshot<T>>(key)
  if (cached) return cached

  return withCacheLock(key, async () => {
    const fromCache = await getCachedJson<FeedSnapshot<T>>(key)
    if (fromCache) return fromCache

    const lastGood = await getCachedJson<FeedSnapshot<T>>(lastGoodKey)
    const attemptedAt = new Date().toISOString()
    let result: ScrapeResult<T>
    try {
      result = await scraper()
    } catch {
      result = {
        data: [],
        sourceUrl:
          lastGood?.sourceUrl ||
          (source === 'eventos'
            ? 'https://visitacaguas.net/eventos'
            : 'https://visitacaguas.net/'),
        fetchedAt: null,
        complete: false,
        error: 'Source refresh failed',
        pagesFetched: 0,
        pagesDiscovered: 1,
      }
    }
    if (result.complete || !lastGood) result.data = await enrich(result.data)
    const snapshot = buildFeedSnapshot(result, lastGood, attemptedAt)
    if (result.complete) {
      await setCachedJson(lastGoodKey, snapshot, LAST_GOOD_TTL_SECONDS)
    }
    await setCachedJson(
      key,
      snapshot,
      result.complete ? CACHE_TTL_SECONDS : FAILURE_RETRY_SECONDS
    )
    return snapshot
  })
}

export function getEventosFeed(): Promise<FeedSnapshot<Evento>> {
  return getFeed('eventos', scrapeEventosFeed)
}

export function getGastronomiaFeed(): Promise<FeedSnapshot<GastronomiaPlace>> {
  return getFeed('gastronomia', scrapeGastronomiaFeed)
}

export async function getCachedEventos(): Promise<Evento[]> {
  return (await getEventosFeed()).data
}

export async function getCachedGastronomia(): Promise<GastronomiaPlace[]> {
  return (await getGastronomiaFeed()).data
}
