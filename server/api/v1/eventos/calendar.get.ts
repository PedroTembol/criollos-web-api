import { defineEventHandler, getQuery, setHeader, type H3Event } from 'h3'
import {
  getCachedJson,
  setCachedJson,
  withCacheLock,
} from '../../../utils/cache'
import { buildEventosCalendar } from '../../../utils/calendar'
import {
  filterEventosFeed,
  type EventosFeedFilters,
} from '../../../utils/eventos'
import { scrapeEventos, type Evento } from '../../../utils/scraper'

const CACHE_KEY = 'eventos:visitacaguas'
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

async function getEventos(): Promise<Evento[]> {
  const cached = await getCachedJson<Evento[]>(CACHE_KEY)
  if (cached) return cached

  return withCacheLock(CACHE_KEY, async () => {
    const fromCache = await getCachedJson<Evento[]>(CACHE_KEY)
    if (fromCache) return fromCache

    const scraped = await scrapeEventos()
    await setCachedJson(CACHE_KEY, scraped, CACHE_TTL_SECONDS)
    return scraped
  })
}

export default defineEventHandler(async (event) => {
  const filters = parseFilters(event)
  const eventos = await getEventos()
  const filtered = filterEventosFeed(eventos, filters)
  const datedEvents = filtered.data.filter((item) => Boolean(item.publishedAt))
  const queryString = getQuery(event)
  const currentUrl = new URL(event.path, 'https://criollos.pr')

  for (const [key, value] of Object.entries(queryString)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        currentUrl.searchParams.append(key, String(entry))
      }
    } else if (value != null) {
      currentUrl.searchParams.set(key, String(value))
    }
  }

  const calendar = buildEventosCalendar(datedEvents, {
    calendarName: 'Criollos · Agenda Cultural de Caguas',
    calendarDescription:
      'Export filtrado de la agenda cultural pública de Caguas.',
    calendarUrl: currentUrl.toString(),
  })

  setHeader(event, 'content-type', 'text/calendar; charset=utf-8')
  setHeader(
    event,
    'content-disposition',
    'attachment; filename="criollos-eventos-caguas.ics"'
  )
  setHeader(event, 'cache-control', `public, max-age=${CACHE_TTL_SECONDS}`)

  return calendar
})
