import type { BootstrapData, Marker, Route, RoutePoint } from './normalize'

export type NearbyStopRoute = {
  routeId: number
  routeName: string | null
  routeColor: string | null
  directionStartName: string | null
  directionEndName: string | null
  routePointIds: number[]
  directions: number[]
}

export type NearbyStop = {
  markerId: number
  name: string
  lat: number
  lng: number
  distanceMeters: number
  distanceLabel: string
  routeCount: number
  routes: NearbyStopRoute[]
}

export type NearbyStopsSummary = {
  origin: {
    lat: number
    lng: number
  }
  totalStops: number
  returnedStops: number
  maxDistanceMeters: number | null
  nearestDistanceMeters: number | null
  routeIds: number[]
}

export type NearbyStopsFeed = {
  generatedAt: string
  count: number
  summary: NearbyStopsSummary
  data: NearbyStop[]
}

export type NearbyStopsOptions = {
  lat: number
  lng: number
  limit?: number | null
  maxDistanceMeters?: number | null
  now?: Date
}

const EARTH_RADIUS_METERS = 6371000
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 25

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function getDistanceMeters(
  left: { lat: number; lng: number },
  right: { lat: number; lng: number }
) {
  const deltaLat = toRadians(right.lat - left.lat)
  const deltaLng = toRadians(right.lng - left.lng)
  const leftLat = toRadians(left.lat)
  const rightLat = toRadians(right.lat)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) ** 2

  return Math.round(
    EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  )
}

function formatDistanceLabel(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`
  }

  const kilometers = distanceMeters / 1000
  return `${kilometers.toFixed(kilometers < 10 ? 1 : 0)} km`
}

function getMarkerKey(markerId: number) {
  return `marker-${markerId}`
}

function buildRouteSummaries(
  routePoints: RoutePoint[],
  routesById: Map<number, Route>
): NearbyStopRoute[] {
  const byRoute = new Map<number, RoutePoint[]>()

  routePoints.forEach((point) => {
    const current = byRoute.get(point.routeId) || []
    current.push(point)
    byRoute.set(point.routeId, current)
  })

  return Array.from(byRoute.entries())
    .map(([routeId, points]) => {
      const route = routesById.get(routeId)
      return {
        routeId,
        routeName: route?.description ?? null,
        routeColor: route?.lineColor ?? null,
        directionStartName: route?.directionStartName ?? null,
        directionEndName: route?.directionEndName ?? null,
        routePointIds: points.map((point) => point.id).sort((a, b) => a - b),
        directions: [...new Set(points.map((point) => point.direction))].sort(
          (a, b) => a - b
        ),
      }
    })
    .sort((left, right) => {
      const leftName = left.routeName || `Ruta ${left.routeId}`
      const rightName = right.routeName || `Ruta ${right.routeId}`
      return (
        leftName.localeCompare(rightName, 'es') || left.routeId - right.routeId
      )
    })
}

function isUsableMarker(
  marker: Marker
): marker is Marker & { lat: number; lng: number } {
  return (
    marker.lat !== null &&
    marker.lng !== null &&
    Number.isFinite(marker.lat) &&
    Number.isFinite(marker.lng)
  )
}

export function buildNearbyStops(
  data: BootstrapData,
  options: NearbyStopsOptions
): NearbyStopsFeed {
  const origin = { lat: options.lat, lng: options.lng }
  const limit = Math.min(
    Math.max(1, Math.trunc(options.limit || DEFAULT_LIMIT)),
    MAX_LIMIT
  )
  const maxDistanceMeters =
    options.maxDistanceMeters && options.maxDistanceMeters > 0
      ? Math.trunc(options.maxDistanceMeters)
      : null
  const routesById = new Map<number, Route>(
    data.routes.map((route) => [route.id, route])
  )
  const stopPointsByMarkerId = new Map<number, RoutePoint[]>()

  data.routePoints
    .filter((point) => point.markerId !== null)
    .forEach((point) => {
      const current = stopPointsByMarkerId.get(point.markerId as number) || []
      current.push(point)
      stopPointsByMarkerId.set(point.markerId as number, current)
    })

  const allStops = data.markers
    .filter(isUsableMarker)
    .map((marker) => {
      const routePoints = stopPointsByMarkerId.get(marker.id) || []
      const routes = buildRouteSummaries(routePoints, routesById)
      const distanceMeters = getDistanceMeters(origin, {
        lat: marker.lat,
        lng: marker.lng,
      })

      return {
        markerId: marker.id,
        name: marker.description || getMarkerKey(marker.id),
        lat: marker.lat,
        lng: marker.lng,
        distanceMeters,
        distanceLabel: formatDistanceLabel(distanceMeters),
        routeCount: routes.length,
        routes,
      }
    })
    .filter(
      (stop) =>
        maxDistanceMeters === null || stop.distanceMeters <= maxDistanceMeters
    )
    .sort((left, right) => {
      if (left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters
      }

      return (
        left.name.localeCompare(right.name, 'es') ||
        left.markerId - right.markerId
      )
    })

  const dataSlice = allStops.slice(0, limit)
  const routeIds = [
    ...new Set(
      dataSlice.flatMap((stop) => stop.routes.map((route) => route.routeId))
    ),
  ].sort((a, b) => a - b)

  return {
    generatedAt: options.now?.toISOString() || new Date().toISOString(),
    count: dataSlice.length,
    summary: {
      origin,
      totalStops: allStops.length,
      returnedStops: dataSlice.length,
      maxDistanceMeters,
      nearestDistanceMeters: dataSlice[0]?.distanceMeters ?? null,
      routeIds,
    },
    data: dataSlice,
  }
}

export const nearbyStopsTestables = {
  getDistanceMeters,
  formatDistanceLabel,
}
