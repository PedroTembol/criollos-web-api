import type { BootstrapData, RoutePoint } from '../../server/utils/normalize'
import type { TrackingVehicleSnapshot } from '../../server/utils/tracking'

type SearchDestinationInput = {
  type: string
  id?: string | number
  title?: string
  metadata?: Record<string, unknown>
}

export type TransportSelection = {
  routeId: number | null
  stopId: number | null
  assetId: number | null
  invalid: boolean
}

export function parseTransportId(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.length === 1 ? parseTransportId(value[0]) : null
  }
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value.trim())) return null
    value = Number(value.trim())
  }
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null
}

export function searchResultDestination(
  result: SearchDestinationInput,
  query = ''
): string {
  const targets = {
    route: { key: 'routeId', prefixes: /^(?:route-)?(\d+)$/ },
    stop: { key: 'stopId', prefixes: /^(?:stop-|s-nearby-)?(\d+)$/ },
    vehicle: {
      key: 'assetId',
      prefixes: /^(?:vehicle-|asset-|v-nearby-)?(\d+)$/,
    },
  }
  const target = Object.hasOwn(targets, result.type)
    ? targets[result.type as keyof typeof targets]
    : undefined
  if (target) {
    const prefixed = String(result.id ?? '').match(target.prefixes)?.[1]
    const id =
      parseTransportId(result.metadata?.[target.key]) ??
      (result.type === 'stop'
        ? parseTransportId(result.metadata?.markerId)
        : null) ??
      parseTransportId(prefixed)
    return id === null ? '/transporte' : `/transporte?${target.key}=${id}`
  }
  const path = result.type === 'evento' ? '/eventos' : '/gastronomia'
  if (result.type !== 'evento' && result.type !== 'gastronomia')
    return '/discovery'
  const term = query.trim() || result.title?.trim() || ''
  return term ? `${path}?${new URLSearchParams({ q: term })}` : path
}

export function parseTransportSelection(
  query: Record<string, unknown>
): TransportSelection {
  const routeId = parseTransportId(query.routeId)
  const stopId = parseTransportId(query.stopId)
  const assetId = parseTransportId(query.assetId)
  return {
    routeId,
    stopId,
    assetId,
    invalid: ['routeId', 'stopId', 'assetId'].some(
      (key) => query[key] !== undefined && parseTransportId(query[key]) === null
    ),
  }
}

export function normalizeTransportCoordinates(lat: unknown, lng: unknown) {
  const axis = (value: unknown, maximum: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    if (Math.abs(value) <= maximum) return value
    // Legacy route points use microdegrees; values just beyond a valid degree
    // range are malformed coordinates, not evidence of the legacy format.
    if (Math.abs(value) < 1000 || Math.abs(value) > maximum * 1e6) return null
    return value / 1e6
  }
  const latitude = axis(lat, 90)
  const longitude = axis(lng, 180)
  return latitude === null || longitude === null
    ? null
    : { lat: latitude, lng: longitude }
}

export function transportMapLink(lat: unknown, lng: unknown): string | null {
  const coordinates = normalizeTransportCoordinates(lat, lng)
  if (!coordinates) return null
  const query = new URLSearchParams({
    api: '1',
    query: `${coordinates.lat},${coordinates.lng}`,
  })
  return `https://www.google.com/maps/search/?${query}`
}

export function resolveTransportSelection(
  catalog: Pick<BootstrapData, 'assets' | 'markers' | 'routes' | 'stops'>,
  vehicles: TrackingVehicleSnapshot[],
  selection: TransportSelection
) {
  const marker = catalog.markers.find((item) => item.id === selection.stopId)
  const stopPoint = catalog.stops.find(
    (item) => item.markerId === selection.stopId
  )
  const stop =
    marker ??
    (stopPoint
      ? {
          id: stopPoint.markerId!,
          description: `Parada ${stopPoint.markerId}`,
          ...normalizeTransportCoordinates(stopPoint.lat, stopPoint.lng),
        }
      : null)
  const asset =
    catalog.assets.find((item) => item.id === selection.assetId) ?? null
  const vehicle =
    vehicles.find((item) => item.assetId === selection.assetId) ?? null
  const servingRouteIds = Array.from(
    new Set(
      catalog.stops
        .filter((item) => item.markerId === selection.stopId)
        .map((item) => item.routeId)
    )
  )
  const routeId =
    selection.routeId ??
    vehicle?.routeId ??
    servingRouteIds[0] ??
    catalog.routes[0]?.id
  const route = catalog.routes.find((item) => item.id === routeId) ?? null
  const missing = [
    selection.routeId !== null &&
    !catalog.routes.some((item) => item.id === selection.routeId)
      ? 'ruta'
      : null,
    selection.stopId !== null && !stop ? 'parada' : null,
    selection.assetId !== null && !asset && !vehicle ? 'vehículo' : null,
  ].filter((item): item is string => item !== null)
  return { route, stop, asset, vehicle, servingRouteIds, missing }
}

export function orderedTransportStops(
  catalog: Pick<BootstrapData, 'markers' | 'routes' | 'stops'>,
  routeId: number
) {
  const route = catalog.routes.find((item) => item.id === routeId)
  const markers = new Map(catalog.markers.map((marker) => [marker.id, marker]))
  const groups = new Map<number, RoutePoint[]>()
  for (const stop of catalog.stops) {
    if (stop.routeId !== routeId || stop.markerId === null) continue
    const group = groups.get(stop.direction) ?? []
    group.push(stop)
    groups.set(stop.direction, group)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([direction, stops]) => ({
      direction,
      label:
        direction === 0 && route?.directionStartName && route.directionEndName
          ? `${route.directionStartName} → ${route.directionEndName}`
          : direction === 1 &&
              route?.directionStartName &&
              route.directionEndName
            ? `${route.directionEndName} → ${route.directionStartName}`
            : `Dirección ${direction + 1}`,
      stops: [...stops]
        .sort((a, b) => a.order - b.order || a.id - b.id)
        .map((stop) => {
          const marker = markers.get(stop.markerId!)
          const coordinates =
            normalizeTransportCoordinates(marker?.lat, marker?.lng) ??
            normalizeTransportCoordinates(stop.lat, stop.lng)
          return {
            routePointId: stop.id,
            markerId: stop.markerId!,
            name: marker?.description?.trim() || `Parada ${stop.markerId}`,
            coordinates,
            mapLink: coordinates
              ? transportMapLink(coordinates.lat, coordinates.lng)
              : null,
          }
        }),
    }))
}

export function transportVehicleSignal(
  vehicle: Pick<TrackingVehicleSnapshot, 'when'>,
  now = Date.now()
) {
  const reportedAt = Date.parse(vehicle.when)
  if (!Number.isFinite(reportedAt) || reportedAt > now + 60_000) {
    return {
      state: 'unknown',
      label: 'Fecha de señal sin confirmar',
      ageSeconds: null,
    }
  }
  const ageSeconds = Math.max(0, Math.floor((now - reportedAt) / 1000))
  return ageSeconds <= 120
    ? { state: 'live', label: 'Señal reciente', ageSeconds }
    : { state: 'stale', label: 'Señal anterior', ageSeconds }
}
