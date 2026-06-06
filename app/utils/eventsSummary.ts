export interface EventsFeedAlert {
  id: string
  scope: 'day' | 'weekend'
  severity: 'info' | 'warning'
  title: string
  message: string
  date?: string | null
  count?: number | null
  categories?: string[] | null
  venue?: string | null
}

export interface EventsFeedSummary {
  categories?: string[] | null
  dateRange?: {
    start?: string | null
    end?: string | null
  } | null
  upcomingCount?: number | null
  alerts?: EventsFeedAlert[] | null
  featuredPlans?: FeaturedEventPlanCard[] | null
}

export interface EventFeedItem {
  id: string
  title: string
  category?: string | null
  categories?: string[] | null
  description?: string | null
  venue?: string | null
  sourceUrl?: string | null
  publishedAt?: string | null
  rawDate?: string | null
}

interface EventsSummaryCard {
  id: string
  label: string
  value: string
  hint: string
}

export interface EventsAlertCard {
  id: string
  eyebrow: string
  title: string
  body: string
  meta: string
  severity: 'info' | 'warning'
}

export interface FeaturedEventPlanCard {
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

function formatCount(value: number, singular: string, plural: string): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('es-PR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function parseEventTime(value?: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function toDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function formatCategoryList(categories: string[]): string {
  if (!categories.length) return 'agenda variada'
  if (categories.length === 1) return categories[0]
  if (categories.length === 2) return `${categories[0]} y ${categories[1]}`
  return `${categories[0]}, ${categories[1]} y ${categories.length - 2} más`
}

export function formatEventsDateRange(
  summary?: EventsFeedSummary | null
): string {
  const start = summary?.dateRange?.start
  const end = summary?.dateRange?.end

  if (!start || !end) {
    return 'Sin agenda fechada visible'
  }

  try {
    const startLabel = formatShortDate(start)
    const endLabel = formatShortDate(end)
    return start === end ? startLabel : `${startLabel} al ${endLabel}`
  } catch {
    return 'Sin agenda fechada visible'
  }
}

export function formatUpcomingEventCoverage(
  summary?: EventsFeedSummary | null
): string {
  const upcomingCount = Math.max(0, summary?.upcomingCount || 0)
  return formatCount(upcomingCount, 'evento próximo', 'eventos próximos')
}

export function formatEventCategoryCoverage(
  summary?: EventsFeedSummary | null
): string {
  const categories = summary?.categories?.filter(Boolean) || []

  if (!categories.length) {
    return 'Sin categorías visibles'
  }

  return formatCount(
    categories.length,
    'categoría activa',
    'categorías activas'
  )
}

export function getEventsSummaryCards(
  summary?: EventsFeedSummary | null,
  count = 0
): EventsSummaryCard[] {
  const categories = summary?.categories?.filter(Boolean) || []

  return [
    {
      id: 'agenda',
      label: 'Agenda visible',
      value: formatEventsDateRange(summary),
      hint:
        count > 0
          ? `${formatCount(count, 'evento visible', 'eventos visibles')} en este subset.`
          : 'Ajusta los filtros para volver a poblar la agenda.',
    },
    {
      id: 'upcoming',
      label: 'Pulso de agenda',
      value: formatUpcomingEventCoverage(summary),
      hint: categories.length
        ? `Categorías activas: ${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '…' : ''}`
        : 'Todavía no hay categorías visibles con este filtro.',
    },
    {
      id: 'categories',
      label: 'Cobertura temática',
      value: formatEventCategoryCoverage(summary),
      hint: categories.length
        ? `Agenda repartida entre ${categories.join(', ')}.`
        : 'Sin categorías visibles en el subset actual.',
    },
  ]
}

export function getEventsAlertCards(
  summary?: EventsFeedSummary | null
): EventsAlertCard[] {
  const alerts = summary?.alerts?.filter(Boolean) || []

  return alerts.map((alert) => {
    const categories = alert.categories?.filter(Boolean) || []
    const dateLabel = alert.date
      ? formatShortDate(alert.date)
      : 'sin fecha visible'
    const metaParts = [
      alert.count != null
        ? formatCount(alert.count, 'evento', 'eventos')
        : null,
      categories.length ? categories.slice(0, 3).join(', ') : null,
      alert.venue || null,
      dateLabel,
    ].filter(Boolean)

    return {
      id: alert.id,
      eyebrow:
        alert.severity === 'warning' ? 'Atención rápida' : 'Aviso editorial',
      title: alert.title,
      body: alert.message,
      meta: metaParts.join(' · '),
      severity: alert.severity,
    }
  })
}

export function getFeaturedEventPlanCards(
  events: EventFeedItem[] = [],
  now = new Date()
): FeaturedEventPlanCard[] {
  const nowStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  const upcomingEvents = events
    .map((event) => ({ event, timestamp: parseEventTime(event.publishedAt) }))
    .filter(
      (entry): entry is { event: EventFeedItem; timestamp: number } =>
        entry.timestamp != null && entry.timestamp >= nowStartMs
    )
    .sort((left, right) => left.timestamp - right.timestamp)

  if (!upcomingEvents.length) {
    return []
  }

  const groupedByDate = new Map<
    string,
    {
      timestamp: number
      events: EventFeedItem[]
      categories: Set<string>
      venues: Set<string>
    }
  >()

  for (const { event, timestamp } of upcomingEvents) {
    const dayKey = toDayKey(timestamp)
    const group = groupedByDate.get(dayKey) || {
      timestamp,
      events: [],
      categories: new Set<string>(),
      venues: new Set<string>(),
    }

    group.events.push(event)
    ;(event.categories?.length ? event.categories : [event.category || ''])
      .map((category) => category.trim())
      .filter(Boolean)
      .forEach((category) => group.categories.add(category))

    if (event.venue) {
      group.venues.add(event.venue)
    }

    groupedByDate.set(dayKey, group)
  }

  return Array.from(groupedByDate.entries())
    .sort((left, right) => left[1].timestamp - right[1].timestamp)
    .slice(0, 3)
    .map(([date, group], index) => {
      const primaryEvent = group.events[0]
      const categories = Array.from(group.categories).sort((left, right) =>
        left.localeCompare(right, 'es')
      )
      const venues = Array.from(group.venues)
      const dateLabel = formatShortDate(date)
      const countLabel = formatCount(
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
