import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { applyConditionalCache } from '../../utils/httpCache'
import { filterEventosFeed, type EventosFeedFilters } from '../../utils/eventos'
import { getCachedEventos } from '../../utils/data'
import { type Evento } from '../../utils/scraper'

const CACHE_TTL_SECONDS = 60 * 60

function parseListParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseFilters(event: H3Event): EventosFeedFilters {
  const query = getQuery(event)
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const parsedLimit =
    typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : Number.NaN

  return {
    categories: parseListParam(query.category as string | string[] | undefined),
    query: typeof query.q === 'string' ? query.q : null,
    from: typeof query.from === 'string' ? query.from : null,
    to: typeof query.to === 'string' ? query.to : null,
    limit: Number.isFinite(parsedLimit) ? parsedLimit : null,
  }
}

export default defineEventHandler(async (event) => {
  const filters = parseFilters(event)
  const cachedEventos = await getCachedEventos()

  const payload = {
    status: 'success',
    ...filterEventosFeed(cachedEventos, filters),
  }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: CACHE_TTL_SECONDS,
      payload,
      lastModified: cachedEventos[0]?.publishedAt,
    })
  ) {
    return null
  }

  return payload
})
