import { defineEventHandler, getQuery, setHeader, type H3Event } from 'h3'
import { getCachedJson, setCachedJson, withCacheLock } from '../../utils/cache'
import { buildEventosCalendar } from '../../utils/calendar'
import { filterEventosFeed, type EventosFeedFilters } from '../../utils/eventos'
import { scrapeEventos, type Evento } from '../../utils/scraper'

const CACHE_KEY = 'eventos:visitacaguas'
const CACHE_TTL_SECONDS = 60 * 60

function parseListParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseIntegerParam(
  value: string | string[] | undefined
): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || raw.trim() === '') return null

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseFilters(event: H3Event): EventosFeedFilters {
  const query = getQuery(event)
  const parsedLimit = parseIntegerParam(
    query.limit as string | string[] | undefined
  )

  return {
    categories: parseListParam(query.category as string | string[] | undefined),
    query: typeof query.q === 'string' ? query.q : null,
    from: typeof query.from === 'string' ? query.from : null,
    to: typeof query.to === 'string' ? query.to : null,
    limit: parsedLimit,
  }
}

function parseReminderMinutes(event: H3Event): number | null | undefined {
  const query = getQuery(event)
  const parsed = parseIntegerParam(
    query.reminderMinutesBefore as string | string[] | undefined
  )

  if (parsed === null) return undefined
  if (parsed <= 0) return null
  return Math.min(parsed, 7 * 24 * 60)
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
  const reminderMinutesBefore = parseReminderMinutes(event)
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
      'Export filtrado de la agenda cultural pública de Caguas con recordatorios Criollos.',
    calendarUrl: currentUrl.toString(),
    reminderMinutesBefore,
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
