import type { BootstrapResponse } from './bootstrap'
import { getDistanceMeters } from './nearbyStops'
import { Position } from './normalize'

export type NearbyVehicle = {
  assetId: number
  description: string
  routeId: number
  routeName: string | null
  routeColor: string | null
  lat: number
  lng: number
  distanceMeters: number
  distanceLabel: string
  speed: number
  status: number
  msg: string
  lastReportedAt: string
}

export type NearbyVehiclesSummary = {
  origin: {
    lat: number
    lng: number
  }
  totalVehicles: number
  returnedVehicles: number
  nearestDistanceMeters: number | null
  routeIds: number[]
}

export type NearbyVehiclesFeed = {
  generatedAt: string
  count: number
  summary: NearbyVehiclesSummary
  data: NearbyVehicle[]
}

export type NearbyVehiclesOptions = {
  lat: number
  lng: number
  limit?: number | null
  now?: Date
}

function formatDistanceLabel(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`
  }
  const kilometers = distanceMeters / 1000
  return `${kilometers.toFixed(kilometers < 10 ? 1 : 0)} km`
}

export function buildNearbyVehicles(
  bootstrap: BootstrapResponse,
  options: NearbyVehiclesOptions
): NearbyVehiclesFeed {
  const origin = { lat: options.lat, lng: options.lng }
  const limit = Math.min(Math.max(1, Math.trunc(options.limit || 5)), 25)

  const assetsById = new Map(bootstrap.assets.map((a) => [a.id, a]))
  const routesById = new Map(bootstrap.routes.map((r) => [r.id, r]))

  const allVehicles = bootstrap.positions
    .filter(
      (pos): pos is Position & { lat: number; lng: number } =>
        pos.lat !== null &&
        pos.lng !== null &&
        Number.isFinite(pos.lat) &&
        Number.isFinite(pos.lng)
    )
    .map((pos) => {
      const asset = assetsById.get(pos.assetId)
      const route = routesById.get(pos.routeId)
      const distanceMeters = getDistanceMeters(origin, {
        lat: pos.lat,
        lng: pos.lng,
      })

      return {
        assetId: pos.assetId,
        description: asset?.description || `Unidad ${pos.assetId}`,
        routeId: pos.routeId,
        routeName: route?.description ?? null,
        routeColor: route?.lineColor ?? null,
        lat: pos.lat,
        lng: pos.lng,
        distanceMeters,
        distanceLabel: formatDistanceLabel(distanceMeters),
        speed: pos.speed,
        status: pos.status,
        msg: pos.msg,
        lastReportedAt: pos.when,
      }
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)

  const data = allVehicles.slice(0, limit)
  const routeIds = [...new Set(data.map((v) => v.routeId))].sort(
    (a, b) => a - b
  )

  return {
    generatedAt: options.now?.toISOString() || new Date().toISOString(),
    count: data.length,
    summary: {
      origin,
      totalVehicles: allVehicles.length,
      returnedVehicles: data.length,
      nearestDistanceMeters: data[0]?.distanceMeters ?? null,
      routeIds,
    },
    data,
  }
}
