import {
  defineEventHandler,
  getQuery,
  setHeader,
  createError,
  type H3Event,
} from 'h3'
import { buildEventosCalendar } from '../../utils/calendar'
import { filterEventosFeed, type EventosFeedFilters } from '../../utils/eventos'
import { getEventosFeed } from '../../utils/data'
import { getFeedMetadata, feedCacheMaxAge } from '../../utils/feedMetadata'
import { applyConditionalCache } from '../../utils/httpCache'

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

export default defineEventHandler(async (event) => {
  const filters = parseFilters(event)
  const reminderMinutesBefore = parseReminderMinutes(event)
  const snapshot = await getEventosFeed()
  const metadata = getFeedMetadata(snapshot)
  if (metadata.state === 'unavailable') {
    throw createError({
      statusCode: 503,
      statusMessage: 'Agenda source unavailable',
    })
  }
  const filtered = filterEventosFeed(snapshot.data, filters)
  const datedEvents = filtered.data.filter((item) => Boolean(item.publishedAt))
  const queryString = getQuery(event)
  const currentUrl = new URL(event.path.split('?')[0], 'https://criollos.app')

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
    generatedAt: new Date(snapshot.fetchedAt!),
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
  setHeader(event, 'x-criollos-source-state', metadata.state)
  if (
    applyConditionalCache(event, {
      maxAgeSeconds: feedCacheMaxAge(metadata, CACHE_TTL_SECONDS),
      payload: calendar,
      lastModified: snapshot.fetchedAt,
    })
  )
    return null

  return calendar
})
