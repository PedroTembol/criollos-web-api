type AssetRaw = [number, number, string]
type MarkerRaw = [number, number, string, string]
type RouteRaw = [number, number, string, string, string, string, string, string, string, number, string]
type RoutePointRaw = [number, number, number, number, number | null, number, number, string, number, number, number]
type PositionRaw = [number, number, string, number, number, string, number, string, string, number, number, number]
type ConfigRaw = [string, string][]

export type Asset = {
  id: number
  groupId: number
  description: string
}

export type Marker = {
  id: number
  groupId: number
  description: string
  lat: number | null
  lng: number | null
}

export type Route = {
  id: number
  clientId: number
  description: string
  lineColor: string
  assetColorCode: string
  directionStartName: string
  directionEndName: string
  svgFillColor1: string
  svgFillColor2: string
  isOpen: boolean
  departureTimes: string
}

export type RoutePoint = {
  id: number
  routeId: number
  direction: number
  order: number
  markerId: number | null
  lat: number
  lng: number
  type: string
  distance: number
  angle: number
  seconds: number
}

export type Position = {
  assetId: number
  driverId: number
  when: string
  speed: number
  inputX: number
  trail: string
  status: number
  msg: string
  extendedDescription: string
  routeId: number
  routePointNextId: number
  routePointPrevId: number
  lat: number | null
  lng: number | null
}

export type BootstrapData = {
  assets: Asset[]
  markers: Marker[]
  routes: Route[]
  routePoints: RoutePoint[]
  stops: RoutePoint[]
  config: Record<string, string>
  positions: Position[]
}

function parseLatLngFromTrail(trail: string) {
  if (!trail) {
    return { lat: null, lng: null }
  }
  const first = trail.split('*')[0]
  const [latRaw, lngRaw] = first.split(',')
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null
  }
}

function markerLatLng(latlong: string) {
  if (!latlong) {
    return { lat: null, lng: null }
  }
  const [latRaw, lngRaw] = latlong.split(',')
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null
  }
}

export function normalizeGetAll(raw: unknown[]): BootstrapData {
  const assetsRaw = raw[0] as AssetRaw[]
  const markersRaw = raw[1] as MarkerRaw[]
  const routesRaw = raw[2] as RouteRaw[]
  const routePointsRaw = raw[3] as RoutePointRaw[]
  const configRaw = raw[4] as ConfigRaw
  const positionsRaw = raw[5] as PositionRaw[]

  const assets = assetsRaw.map(([id, groupId, description]) => ({
    id,
    groupId,
    description
  }))

  const markers = markersRaw.map(([id, groupId, description, latlong]) => {
    const { lat, lng } = markerLatLng(latlong)
    return {
      id,
      groupId,
      description,
      lat,
      lng
    }
  })

  const routes = routesRaw.map(([
    id,
    clientId,
    description,
    lineColor,
    assetColorCode,
    directionStartName,
    directionEndName,
    svgFillColor1,
    svgFillColor2,
    isClosed,
    departureTimes
  ]) => ({
    id,
    clientId,
    description,
    lineColor,
    assetColorCode,
    directionStartName,
    directionEndName,
    svgFillColor1,
    svgFillColor2,
    isOpen: isClosed === 0,
    departureTimes
  }))

  const routePoints = routePointsRaw.map(([
    id,
    routeId,
    direction,
    order,
    markerId,
    lat,
    lng,
    type,
    distance,
    angle,
    seconds
  ]) => ({
    id,
    routeId,
    direction,
    order,
    markerId,
    lat,
    lng,
    type,
    distance,
    angle,
    seconds
  }))

  const config = Object.fromEntries(configRaw)

  const positions = positionsRaw.map(([
    assetId,
    driverId,
    when,
    speed,
    inputX,
    trail,
    status,
    msg,
    extendedDescription,
    routeId,
    routePointNextId,
    routePointPrevId
  ]) => {
    const { lat, lng } = parseLatLngFromTrail(trail)
    return {
      assetId,
      driverId,
      when,
      speed,
      inputX,
      trail,
      status,
      msg,
      extendedDescription,
      routeId,
      routePointNextId,
      routePointPrevId,
      lat,
      lng
    }
  })

  const stops = routePoints.filter(point => point.markerId !== null)

  return {
    assets,
    markers,
    routes,
    routePoints,
    stops,
    config,
    positions
  }
}
