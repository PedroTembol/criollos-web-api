import type { DiscoverySummaryAlert } from './discovery'
import type { EventosSummaryAlert } from './eventos'
import type { GastronomiaSummaryAlert } from './gastronomia'
import type { TrackingSummaryAlert } from './tracking'

export type NotificationSource =
  | 'tracking'
  | 'eventos'
  | 'discovery'
  | 'gastronomia'
export type NotificationSeverity = 'info' | 'warning' | 'critical'

export type CriollosNotification = {
  id: string
  dedupeKey: string
  source: NotificationSource
  severity: NotificationSeverity
  title: string
  body: string
  actionLabel: string
  actionHref: string
  scheduledFor: string | null
  tags: string[]
}

export type NotificationFilters = {
  sources?: NotificationSource[]
  severities?: NotificationSeverity[]
  seen?: string[]
  limit?: number | null
}

export type NotificationsFeed = {
  generatedAt: string
  cursor: string
  count: number
  unreadCount: number
  summary: {
    bySource: Array<{ source: NotificationSource; count: number }>
    bySeverity: Record<NotificationSeverity, number>
  }
  data: CriollosNotification[]
}

type NotificationInputs = {
  tracking?: TrackingSummaryAlert[]
  eventos?: EventosSummaryAlert[]
  discovery?: DiscoverySummaryAlert[]
  gastronomia?: GastronomiaSummaryAlert[]
  generatedAt?: string
}

function cleanTags(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ].slice(0, 5)
}

function fromTracking(alert: TrackingSummaryAlert): CriollosNotification {
  return {
    id: `notification-${alert.id}`,
    dedupeKey: alert.dedupeKey,
    source: 'tracking',
    severity: alert.severity,
    title: alert.title,
    body: alert.message,
    actionLabel: 'Ver estado del trolley',
    actionHref:
      alert.routeId == null
        ? '/#trolley-board'
        : `/?routeId=${alert.routeId}#trolley-board`,
    scheduledFor: null,
    tags: cleanTags(['trolley', alert.routeName, alert.healthLabel]),
  }
}

function fromEventos(alert: EventosSummaryAlert): CriollosNotification {
  return {
    id: `notification-${alert.id}`,
    dedupeKey: alert.dedupeKey,
    source: 'eventos',
    severity: alert.severity,
    title: alert.title,
    body: alert.message,
    actionLabel: 'Abrir agenda',
    actionHref: alert.date
      ? `/eventos?from=${alert.date}&to=${alert.date}`
      : '/eventos',
    scheduledFor: alert.date,
    tags: cleanTags(['eventos', alert.venue, ...alert.categories]),
  }
}

function fromDiscovery(alert: DiscoverySummaryAlert): CriollosNotification {
  return {
    id: `notification-${alert.id}`,
    dedupeKey: alert.dedupeKey,
    source: 'discovery',
    severity: alert.severity,
    title: alert.title,
    body: alert.message,
    actionLabel:
      alert.scope === 'food' ? 'Explorar gastronomía' : 'Abrir Descubrir',
    actionHref: alert.scope === 'food' ? '/gastronomia' : '/discovery',
    scheduledFor: alert.date,
    tags: cleanTags(['descubrir', ...alert.categories]),
  }
}

function fromGastronomia(alert: GastronomiaSummaryAlert): CriollosNotification {
  return {
    id: `notification-${alert.id}`,
    dedupeKey: alert.dedupeKey,
    source: 'gastronomia',
    severity: alert.severity,
    title: alert.title,
    body: alert.message,
    actionLabel: 'Explorar gastronomía',
    actionHref: '/gastronomia',
    scheduledFor: null,
    tags: cleanTags(['gastronomía', ...alert.categories]),
  }
}

function severityRank(severity: NotificationSeverity): number {
  return severity === 'critical' ? 0 : severity === 'warning' ? 1 : 2
}

function makeCursor(items: CriollosNotification[]): string {
  const value = items
    .map((item) => item.dedupeKey)
    .sort()
    .join('|')
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `notifications-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function buildNotificationsFeed(
  inputs: NotificationInputs,
  filters: NotificationFilters = {}
): NotificationsFeed {
  const all = [
    ...(inputs.tracking ?? []).map(fromTracking),
    ...(inputs.eventos ?? []).map(fromEventos),
    ...(inputs.discovery ?? []).map(fromDiscovery),
    ...(inputs.gastronomia ?? []).map(fromGastronomia),
  ]

  const unique = all.filter(
    (item, index, array) =>
      array.findIndex((candidate) => candidate.dedupeKey === item.dedupeKey) ===
      index
  )
  const sourceSet = filters.sources?.length ? new Set(filters.sources) : null
  const severitySet = filters.severities?.length
    ? new Set(filters.severities)
    : null
  const seenSet = new Set(filters.seen ?? [])
  const matching = unique
    .filter((item) => !sourceSet || sourceSet.has(item.source))
    .filter((item) => !severitySet || severitySet.has(item.severity))
    .sort((left, right) => {
      const severityDelta =
        severityRank(left.severity) - severityRank(right.severity)
      if (severityDelta !== 0) return severityDelta
      const dateDelta = (left.scheduledFor ?? '9999').localeCompare(
        right.scheduledFor ?? '9999'
      )
      if (dateDelta !== 0) return dateDelta
      return left.title.localeCompare(right.title, 'es')
    })

  const unread = matching.filter((item) => !seenSet.has(item.dedupeKey))
  const limit =
    filters.limit == null
      ? 20
      : Math.min(Math.max(1, Math.trunc(filters.limit)), 50)
  const data = unread.slice(0, limit)
  const sources: NotificationSource[] = [
    'tracking',
    'eventos',
    'discovery',
    'gastronomia',
  ]
  const bySeverity: Record<NotificationSeverity, number> = {
    info: 0,
    warning: 0,
    critical: 0,
  }
  unread.forEach((item) => {
    bySeverity[item.severity] += 1
  })

  return {
    generatedAt: inputs.generatedAt ?? new Date().toISOString(),
    cursor: makeCursor(unique),
    count: data.length,
    unreadCount: unread.length,
    summary: {
      bySource: sources
        .map((source) => ({
          source,
          count: unread.filter((item) => item.source === source).length,
        }))
        .filter((entry) => entry.count > 0),
      bySeverity,
    },
    data,
  }
}
