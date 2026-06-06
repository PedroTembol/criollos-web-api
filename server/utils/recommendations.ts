import type {
  DiscoveryFeed,
  DiscoveryFeedItem,
  DiscoverySummaryAlert,
} from './discovery'
import type {
  TrackingSnapshot,
  TrackingSummaryAlert,
  TrackingUpcomingStopSummary,
} from './tracking'

export type RecommendationType = 'mobility' | 'plan' | 'food' | 'service'
export type RecommendationPriority = 'high' | 'medium' | 'low'

export type CriolloRecommendation = {
  id: string
  type: RecommendationType
  priority: RecommendationPriority
  title: string
  message: string
  actionLabel: string
  actionHref: string
  evidence: string[]
  tags: string[]
  sourceIds: string[]
}

export type CriolloNextBestAction = Pick<
  CriolloRecommendation,
  | 'id'
  | 'type'
  | 'priority'
  | 'title'
  | 'message'
  | 'actionLabel'
  | 'actionHref'
  | 'evidence'
  | 'tags'
  | 'sourceIds'
>

export type CriolloRecommendationsSummary = {
  total: number
  byType: Array<{
    type: RecommendationType
    count: number
  }>
  priorities: Record<RecommendationPriority, number>
  nextBestAction: CriolloNextBestAction | null
  generatedFrom: {
    trackingFetchedAt: string | null
    discoveryGeneratedAt: string | null
  }
}

export type CriolloRecommendationsFeed = {
  generatedAt: string
  count: number
  summary: CriolloRecommendationsSummary
  data: CriolloRecommendation[]
}

export type RecommendationFilters = {
  types?: RecommendationType[]
  limit?: number | null
}

function formatCountLabel(value: number, singular: string, plural: string) {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function formatEta(seconds: number | null) {
  if (seconds == null) {
    return 'ETA no disponible'
  }

  if (seconds < 60) {
    return 'menos de 1 min'
  }

  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes === 1 ? '1 min' : `${minutes} min`
}

function priorityRank(priority: RecommendationPriority) {
  return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2
}

function typeRank(type: RecommendationType) {
  const rank: Record<RecommendationType, number> = {
    service: 0,
    mobility: 1,
    plan: 2,
    food: 3,
  }
  return rank[type]
}

function categoryTags(categories: string[], fallback: string) {
  const tags = categories
    .map((category) => category.trim())
    .filter(Boolean)
    .slice(0, 3)

  return tags.length ? tags : [fallback]
}

function buildServiceRecommendation(
  alert: TrackingSummaryAlert
): CriolloRecommendation {
  return {
    id: `rec-${alert.id}`,
    type: 'service',
    priority: alert.severity === 'critical' ? 'high' : 'medium',
    title: alert.title,
    message: alert.message,
    actionLabel: 'Ver estado del trolley',
    actionHref: '/#trolley-board',
    evidence: [
      alert.coveragePercent != null
        ? `${alert.coveragePercent}% de cobertura`
        : 'Cobertura no disponible',
      alert.totalVehicles != null
        ? formatCountLabel(
            alert.totalVehicles,
            'unidad visible',
            'unidades visibles'
          )
        : 'Unidades no disponibles',
    ],
    tags: ['tracking', alert.severity],
    sourceIds: [alert.dedupeKey],
  }
}

function buildMobilityRecommendation(
  stop: TrackingUpcomingStopSummary
): CriolloRecommendation {
  const firstVehicle = stop.vehicles[0]
  const routeCopy = stop.routeNames.length
    ? stop.routeNames.join(' · ')
    : stop.routeIds.map((routeId) => `Ruta ${routeId}`).join(' · ')

  return {
    id: `rec-stop-${stop.stopKey}`,
    type: 'mobility',
    priority: stop.liveVehicleCount > 0 ? 'high' : 'medium',
    title: `Próximo trolley hacia ${stop.name}`,
    message: `${formatCountLabel(stop.arrivalCount, 'llegada visible', 'llegadas visibles')} para ${stop.name}; la próxima marca ${formatEta(stop.nextArrivalEtaSeconds)}.${routeCopy ? ` Ruta: ${routeCopy}.` : ''}`,
    actionLabel: 'Abrir trolley board',
    actionHref: '/#trolley-board',
    evidence: [
      `${stop.liveVehicleCount} en vivo`,
      firstVehicle
        ? `${firstVehicle.label} · ${formatEta(firstVehicle.nextStopEtaSeconds)}`
        : 'Sin unidad líder',
    ],
    tags: ['trolley', 'parada', ...stop.routeNames.slice(0, 2)],
    sourceIds: [
      stop.stopKey,
      ...stop.vehicles.slice(0, 3).map((vehicle) => `asset:${vehicle.assetId}`),
    ],
  }
}

function buildPlanRecommendation(
  alert: DiscoverySummaryAlert
): CriolloRecommendation {
  return {
    id: `rec-${alert.id}`,
    type: alert.scope === 'food' ? 'food' : 'plan',
    priority: alert.severity === 'warning' ? 'high' : 'medium',
    title: alert.title,
    message: alert.message,
    actionLabel:
      alert.scope === 'food' ? 'Explorar gastronomía' : 'Abrir Descubrir',
    actionHref: alert.scope === 'food' ? '/gastronomia' : '/discovery',
    evidence: [
      formatCountLabel(alert.eventCount, 'evento', 'eventos'),
      formatCountLabel(
        alert.foodCount,
        'lugar para comer',
        'lugares para comer'
      ),
    ],
    tags: categoryTags(
      alert.categories,
      alert.scope === 'food' ? 'gastronomía' : 'plan'
    ),
    sourceIds: [alert.dedupeKey],
  }
}

function buildFoodFallbackRecommendation(
  foodItem: DiscoveryFeedItem
): CriolloRecommendation {
  return {
    id: `rec-food-${foodItem.id}`,
    type: 'food',
    priority: 'low',
    title: `Parada recomendada: ${foodItem.title}`,
    message:
      foodItem.description ||
      `Explora ${foodItem.title} como parte de una ruta gastronómica por Caguas.`,
    actionLabel: 'Ver opción gastronómica',
    actionHref: foodItem.link || '/gastronomia',
    evidence: [foodItem.subtitle, foodItem.category].filter(Boolean),
    tags: categoryTags([foodItem.category, foodItem.subtitle], 'gastronomía'),
    sourceIds: [foodItem.id],
  }
}

function buildSummary(
  data: CriolloRecommendation[],
  tracking: TrackingSnapshot | null,
  discovery: DiscoveryFeed | null
): CriolloRecommendationsSummary {
  const types: RecommendationType[] = ['service', 'mobility', 'plan', 'food']
  const priorities: Record<RecommendationPriority, number> = {
    high: 0,
    medium: 0,
    low: 0,
  }

  data.forEach((item) => {
    priorities[item.priority] += 1
  })

  const [nextBestAction] = data

  return {
    total: data.length,
    byType: types
      .map((type) => ({
        type,
        count: data.filter((item) => item.type === type).length,
      }))
      .filter((entry) => entry.count > 0),
    priorities,
    nextBestAction: nextBestAction
      ? {
          id: nextBestAction.id,
          type: nextBestAction.type,
          priority: nextBestAction.priority,
          title: nextBestAction.title,
          message: nextBestAction.message,
          actionLabel: nextBestAction.actionLabel,
          actionHref: nextBestAction.actionHref,
          evidence: nextBestAction.evidence,
          tags: nextBestAction.tags,
          sourceIds: nextBestAction.sourceIds,
        }
      : null,
    generatedFrom: {
      trackingFetchedAt: tracking?.fetchedAt ?? null,
      discoveryGeneratedAt: discovery?.generatedAt ?? null,
    },
  }
}

export function buildCriolloRecommendations(
  options: {
    tracking?: TrackingSnapshot | null
    discovery?: DiscoveryFeed | null
    now?: Date
  },
  filters: RecommendationFilters = {}
): CriolloRecommendationsFeed {
  const tracking = options.tracking ?? null
  const discovery = options.discovery ?? null
  const recommendations: CriolloRecommendation[] = []

  const serviceAlert = tracking?.summary.alerts[0]
  if (serviceAlert) {
    recommendations.push(buildServiceRecommendation(serviceAlert))
  }

  const liveStop =
    tracking?.summary.upcomingStops.find((stop) => stop.liveVehicleCount > 0) ||
    tracking?.summary.upcomingStops[0]
  if (liveStop) {
    recommendations.push(buildMobilityRecommendation(liveStop))
  }

  discovery?.summary.alerts.forEach((alert) => {
    recommendations.push(buildPlanRecommendation(alert))
  })

  if (!recommendations.some((item) => item.type === 'food')) {
    const foodItem = discovery?.data.find((item) => item.type === 'gastronomia')
    if (foodItem) {
      recommendations.push(buildFoodFallbackRecommendation(foodItem))
    }
  }

  const allowedTypes = filters.types?.length ? new Set(filters.types) : null
  const filtered = recommendations
    .filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.id === item.id) === index
    )
    .filter((item) => !allowedTypes || allowedTypes.has(item.type))
    .sort((left, right) => {
      const priorityDelta =
        priorityRank(left.priority) - priorityRank(right.priority)
      if (priorityDelta !== 0) return priorityDelta

      const typeDelta = typeRank(left.type) - typeRank(right.type)
      if (typeDelta !== 0) return typeDelta

      return left.title.localeCompare(right.title, 'es')
    })

  const limit =
    filters.limit != null
      ? Math.min(Math.max(1, Math.trunc(filters.limit)), 12)
      : 6
  const data = filtered.slice(0, limit)
  const generatedAt =
    options.now?.toISOString() ||
    tracking?.fetchedAt ||
    discovery?.generatedAt ||
    new Date().toISOString()

  return {
    generatedAt,
    count: data.length,
    summary: buildSummary(data, tracking, discovery),
    data,
  }
}
