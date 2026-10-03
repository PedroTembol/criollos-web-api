import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { getBootstrapData } from '../../utils/bootstrap'
import { getEventosFeed, getGastronomiaFeed } from '../../utils/data'
import {
  getFeedMetadata,
  combineFeedMetadata,
  getTransportFeedMetadata,
  unavailableFeedMetadata,
  feedCacheMaxAge,
} from '../../utils/feedMetadata'
import { buildDiscoveryFeed } from '../../utils/discovery'
import { applyConditionalCache } from '../../utils/httpCache'
import {
  buildCriolloRecommendations,
  type RecommendationFilters,
  type RecommendationType,
} from '../../utils/recommendations'
import { buildTrackingSnapshot } from '../../utils/tracking'

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

export default defineEventHandler(async (event) => {
  const filters = parseFilters(event)
  const [bootstrapResult, eventosResult, gastronomiaResult] =
    await Promise.allSettled([
      getBootstrapData(null),
      getEventosFeed(),
      getGastronomiaFeed(),
    ])
  const bootstrapData =
    bootstrapResult.status === 'fulfilled' ? bootstrapResult.value : null
  const eventos =
    eventosResult.status === 'fulfilled' ? eventosResult.value : null
  const gastronomia =
    gastronomiaResult.status === 'fulfilled' ? gastronomiaResult.value : null
  const metadata = combineFeedMetadata({
    transport: getTransportFeedMetadata(bootstrapData),
    eventos: eventos
      ? getFeedMetadata(eventos)
      : unavailableFeedMetadata('https://visitacaguas.net/eventos'),
    gastronomia: gastronomia
      ? getFeedMetadata(gastronomia)
      : unavailableFeedMetadata('https://visitacaguas.net/'),
  })
  const discovery = buildDiscoveryFeed(
    eventos?.data || [],
    gastronomia?.data || []
  )
  const tracking = bootstrapData
    ? buildTrackingSnapshot(bootstrapData, bootstrapData.fetchedAt)
    : null
  const recommendations = buildCriolloRecommendations(
    { tracking, discovery },
    filters
  )
  const payload = {
    status: 'success',
    source: metadata.state,
    metadata,
    ...recommendations,
  }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: feedCacheMaxAge(metadata, RESPONSE_CACHE_TTL_SECONDS),
      payload,
      lastModified: metadata.fetchedAt,
    })
  ) {
    return null
  }

  return payload
})
