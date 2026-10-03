import { defineEventHandler, getQuery } from 'h3'
import { filterGastronomiaFeed } from '../../utils/gastronomia'
import { applyConditionalCache } from '../../utils/httpCache'
import { getGastronomiaFeed } from '../../utils/data'

import { getFeedMetadata, feedCacheMaxAge } from '../../utils/feedMetadata'

const CACHE_TTL_SECONDS = 60 * 60

function parseListParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categories = parseListParam(
    query.category as string | string[] | undefined
  )
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const parsedLimit =
    typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : Number.NaN

  const filters = {
    categories: categories.length ? categories : undefined,
    query: typeof query.q === 'string' ? query.q : null,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
  }

  const snapshot = await getGastronomiaFeed()
  const metadata = getFeedMetadata(snapshot)
  const filtered = filterGastronomiaFeed(snapshot.data, filters)
  const payload = {
    status: 'success',
    count: filtered.count,
    data: filtered.data,
    summary: filtered.summary,
    metadata,
  }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: feedCacheMaxAge(metadata, CACHE_TTL_SECONDS),
      payload,
      lastModified: snapshot.fetchedAt,
    })
  ) {
    return null
  }

  return payload
})
