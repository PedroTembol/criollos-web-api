import type { Evento } from './scraper'

export interface EventosFeedFilters {
  query?: string | null
  categories?: string[]
  from?: string | null
  to?: string | null
  limit?: number | null
}

export type EventosSummaryAlertScope = 'day' | 'weekend'
export type EventosSummaryAlertSeverity = 'info' | 'warning'

export interface EventosFeaturedPlan {
  id: string
  eyebrow: string
  title: string
  body: string
  meta: string
  eventIds: string[]
  primaryEventId: string
  primaryEventTitle: string
  primaryEventHref: string | null
  categoryLabels: string[]
}

export interface EventosSummaryAlert {
  id: string
  dedupeKey: string
  scope: EventosSummaryAlertScope
  severity: EventosSummaryAlertSeverity
  title: string
  message: string
  date: string | null
  count: number
  categories: string[]
  venue: string | null
}

export interface EventosFeedSummary {
  categories: string[]
  dateRange: {
    start: string | null
    end: string | null
  }
  upcomingCount: number
  featuredPlans: EventosFeaturedPlan[]
  alerts: EventosSummaryAlert[]
}

export interface EventosFeedResponse {
  count: number
  data: Evento[]
  summary: EventosFeedSummary
}

function normalizeList(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean)
}

function parseIsoDate(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function toStartOfDayMs(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed) ? null : parsed
}

function toEndOfDayMs(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(`${value}T23:59:59.999Z`)
  return Number.isNaN(parsed) ? null : parsed
}

function toUtcDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function toUtcStartOfDayMs(timestamp: number): number {
  const date = new Date(timestamp)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('es-PR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function formatCountLabel(
  value: number,
  singular: string,
  plural: string
): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function formatCategoryList(categories: string[]): string {
  if (!categories.length) {
    return 'agenda variada'
  }

  if (categories.length === 1) {
    return categories[0]
  }

  if (categories.length === 2) {
    return `${categories[0]} y ${categories[1]}`
  }

  return `${categories[0]}, ${categories[1]} y ${categories.length - 2} más`
}

type GroupedEventsDay = {
  date: string
  timestamp: number
  count: number
  categories: string[]
  venue: string | null
  isWeekend: boolean
  daysAway: number
}

function buildUpcomingDayGroups(
  events: Evento[],
  now: Date
): GroupedEventsDay[] {
  const nowStartMs = toUtcStartOfDayMs(now.getTime())
  const groups = new Map<
    string,
    {
      timestamp: number
      count: number
      categories: Set<string>
      venues: string[]
    }
  >()

  for (const event of events) {
    const eventTime = parseIsoDate(event.publishedAt)
    if (eventTime == null) {
      continue
    }

    if (eventTime < nowStartMs) {
      continue
    }

    const dayKey = toUtcDayKey(eventTime)
    const current = groups.get(dayKey) || {
      timestamp: toUtcStartOfDayMs(eventTime),
      count: 0,
      categories: new Set<string>(),
      venues: [],
    }

    current.count += 1
    ;(event.categories?.length ? event.categories : [event.category])
      .map((category) => category.trim())
      .filter(Boolean)
      .forEach((category) => current.categories.add(category))

    if (event.venue && !current.venues.includes(event.venue)) {
      current.venues.push(event.venue)
    }

    groups.set(dayKey, current)
  }

  return Array.from(groups.entries())
    .map(([date, value]) => {
      const day = new Date(value.timestamp).getUTCDay()
      return {
        date,
        timestamp: value.timestamp,
        count: value.count,
        categories: Array.from(value.categories).sort((left, right) =>
          left.localeCompare(right, 'es')
        ),
        venue: value.venues[0] ?? null,
        isWeekend: day === 0 || day === 6,
        daysAway: Math.round(
          (value.timestamp - nowStartMs) / (24 * 60 * 60 * 1000)
        ),
      }
    })
    .sort((left, right) => left.timestamp - right.timestamp)
}

function buildPrimaryDayAlert(group: GroupedEventsDay): EventosSummaryAlert {
  const dateLabel = formatShortDate(group.date)
  const severity = group.daysAway <= 1 ? 'warning' : 'info'
  const title =
    group.daysAway === 0
      ? 'Agenda activa hoy'
      : group.daysAway === 1
        ? 'Agenda activa mañana'
        : 'Próximo bloque cultural'

  return {
    id: `events-day-${group.date}`,
    dedupeKey: `eventos:day:${group.date}`,
    scope: 'day',
    severity,
    title,
    message: `${formatCountLabel(group.count, 'evento confirmado', 'eventos confirmados')} para ${dateLabel}. Destacan ${formatCategoryList(group.categories.slice(0, 3))}.`,
    date: group.date,
    count: group.count,
    categories: group.categories,
    venue: group.venue,
  }
}

function buildWeekendAlert(group: GroupedEventsDay): EventosSummaryAlert {
  const dateLabel = formatShortDate(group.date)

  return {
    id: `events-weekend-${group.date}`,
    dedupeKey: `eventos:weekend:${group.date}`,
    scope: 'weekend',
    severity: group.count >= 3 ? 'warning' : 'info',
    title: 'Fin de semana activo',
    message: `${formatCountLabel(group.count, 'evento listo para el weekend', 'eventos listos para el weekend')} el ${dateLabel}, con foco en ${formatCategoryList(group.categories.slice(0, 3))}.`,
    date: group.date,
    count: group.count,
    categories: group.categories,
    venue: group.venue,
  }
}

function buildCrowdedDayAlert(group: GroupedEventsDay): EventosSummaryAlert {
  const dateLabel = formatShortDate(group.date)

  return {
    id: `events-crowded-${group.date}`,
    dedupeKey: `eventos:crowded:${group.date}`,
    scope: 'day',
    severity: 'warning',
    title: `Agenda cargada el ${dateLabel}`,
    message: `${formatCountLabel(group.count, 'evento visible', 'eventos visibles')} concentrados en un mismo día. Ideal para destacar avisos de ${formatCategoryList(group.categories.slice(0, 3))}.`,
    date: group.date,
    count: group.count,
    categories: group.categories,
    venue: group.venue,
  }
}

function buildEventosFeaturedPlans(
  events: Evento[],
  now = new Date()
): EventosFeaturedPlan[] {
  const nowStartMs = toUtcStartOfDayMs(now.getTime())
  const groups = new Map<
    string,
    {
      timestamp: number
      events: Evento[]
      categories: Set<string>
      venues: Set<string>
    }
  >()

  for (const event of events) {
    const eventTime = parseIsoDate(event.publishedAt)
    if (eventTime == null || eventTime < nowStartMs) {
      continue
    }

    const dayKey = toUtcDayKey(eventTime)
    const group = groups.get(dayKey) || {
      timestamp: toUtcStartOfDayMs(eventTime),
      events: [],
      categories: new Set<string>(),
      venues: new Set<string>(),
    }

    group.events.push(event)
    ;(event.categories?.length ? event.categories : [event.category])
      .map((category) => category.trim())
      .filter(Boolean)
      .forEach((category) => group.categories.add(category))

    if (event.venue) {
      group.venues.add(event.venue)
    }

    groups.set(dayKey, group)
  }

  return Array.from(groups.entries())
    .sort((left, right) => left[1].timestamp - right[1].timestamp)
    .slice(0, 3)
    .map(([date, group], index) => {
      const primaryEvent = group.events[0]
      const categories = Array.from(group.categories).sort((left, right) =>
        left.localeCompare(right, 'es')
      )
      const venues = Array.from(group.venues)
      const dateLabel = formatShortDate(date)
      const countLabel = formatCountLabel(
        group.events.length,
        'evento visible',
        'eventos visibles'
      )
      const venueLabel = venues.length
        ? venues.slice(0, 2).join(' + ')
        : 'ubicación por confirmar'
      const categoryLabel = formatCategoryList(categories.slice(0, 3))

      return {
        id: `event-plan-${date}`,
        eyebrow: index === 0 ? 'Próximo plan sugerido' : `Plan ${index + 1}`,
        title: `${dateLabel}: ${primaryEvent.title}`,
        body: `${countLabel} para ese día. Enfócate en ${categoryLabel} y verifica detalles antes de salir.`,
        meta: `${venueLabel} · ${categoryLabel}`,
        eventIds: group.events.map((event) => event.id),
        primaryEventId: primaryEvent.id,
        primaryEventTitle: primaryEvent.title,
        primaryEventHref: primaryEvent.sourceUrl || null,
        categoryLabels: categories,
      }
    })
}

function buildEventosAlerts(
  events: Evento[],
  now = new Date()
): EventosSummaryAlert[] {
  const groups = buildUpcomingDayGroups(events, now)

  if (!groups.length) {
    return []
  }

  const alerts: EventosSummaryAlert[] = []
  const usedDates = new Set<string>()

  const primaryGroup = groups[0]
  alerts.push(buildPrimaryDayAlert(primaryGroup))
  usedDates.add(primaryGroup.date)

  const weekendGroup = groups.find(
    (group) => group.isWeekend && !usedDates.has(group.date)
  )
  if (weekendGroup) {
    alerts.push(buildWeekendAlert(weekendGroup))
    usedDates.add(weekendGroup.date)
  }

  const crowdedGroup = groups.find(
    (group) => group.count >= 3 && !usedDates.has(group.date)
  )
  if (crowdedGroup) {
    alerts.push(buildCrowdedDayAlert(crowdedGroup))
  }

  return alerts
    .sort((left, right) => {
      const severityRank = { warning: 0, info: 1 }
      if (severityRank[left.severity] !== severityRank[right.severity]) {
        return severityRank[left.severity] - severityRank[right.severity]
      }

      return (left.date || '').localeCompare(right.date || '')
    })
    .slice(0, 3)
}

export function filterEventosFeed(
  events: Evento[],
  filters: EventosFeedFilters = {},
  now = new Date()
): EventosFeedResponse {
  const normalizedQuery = filters.query?.trim().toLowerCase() || null
  const categorySet = filters.categories?.length
    ? new Set(normalizeList(filters.categories))
    : null
  const fromMs = toStartOfDayMs(filters.from)
  const toMs = toEndOfDayMs(filters.to)
  const normalizedLimit =
    filters.limit != null
      ? Math.min(Math.max(1, Math.trunc(filters.limit)), 50)
      : null

  const filtered = events.filter((event) => {
    if (categorySet) {
      const eventCategories = normalizeList(
        event.categories?.length ? event.categories : [event.category]
      )
      if (!eventCategories.some((category) => categorySet.has(category))) {
        return false
      }
    }

    const eventTime = parseIsoDate(event.publishedAt)
    if (fromMs != null && eventTime != null && eventTime < fromMs) {
      return false
    }

    if (toMs != null && eventTime != null && eventTime > toMs) {
      return false
    }

    if (normalizedQuery) {
      const haystack = [
        event.title,
        event.summary,
        event.description,
        event.category,
        ...(event.categories ?? []),
        event.venue ?? '',
        event.rawDate ?? '',
      ]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(normalizedQuery)) {
        return false
      }
    }

    return true
  })

  const limited =
    normalizedLimit != null ? filtered.slice(0, normalizedLimit) : filtered
  const datedEvents = limited
    .map((event) => event.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))
  const categories = Array.from(
    new Set(
      limited.flatMap((event) =>
        event.categories?.length ? event.categories : [event.category]
      )
    )
  )
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'es'))
  const nowMs = now.getTime()
  const upcomingCount = limited.filter((event) => {
    const eventTime = parseIsoDate(event.publishedAt)
    return eventTime == null || eventTime >= nowMs - 24 * 60 * 60 * 1000
  }).length

  return {
    count: limited.length,
    data: limited,
    summary: {
      categories,
      dateRange: {
        start: datedEvents[0] ?? null,
        end: datedEvents[datedEvents.length - 1] ?? null,
      },
      upcomingCount,
      featuredPlans: buildEventosFeaturedPlans(limited, now),
      alerts: buildEventosAlerts(limited, now),
    },
  }
}
