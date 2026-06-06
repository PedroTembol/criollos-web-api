import type { Evento, GastronomiaPlace } from './scraper'
import { getDistanceMeters } from './nearbyStops'

export interface DiscoveryFeedItem {
  type: 'evento' | 'gastronomia' | 'info'
  id: string
  title: string
  subtitle: string
  description: string
  imageUrl: string | null
  imageAlt: string | null
  link: string | null
  date?: string
  eventDate?: string | null
  category: string
  tag?: string
  lat?: number | null
  lng?: number | null
  markerId?: number | null
}

export type DiscoverySummaryAlertScope = 'day' | 'mix' | 'food'
export type DiscoverySummaryAlertSeverity = 'info' | 'warning'

export interface DiscoverySummaryAlert {
  id: string
  dedupeKey: string
  scope: DiscoverySummaryAlertScope
  severity: DiscoverySummaryAlertSeverity
  title: string
  message: string
  date: string | null
  count: number
  eventCount: number
  foodCount: number
  categories: string[]
}

export interface DiscoveryFeedSummary {
  types: Array<{
    type: DiscoveryFeedItem['type']
    count: number
  }>
  categories: string[]
  dateRange: {
    start: string | null
    end: string | null
  }
  withImageCount: number
  sourceDomains: string[]
  alerts: DiscoverySummaryAlert[]
}

export interface DiscoveryFeed {
  generatedAt: string
  count: number
  summary: DiscoveryFeedSummary
  data: DiscoveryFeedItem[]
}

export interface DiscoveryFeedFilters {
  types?: Array<DiscoveryFeedItem['type']>
  query?: string | null
  categories?: string[]
  from?: string | null
  to?: string | null
  limit?: number | null
  lat?: number | null
  lng?: number | null
  radiusMeters?: number | null
}

function parseDate(value: string | null): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function formatDateDisplay(
  isoDate: string | null,
  rawDate: string | null
): string | undefined {
  if (!isoDate) return rawDate || undefined
  const date = new Date(isoDate)
  return date.toLocaleDateString('es-PR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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

function normalizeList(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean)
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
    return 'planes variados'
  }

  if (categories.length === 1) {
    return categories[0]
  }

  if (categories.length === 2) {
    return `${categories[0]} y ${categories[1]}`
  }

  return `${categories[0]}, ${categories[1]} y ${categories.length - 2} más`
}

type DiscoveryDayGroup = {
  date: string
  timestamp: number
  count: number
  categories: string[]
  daysAway: number
}

function buildUpcomingDayGroups(
  data: DiscoveryFeedItem[],
  now: Date
): DiscoveryDayGroup[] {
  const nowStartMs = toUtcStartOfDayMs(now.getTime())
  const groups = new Map<
    string,
    {
      timestamp: number
      count: number
      categories: Set<string>
    }
  >()

  for (const item of data) {
    if (item.type !== 'evento') {
      continue
    }

    const eventTime = parseDate(item.eventDate ?? null)
    if (eventTime == null || eventTime < nowStartMs) {
      continue
    }

    const dayKey = toUtcDayKey(eventTime)
    const current = groups.get(dayKey) || {
      timestamp: toUtcStartOfDayMs(eventTime),
      count: 0,
      categories: new Set<string>(),
    }

    current.count += 1
    ;[item.category, item.subtitle]
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => current.categories.add(value))

    groups.set(dayKey, current)
  }

  return Array.from(groups.entries())
    .map(([date, value]) => ({
      date,
      timestamp: value.timestamp,
      count: value.count,
      categories: Array.from(value.categories).sort((left, right) =>
        left.localeCompare(right, 'es')
      ),
      daysAway: Math.round(
        (value.timestamp - nowStartMs) / (24 * 60 * 60 * 1000)
      ),
    }))
    .sort((left, right) => left.timestamp - right.timestamp)
}

function buildPrimaryDiscoveryAlert(
  group: DiscoveryDayGroup,
  foodCount: number
): DiscoverySummaryAlert {
  const dateLabel = formatShortDate(group.date)
  const title =
    group.daysAway === 0
      ? 'Plan para hoy en Caguas'
      : group.daysAway === 1
        ? 'Plan para mañana en Caguas'
        : 'Próximo plan visible'

  const foodAddon =
    foodCount > 0
      ? ` Súmale ${formatCountLabel(foodCount, 'parada para comer', 'paradas para comer')} del mismo feed.`
      : ''

  return {
    id: `discovery-day-${group.date}`,
    dedupeKey: `discovery:day:${group.date}`,
    scope: 'day',
    severity: group.daysAway <= 1 ? 'warning' : 'info',
    title,
    message: `${formatCountLabel(group.count, 'evento visible', 'eventos visibles')} para ${dateLabel}, con foco en ${formatCategoryList(group.categories.slice(0, 3))}.${foodAddon}`,
    date: group.date,
    count: group.count + foodCount,
    eventCount: group.count,
    foodCount,
    categories: group.categories,
  }
}

function buildMixDiscoveryAlert(
  eventCount: number,
  foodCount: number,
  categories: string[]
): DiscoverySummaryAlert {
  return {
    id: 'discovery-mix-visible',
    dedupeKey: `discovery:mix:${eventCount}:${foodCount}:${categories.slice(0, 3).join('|').toLowerCase()}`,
    scope: 'mix',
    severity: eventCount >= 2 && foodCount >= 2 ? 'warning' : 'info',
    title: 'Plan redondo visible',
    message: `${formatCountLabel(eventCount, 'evento', 'eventos')} y ${formatCountLabel(foodCount, 'lugar para comer', 'lugares para comer')} en el mismo subset. Buen punto de partida para armar una salida con ${formatCategoryList(categories.slice(0, 3))}.`,
    date: null,
    count: eventCount + foodCount,
    eventCount,
    foodCount,
    categories: categories.slice(0, 3),
  }
}

function buildFoodDiscoveryAlert(
  foodCount: number,
  categories: string[]
): DiscoverySummaryAlert {
  return {
    id: 'discovery-food-visible',
    dedupeKey: `discovery:food:${foodCount}:${categories.slice(0, 3).join('|').toLowerCase()}`,
    scope: 'food',
    severity: 'info',
    title: 'Ruta gastronómica visible',
    message: `${formatCountLabel(foodCount, 'parada para comer activa', 'paradas para comer activas')} en este momento, con foco en ${formatCategoryList(categories.slice(0, 3))}.`,
    date: null,
    count: foodCount,
    eventCount: 0,
    foodCount,
    categories: categories.slice(0, 3),
  }
}

function buildDiscoveryAlerts(
  data: DiscoveryFeedItem[],
  now = new Date()
): DiscoverySummaryAlert[] {
  const eventItems = data.filter((item) => item.type === 'evento')
  const foodItems = data.filter((item) => item.type === 'gastronomia')
  const eventCategories = [
    ...new Set(eventItems.map((item) => item.category.trim()).filter(Boolean)),
  ]
  const foodCategories = [
    ...new Set(foodItems.map((item) => item.category.trim()).filter(Boolean)),
  ]
  const alerts: DiscoverySummaryAlert[] = []
  const groups = buildUpcomingDayGroups(data, now)

  if (groups[0]) {
    alerts.push(buildPrimaryDiscoveryAlert(groups[0], foodItems.length))
  }

  if (eventItems.length > 0 && foodItems.length > 0) {
    alerts.push(
      buildMixDiscoveryAlert(eventItems.length, foodItems.length, [
        ...new Set([...eventCategories, ...foodCategories]),
      ])
    )
  } else if (foodItems.length > 0) {
    alerts.push(buildFoodDiscoveryAlert(foodItems.length, foodCategories))
  }

  return alerts
    .sort((left, right) => {
      const severityRank = { warning: 0, info: 1 }
      if (severityRank[left.severity] !== severityRank[right.severity]) {
        return severityRank[left.severity] - severityRank[right.severity]
      }

      return (left.date || '9999-99-99').localeCompare(
        right.date || '9999-99-99'
      )
    })
    .slice(0, 3)
}

function buildDiscoverySummary(
  data: DiscoveryFeedItem[],
  now = new Date()
): DiscoveryFeedSummary {
  const types = (
    ['evento', 'gastronomia', 'info'] as DiscoveryFeedItem['type'][]
  )
    .map((type) => ({
      type,
      count: data.filter((item) => item.type === type).length,
    }))
    .filter((entry) => entry.count > 0)

  const categories = [
    ...new Set(
      data
        .flatMap((item) => [item.category, item.subtitle])
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ].sort((left, right) => left.localeCompare(right, 'es'))

  const sourceDomains = [
    ...new Set(
      data
        .map((item) => {
          if (!item.link) {
            return null
          }

          try {
            return new URL(item.link).hostname
          } catch {
            return null
          }
        })
        .filter((value): value is string => Boolean(value))
    ),
  ].sort((left, right) => left.localeCompare(right, 'en'))

  const datedItems = data
    .map((item) => {
      const timestamp = parseDate(item.eventDate ?? null)
      return timestamp != null
        ? { isoDate: new Date(timestamp).toISOString(), timestamp }
        : null
    })
    .filter(
      (value): value is { isoDate: string; timestamp: number } => value !== null
    )
    .sort((left, right) => left.timestamp - right.timestamp)

  return {
    types,
    categories,
    dateRange: {
      start: datedItems[0]?.isoDate ?? null,
      end: datedItems[datedItems.length - 1]?.isoDate ?? null,
    },
    withImageCount: data.filter((item) => Boolean(item.imageUrl)).length,
    sourceDomains,
    alerts: buildDiscoveryAlerts(data, now),
  }
}

export function sortUpcomingEvents(events: Evento[]): Evento[] {
  return [...events].sort((left, right) => {
    const leftTime = parseDate(left.publishedAt)
    const rightTime = parseDate(right.publishedAt)

    if (leftTime != null && rightTime != null) {
      return leftTime - rightTime
    }

    if (leftTime != null) return -1
    if (rightTime != null) return 1
    return left.title.localeCompare(right.title, 'es')
  })
}

export function pickFeaturedPlaces(
  places: GastronomiaPlace[],
  limit = 6
): GastronomiaPlace[] {
  const normalizedLimit = Math.max(1, limit)
  const byCategory = new Set<string>()
  const selected: GastronomiaPlace[] = []

  for (const place of places) {
    const categoryKey = place.category.trim().toLowerCase()
    if (selected.length >= normalizedLimit) break
    if (!categoryKey || byCategory.has(categoryKey)) continue

    selected.push(place)
    byCategory.add(categoryKey)
  }

  if (selected.length < normalizedLimit) {
    for (const place of places) {
      if (selected.length >= normalizedLimit) break
      if (selected.some((item) => item.id === place.id)) continue
      selected.push(place)
    }
  }

  return selected
}

export function filterDiscoveryFeed(
  feed: DiscoveryFeed,
  filters: DiscoveryFeedFilters = {}
): DiscoveryFeed {
  const typeSet = filters.types?.length ? new Set(filters.types) : null
  const categorySet = filters.categories?.length
    ? new Set(normalizeList(filters.categories))
    : null
  const normalizedQuery = filters.query?.trim().toLowerCase() || null
  const fromMs = toStartOfDayMs(filters.from)
  const toMs = toEndOfDayMs(filters.to)
  const origin =
    filters.lat != null && filters.lng != null
      ? { lat: filters.lat, lng: filters.lng }
      : null
  const radiusMeters = filters.radiusMeters || 1000 // default 1km if origin provided
  const normalizedLimit =
    filters.limit != null
      ? Math.min(Math.max(1, Math.trunc(filters.limit)), 24)
      : null

  const filtered = feed.data.filter((item) => {
    if (typeSet && !typeSet.has(item.type)) return false

    if (categorySet) {
      const itemCategories = normalizeList([
        item.category,
        item.tag ?? '',
        item.subtitle,
      ])
      if (!itemCategories.some((category) => categorySet.has(category))) {
        return false
      }
    }

    if (normalizedQuery) {
      const haystack = [
        item.title,
        item.subtitle,
        item.description,
        item.category,
        item.tag ?? '',
        item.date ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(normalizedQuery)) {
        return false
      }
    }

    if (item.type === 'evento' && (fromMs != null || toMs != null)) {
      const eventTime = parseDate(item.eventDate ?? null)

      if (fromMs != null && eventTime != null && eventTime < fromMs) {
        return false
      }

      if (toMs != null && eventTime != null && eventTime > toMs) {
        return false
      }
    }

    if (origin) {
      if (item.lat == null || item.lng == null) {
        return false
      }

      const distance = getDistanceMeters(origin, {
        lat: item.lat,
        lng: item.lng,
      })
      if (distance > radiusMeters) {
        return false
      }
    }

    return true
  })

  const data =
    normalizedLimit != null ? filtered.slice(0, normalizedLimit) : filtered

  return {
    generatedAt: feed.generatedAt,
    count: data.length,
    summary: buildDiscoverySummary(data, new Date(feed.generatedAt)),
    data,
  }
}

export function buildDiscoveryFeed(
  events: Evento[],
  places: GastronomiaPlace[],
  now = new Date()
): DiscoveryFeed {
  const nowMs = now.getTime()
  const items: DiscoveryFeedItem[] = []

  const upcomingEvents = sortUpcomingEvents(events)
    .filter((event) => {
      const publishedAtMs = parseDate(event.publishedAt)
      return (
        publishedAtMs == null || publishedAtMs >= nowMs - 24 * 60 * 60 * 1000
      )
    })
    .slice(0, 8)

  for (const event of upcomingEvents) {
    items.push({
      type: 'evento',
      id: `evt-${event.id}`,
      title: event.title,
      subtitle: event.venue || event.category,
      description: event.summary || event.description,
      imageUrl: event.imageUrl,
      imageAlt: event.imageAlt,
      link: event.sourceUrl,
      date: formatDateDisplay(event.publishedAt, event.rawDate),
      eventDate: event.publishedAt,
      category: event.category,
      tag: 'Evento',
      lat: event.lat,
      lng: event.lng,
      markerId: event.markerId,
    })
  }

  const featuredPlaces = pickFeaturedPlaces(places, 12)
  for (const place of featuredPlaces) {
    items.push({
      type: 'gastronomia',
      id: `gst-${place.id}`,
      title: place.title,
      subtitle: place.category,
      description: place.summary || place.description,
      imageUrl: place.imageUrl,
      imageAlt: place.imageAlt,
      link: place.sourceUrl,
      category: place.category,
      tag: 'Gastronomía',
      lat: place.lat,
      lng: place.lng,
      markerId: place.markerId,
    })
  }

  const interleaved: DiscoveryFeedItem[] = []
  const max = Math.max(
    items.filter((i) => i.type === 'evento').length,
    items.filter((i) => i.type === 'gastronomia').length
  )

  const evts = items.filter((i) => i.type === 'evento')
  const gsts = items.filter((i) => i.type === 'gastronomia')

  for (let i = 0; i < max; i++) {
    if (evts[i]) interleaved.push(evts[i])
    if (gsts[i]) interleaved.push(gsts[i])
  }

  return {
    generatedAt: now.toISOString(),
    count: interleaved.length,
    summary: buildDiscoverySummary(interleaved, now),
    data: interleaved,
  }
}
