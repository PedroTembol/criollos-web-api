import type { BootstrapData, Marker, Route, RoutePoint } from './normalize'

export type RouteStopDirectionSummary = {
  direction: number
  label: string
  stopCount: number
  totalDistanceMeters: number | null
  totalTravelSeconds: number | null
}

export type RouteStopSummary = {
  routeId: number
  routeName: string | null
  routeColor: string | null
  isOpen: boolean | null
  directionCount: number
  stopCount: number
  directions: RouteStopDirectionSummary[]
}

export type RouteStopItem = {
  routePointId: number
  markerId: number
  name: string
  direction: number
  order: number
  sequence: number
  lat: number
  lng: number
  distanceMeters: number | null
  travelSecondsFromStart: number | null
  segmentDistanceMeters: number | null
  segmentTravelSeconds: number | null
}

export type RouteStopDirection = {
  direction: number
  label: string
  startName: string | null
  endName: string | null
  stopCount: number
  totalDistanceMeters: number | null
  totalTravelSeconds: number | null
  stops: RouteStopItem[]
}

export type RouteStopsFeed = {
  generatedAt: string
  route: Route | null
  count: number
  summary: RouteStopSummary
  directions: RouteStopDirection[]
}

export type RouteStopsOptions = {
  routeId: number
  now?: Date
}

function isUsableStop(
  point: RoutePoint
): point is RoutePoint & { markerId: number } {
  return (
    point.markerId !== null &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  )
}

function nullableMetric(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null
}

function markerName(marker: Marker | undefined, markerId: number) {
  const name = marker?.description?.trim()
  return name || `Parada ${markerId}`
}

function directionLabel(route: Route | undefined, direction: number) {
  if (direction === 0) {
    return route?.directionStartName && route?.directionEndName
      ? `${route.directionStartName} → ${route.directionEndName}`
      : 'Dirección 0'
  }

  if (direction === 1) {
    return route?.directionStartName && route?.directionEndName
      ? `${route.directionEndName} → ${route.directionStartName}`
      : 'Dirección 1'
  }

  return `Dirección ${direction}`
}

function directionStartName(route: Route | undefined, direction: number) {
  if (!route) return null
  if (direction === 0) return route.directionStartName || null
  if (direction === 1) return route.directionEndName || null
  return null
}

function directionEndName(route: Route | undefined, direction: number) {
  if (!route) return null
  if (direction === 0) return route.directionEndName || null
  if (direction === 1) return route.directionStartName || null
  return null
}

function buildDirectionStops(
  points: Array<RoutePoint & { markerId: number }>,
  markersById: Map<number, Marker>
): RouteStopItem[] {
  const sorted = points
    .slice()
    .sort((left, right) => left.order - right.order || left.id - right.id)

  return sorted.map((point, index) => {
    const previous = sorted[index - 1]
    const marker = markersById.get(point.markerId)
    const distanceMeters = nullableMetric(point.distance)
    const travelSecondsFromStart = nullableMetric(point.seconds)
    const previousDistance = previous ? nullableMetric(previous.distance) : null
    const previousSeconds = previous ? nullableMetric(previous.seconds) : null

    return {
      routePointId: point.id,
      markerId: point.markerId,
      name: markerName(marker, point.markerId),
      direction: point.direction,
      order: point.order,
      sequence: index + 1,
      lat: marker?.lat ?? point.lat,
      lng: marker?.lng ?? point.lng,
      distanceMeters,
      travelSecondsFromStart,
      segmentDistanceMeters:
        index === 0 || distanceMeters === null || previousDistance === null
          ? null
          : Math.max(0, distanceMeters - previousDistance),
      segmentTravelSeconds:
        index === 0 ||
        travelSecondsFromStart === null ||
        previousSeconds === null
          ? null
          : Math.max(0, travelSecondsFromStart - previousSeconds),
    }
  })
}

function buildDirection(
  route: Route | undefined,
  direction: number,
  points: Array<RoutePoint & { markerId: number }>,
  markersById: Map<number, Marker>
): RouteStopDirection {
  const stops = buildDirectionStops(points, markersById)
  const lastStop = stops[stops.length - 1]

  return {
    direction,
    label: directionLabel(route, direction),
    startName: directionStartName(route, direction),
    endName: directionEndName(route, direction),
    stopCount: stops.length,
    totalDistanceMeters: lastStop?.distanceMeters ?? null,
    totalTravelSeconds: lastStop?.travelSecondsFromStart ?? null,
    stops,
  }
}

export function buildRouteStops(
  data: BootstrapData,
  options: RouteStopsOptions
): RouteStopsFeed {
  const route =
    data.routes.find((candidate) => candidate.id === options.routeId) || null
  const markersById = new Map<number, Marker>(
    data.markers.map((marker) => [marker.id, marker])
  )
  const pointsByDirection = new Map<
    number,
    Array<RoutePoint & { markerId: number }>
  >()

  data.routePoints
    .filter((point) => point.routeId === options.routeId)
    .filter(isUsableStop)
    .forEach((point) => {
      const current = pointsByDirection.get(point.direction) || []
      current.push(point)
      pointsByDirection.set(point.direction, current)
    })

  const directions = Array.from(pointsByDirection.entries())
    .sort(([left], [right]) => left - right)
    .map(([direction, points]) =>
      buildDirection(route || undefined, direction, points, markersById)
    )

  const stopCount = directions.reduce(
    (total, direction) => total + direction.stopCount,
    0
  )

  return {
    generatedAt: options.now?.toISOString() || new Date().toISOString(),
    route,
    count: stopCount,
    summary: {
      routeId: options.routeId,
      routeName: route?.description ?? null,
      routeColor: route?.lineColor ?? null,
      isOpen: route?.isOpen ?? null,
      directionCount: directions.length,
      stopCount,
      directions: directions.map((direction) => ({
        direction: direction.direction,
        label: direction.label,
        stopCount: direction.stopCount,
        totalDistanceMeters: direction.totalDistanceMeters,
        totalTravelSeconds: direction.totalTravelSeconds,
      })),
    },
    directions,
  }
}
