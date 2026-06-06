import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { getBootstrapData } from '../../utils/bootstrap'
import { getCachedJson, setCachedJson, withCacheLock } from '../../utils/cache'
import { buildDiscoveryFeed } from '../../utils/discovery'
import { applyConditionalCache } from '../../utils/httpCache'
import {
  buildCriolloRecommendations,
  type RecommendationFilters,
  type RecommendationType,
} from '../../utils/recommendations'
import {
  scrapeEventos,
  scrapeGastronomia,
  type Evento,
  type GastronomiaPlace,
} from '../../utils/scraper'
import { buildTrackingSnapshot } from '../../utils/tracking'

const DISCOVERY_CACHE_KEY = 'discovery:visitacaguas'
const EVENTOS_CACHE_KEY = 'eventos:visitacaguas'
const GASTRONOMIA_CACHE_KEY = 'gastronomia:visitacaguas'
const DISCOVERY_CACHE_TTL_SECONDS = 15 * 60
const SOURCE_CACHE_TTL_SECONDS = 60 * 60
const RESPONSE_CACHE_TTL_SECONDS = 5 * 60
const ALLOWED_TYPES: RecommendationType[] = [
  'service',
  'mobility',
  'plan',
  'food',
]

function parseListParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseFilters(event: H3Event): RecommendationFilters {
  const query = getQuery(event)
  const types = parseListParam(
    query.type as string | string[] | undefined
  ).filter((value): value is RecommendationType =>
    ALLOWED_TYPES.includes(value as RecommendationType)
  )
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const parsedLimit =
    typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : Number.NaN

  return {
    types: types.length ? types : undefined,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
  }
}

async function getDiscoveryFeed() {
  const cached =
    await getCachedJson<ReturnType<typeof buildDiscoveryFeed>>(
      DISCOVERY_CACHE_KEY
    )
  if (cached) {
    return cached
  }

  return withCacheLock(DISCOVERY_CACHE_KEY, async () => {
    const fromCache =
      await getCachedJson<ReturnType<typeof buildDiscoveryFeed>>(
        DISCOVERY_CACHE_KEY
      )
    if (fromCache) {
      return fromCache
    }

    const [eventos, places] = await Promise.all([
      getCachedJson<Evento[]>(EVENTOS_CACHE_KEY).then(async (cachedEventos) => {
        if (cachedEventos) return cachedEventos
        const freshEventos = await scrapeEventos()
        await setCachedJson(
          EVENTOS_CACHE_KEY,
          freshEventos,
          SOURCE_CACHE_TTL_SECONDS
        )
        return freshEventos
      }),
      getCachedJson<GastronomiaPlace[]>(GASTRONOMIA_CACHE_KEY).then(
        async (cachedPlaces) => {
          if (cachedPlaces) return cachedPlaces
          const freshPlaces = await scrapeGastronomia()
          await setCachedJson(
            GASTRONOMIA_CACHE_KEY,
            freshPlaces,
            SOURCE_CACHE_TTL_SECONDS
          )
          return freshPlaces
        }
      ),
    ])

    const feed = buildDiscoveryFeed(eventos, places)
    await setCachedJson(DISCOVERY_CACHE_KEY, feed, DISCOVERY_CACHE_TTL_SECONDS)
    return feed
  })
}

export default defineEventHandler(async (event) => {
  const filters = parseFilters(event)
  const [bootstrapData, discovery] = await Promise.all([
    getBootstrapData(null),
    getDiscoveryFeed(),
  ])
  const tracking = buildTrackingSnapshot(bootstrapData, bootstrapData.fetchedAt)
  const recommendations = buildCriolloRecommendations(
    { tracking, discovery },
    filters
  )
  const payload = {
    status: 'success',
    source: 'live',
    ...recommendations,
  }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: RESPONSE_CACHE_TTL_SECONDS,
      payload,
      lastModified: recommendations.generatedAt,
    })
  ) {
    return null
  }

  return payload
})
