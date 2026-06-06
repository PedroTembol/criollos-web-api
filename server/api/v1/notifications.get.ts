import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { getBootstrapData } from '../../utils/bootstrap'
import { getCachedEventos, getCachedGastronomia } from '../../utils/data'
import { buildDiscoveryFeed } from '../../utils/discovery'
import { filterEventosFeed } from '../../utils/eventos'
import { filterGastronomiaFeed } from '../../utils/gastronomia'
import { applyConditionalCache } from '../../utils/httpCache'
import {
  buildNotificationsFeed,
  type NotificationFilters,
  type NotificationSeverity,
  type NotificationSource,
} from '../../utils/notifications'
import { buildTrackingSnapshot } from '../../utils/tracking'

const RESPONSE_CACHE_TTL_SECONDS = 60
const ALLOWED_SOURCES: NotificationSource[] = [
  'tracking',
  'eventos',
  'discovery',
  'gastronomia',
]
const ALLOWED_SEVERITIES: NotificationSeverity[] = [
  'info',
  'warning',
  'critical',
]

function parseList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseFilters(event: H3Event): NotificationFilters {
  const query = getQuery(event)
  const sources = parseList(
    query.source as string | string[] | undefined
  ).filter((value): value is NotificationSource =>
    ALLOWED_SOURCES.includes(value as NotificationSource)
  )
  const severities = parseList(
    query.severity as string | string[] | undefined
  ).filter((value): value is NotificationSeverity =>
    ALLOWED_SEVERITIES.includes(value as NotificationSeverity)
  )
  const seen = parseList(query.seen as string | string[] | undefined).slice(
    0,
    100
  )
  const limitValue = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const limit =
    typeof limitValue === 'string'
      ? Number.parseInt(limitValue, 10)
      : Number.NaN

  return {
    sources: sources.length ? sources : undefined,
    severities: severities.length ? severities : undefined,
    seen: seen.length ? seen : undefined,
    limit: Number.isFinite(limit) ? limit : null,
  }
}

export default defineEventHandler(async (event) => {
  const now = new Date()
  const [bootstrapResult, eventosResult, gastronomiaResult] =
    await Promise.allSettled([
      getBootstrapData(null),
      getCachedEventos(),
      getCachedGastronomia(),
    ])
  const bootstrap =
    bootstrapResult.status === 'fulfilled' ? bootstrapResult.value : null
  const eventos =
    eventosResult.status === 'fulfilled' ? eventosResult.value : []
  const gastronomia =
    gastronomiaResult.status === 'fulfilled' ? gastronomiaResult.value : []
  const tracking = bootstrap
    ? buildTrackingSnapshot(bootstrap, bootstrap.fetchedAt, now)
    : null
  const eventosFeed = filterEventosFeed(eventos, {}, now)
  const gastronomiaFeed = filterGastronomiaFeed(gastronomia)
  const discovery = buildDiscoveryFeed(eventos, gastronomia, now)
  const notifications = buildNotificationsFeed(
    {
      tracking: tracking?.summary.alerts,
      eventos: eventosFeed.summary.alerts,
      discovery: discovery.summary.alerts,
      gastronomia: gastronomiaFeed.summary.alerts,
      generatedAt: bootstrap?.fetchedAt ?? now.toISOString(),
    },
    parseFilters(event)
  )
  const payload = { status: 'success', ...notifications }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: RESPONSE_CACHE_TTL_SECONDS,
      payload,
      lastModified: notifications.generatedAt,
    })
  ) {
    return null
  }

  return payload
})
