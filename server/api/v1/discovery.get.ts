import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { applyConditionalCache } from '../../utils/httpCache'
import { getCachedEventos, getCachedGastronomia } from '../../utils/data'
import {
  buildDiscoveryFeed,
  filterDiscoveryFeed,
  type DiscoveryFeedItem,
} from '../../utils/discovery'

const CACHE_TTL_SECONDS = 15 * 60
const ALLOWED_TYPES: DiscoveryFeedItem['type'][] = ['evento', 'gastronomia']

function parseListParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseFilters(event: H3Event): {
  types?: DiscoveryFeedItem['type'][]
  query?: string | null
  categories?: string[]
  from?: string | null
  to?: string | null
  limit?: number | null
  lat?: number | null
  lng?: number | null
  radiusMeters?: number | null
} {
  const query = getQuery(event)
  const types = parseListParam(
    query.type as string | string[] | undefined
  ).filter((value): value is DiscoveryFeedItem['type'] =>
    ALLOWED_TYPES.includes(value as DiscoveryFeedItem['type'])
  )
  const categories = parseListParam(
    query.category as string | string[] | undefined
  )
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const parsedLimit =
    typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : Number.NaN

  const latRaw = Array.isArray(query.lat) ? query.lat[0] : query.lat
  const lngRaw = Array.isArray(query.lng) ? query.lng[0] : query.lng
  const radiusRaw = Array.isArray(query.radiusMeters)
    ? query.radiusMeters[0]
    : query.radiusMeters

  const lat =
    typeof latRaw === 'string' ? Number.parseFloat(latRaw) : Number.NaN
  const lng =
    typeof lngRaw === 'string' ? Number.parseFloat(lngRaw) : Number.NaN
  const radiusMeters =
    typeof radiusRaw === 'string' ? Number.parseFloat(radiusRaw) : Number.NaN

  return {
    types: types.length ? types : undefined,
    categories: categories.length ? categories : undefined,
    query: typeof query.q === 'string' ? query.q : null,
    from: typeof query.from === 'string' ? query.from : null,
    to: typeof query.to === 'string' ? query.to : null,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    radiusMeters: Number.isFinite(radiusMeters) ? radiusMeters : null,
  }
}

export default defineEventHandler(async (event) => {
  const filters = parseFilters(event)
  const [eventos, places] = await Promise.all([
    getCachedEventos(),
    getCachedGastronomia(),
  ])

  const feed = buildDiscoveryFeed(eventos, places)
  const payload = {
    status: 'success',
    ...filterDiscoveryFeed(feed, filters),
  }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: CACHE_TTL_SECONDS,
      payload,
      lastModified: feed.generatedAt,
    })
  ) {
    return null
  }

  return payload
})
