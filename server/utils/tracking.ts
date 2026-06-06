import type {
  Asset,
  BootstrapData,
  Marker,
  Position,
  Route,
  RoutePoint,
} from './normalize'

export type TrackingStopSummary = {
  routePointId: number
  markerId: number | null
  name: string | null
  lat: number | null
  lng: number | null
  order: number
  seconds: number
}

export type TrackingVehicleSnapshot = {
  assetId: number
  label: string
  driverId: number
  routeId: number
  routeName: string | null
  routeColor: string | null
  directionStartName: string | null
  directionEndName: string | null
  status: number
  statusLabel: string
  message: string
  speed: number
  when: string
  freshnessSeconds: number | null
  freshnessLabel: 'live' | 'stale' | 'unknown'
  lat: number | null
  lng: number | null
  nextStop: TrackingStopSummary | null
  nextStopEtaSeconds: number | null
  previousStop: TrackingStopSummary | null
}

export type TrackingBounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export type TrackingRouteLeadVehicle = {
  assetId: number
  label: string
  statusLabel: TrackingVehicleSnapshot['statusLabel']
  freshnessLabel: TrackingVehicleSnapshot['freshnessLabel']
  freshnessSeconds: number | null
  when: string
  nextStopName: string | null
  nextStopEtaSeconds: number | null
  previousStopName: string | null
  message: string
}

export type TrackingUpcomingStopVehicle = {
  assetId: number
  label: string
  routeId: number
  routeName: string | null
  routeColor: string | null
  freshnessLabel: TrackingVehicleSnapshot['freshnessLabel']
  nextStopEtaSeconds: number | null
}

export type TrackingUpcomingStopSummary = {
  stopKey: string
  routePointId: number
  markerId: number | null
  name: string
  lat: number | null
  lng: number | null
  arrivalCount: number
  liveVehicleCount: number
  routeIds: number[]
  routeNames: string[]
  nextArrivalEtaSeconds: number | null
  vehicles: TrackingUpcomingStopVehicle[]
}

export type TrackingRouteHealthLabel =
  | 'operational'
  | 'delayed'
  | 'offline'
  | 'no-signal'

export type TrackingDataQualitySeverity = 'info' | 'warning' | 'critical'

export type TrackingDataQualityIssue = {
  id: string
  severity: TrackingDataQualitySeverity
  title: string
  message: string
  count: number
  affectedAssetIds: number[]
}

export type TrackingDataQualitySummary = {
  totalVehicles: number
  completeVehicleCount: number
  qualityPercent: number
  missingCoordinateVehicles: number
  missingNextStopVehicles: number
  missingPreviousStopVehicles: number
  missingRouteNameVehicles: number
  unknownFreshnessVehicles: number
  unknownStatusVehicles: number
  issues: TrackingDataQualityIssue[]
}

export type TrackingTelemetryAgeSummary = {
  knownVehicleCount: number
  unknownVehicleCount: number
  newestAgeSeconds: number | null
  oldestAgeSeconds: number | null
  medianAgeSeconds: number | null
  p90AgeSeconds: number | null
}

export type TrackingRouteSummary = {
  routeId: number
  routeName: string | null
  routeColor: string | null
  directionStartName: string | null
  directionEndName: string | null
  totalVehicles: number
  liveVehicles: number
  staleVehicles: number
  unknownVehicles: number
  movingVehicles: number
  stoppedVehicles: number
  idleVehicles: number
  vehicleLabels: string[]
  nextStops: string[]
  lastReportedAt: string | null
  leadVehicle: TrackingRouteLeadVehicle | null
  telemetry: TrackingTelemetryAgeSummary
  healthLabel: TrackingRouteHealthLabel
  coveragePercent: number
}

export type TrackingFreshnessBuckets = {
  live: number
  delayed: number
  offline: number
  unknown: number
}

export type TrackingServiceHealth = {
  status: 'healthy' | 'degraded' | 'offline'
  coveragePercent: number
  liveCoveragePercent: number
  routeHealth: Record<TrackingRouteHealthLabel, number>
}

export type TrackingAlertSeverity = 'warning' | 'critical'

export type TrackingSummaryAlert = {
  id: string
  dedupeKey: string
  scope: 'service' | 'route'
  severity: TrackingAlertSeverity
  title: string
  message: string
  routeId: number | null
  routeName: string | null
  healthLabel: TrackingRouteHealthLabel | null
  coveragePercent: number | null
  liveVehicles: number | null
  totalVehicles: number | null
  lastReportedAt: string | null
}

export type TrackingSummary = {
  totalVehicles: number
  filteredVehicles: number
  liveVehicles: number
  staleVehicles: number
  unknownVehicles: number
  movingVehicles: number
  stoppedVehicles: number
  idleVehicles: number
  unknownStatusVehicles: number
  routeIds: number[]
  routes: TrackingRouteSummary[]
  upcomingStops: TrackingUpcomingStopSummary[]
  bounds: TrackingBounds | null
  freshnessBuckets: TrackingFreshnessBuckets
  telemetry: TrackingTelemetryAgeSummary
  dataQuality: TrackingDataQualitySummary
  serviceHealth: TrackingServiceHealth
  alerts: TrackingSummaryAlert[]
}

export type TrackingSnapshot = {
  vehicles: TrackingVehicleSnapshot[]
  fetchedAt: string
  summary: TrackingSummary
}

export type TrackingFilters = {
  assetIds?: number[]
  routeIds?: number[]
  statuses?: TrackingVehicleSnapshot['statusLabel'][]
  freshness?: TrackingVehicleSnapshot['freshnessLabel'][]
  limit?: number | null
}

function getStatusLabel(status: number, speed: number) {
  if (speed > 0) {
    return 'moving'
  }

  if (status === 0) {
    return 'idle'
  }

  if (status === 1) {
    return 'stopped'
  }

  return 'unknown'
}

function getFreshnessSeconds(when: string, now = new Date()) {
  const at = new Date(when)
  if (Number.isNaN(at.getTime())) {
    return null
  }

  return Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000))
}

function getFreshnessLabel(
  freshnessSeconds: number | null
): 'live' | 'stale' | 'unknown' {
  if (freshnessSeconds === null) {
    return 'unknown'
  }

  return freshnessSeconds <= 120 ? 'live' : 'stale'
}

function getFreshnessBucket(
  freshnessSeconds: number | null
): keyof TrackingFreshnessBuckets {
  if (freshnessSeconds === null) {
    return 'unknown'
  }

  if (freshnessSeconds <= 120) {
    return 'live'
  }

  if (freshnessSeconds <= 300) {
    return 'delayed'
  }

  return 'offline'
}

function toStopSummary(
  point: RoutePoint | undefined,
  markersById: Map<number, Marker>
): TrackingStopSummary | null {
  if (!point) {
    return null
  }

  const marker =
    point.markerId !== null ? markersById.get(point.markerId) : undefined

  return {
    routePointId: point.id,
    markerId: point.markerId,
    name: marker?.description ?? null,
    lat: marker?.lat ?? point.lat ?? null,
    lng: marker?.lng ?? point.lng ?? null,
    order: point.order,
    seconds: point.seconds,
  }
}

function getAdjacentStop(
  positionsPointId: number,
  routePointsByRoute: Map<number, RoutePoint[]>,
  direction: 'next' | 'previous'
) {
  const routePoints = Array.from(routePointsByRoute.values()).flat()
  const currentPoint = routePoints.find(
    (point) => point.id === positionsPointId
  )
  if (!currentPoint) {
    return null
  }

  const sameLanePoints = (
    routePointsByRoute.get(currentPoint.routeId) || []
  ).filter(
    (point) =>
      point.direction === currentPoint.direction && point.markerId !== null
  )

  const candidates = sameLanePoints.filter((point) =>
    direction === 'next'
      ? point.order >= currentPoint.order
      : point.order <= currentPoint.order
  )

  const ordered = candidates.sort((a, b) =>
    direction === 'next' ? a.order - b.order : b.order - a.order
  )

  return ordered[0] || null
}

function getNextStopEtaSeconds(
  routePointNextId: number,
  nextStop: TrackingStopSummary | null,
  routePointsByRoute: Map<number, RoutePoint[]>
) {
  if (!nextStop) {
    return null
  }

  const routePoints = Array.from(routePointsByRoute.values()).flat()
  const nextPoint = routePoints.find((point) => point.id === routePointNextId)
  if (!nextPoint) {
    return null
  }

  return Math.max(0, nextStop.seconds - nextPoint.seconds)
}

function createTrackingVehicleSnapshot(
  position: Position,
  assetsById: Map<number, Asset>,
  routesById: Map<number, Route>,
  markersById: Map<number, Marker>,
  routePointsByRoute: Map<number, RoutePoint[]>,
  now: Date
): TrackingVehicleSnapshot {
  const asset = assetsById.get(position.assetId)
  const route = routesById.get(position.routeId)
  const freshnessSeconds = getFreshnessSeconds(position.when, now)
  const nextPoint = getAdjacentStop(
    position.routePointNextId,
    routePointsByRoute,
    'next'
  )
  const previousPoint = getAdjacentStop(
    position.routePointPrevId,
    routePointsByRoute,
    'previous'
  )
  const nextStop = toStopSummary(nextPoint ?? undefined, markersById)

  return {
    assetId: position.assetId,
    label: asset?.description || `Unidad ${position.assetId}`,
    driverId: position.driverId,
    routeId: position.routeId,
    routeName: route?.description ?? null,
    routeColor: route?.lineColor ?? null,
    directionStartName: route?.directionStartName ?? null,
    directionEndName: route?.directionEndName ?? null,
    status: position.status,
    statusLabel: getStatusLabel(position.status, position.speed),
    message: position.msg || position.extendedDescription || '',
    speed: position.speed,
    when: position.when,
    freshnessSeconds,
    freshnessLabel: getFreshnessLabel(freshnessSeconds),
    lat: position.lat,
    lng: position.lng,
    nextStop,
    nextStopEtaSeconds: getNextStopEtaSeconds(
      position.routePointNextId,
      nextStop,
      routePointsByRoute
    ),
    previousStop: toStopSummary(previousPoint ?? undefined, markersById),
  }
}

function sortVehiclesByFreshness(vehicles: TrackingVehicleSnapshot[]) {
  return [...vehicles].sort((left, right) => {
    const leftFreshness = left.freshnessSeconds ?? Number.POSITIVE_INFINITY
    const rightFreshness = right.freshnessSeconds ?? Number.POSITIVE_INFINITY
    if (leftFreshness !== rightFreshness) {
      return leftFreshness - rightFreshness
    }

    return left.assetId - right.assetId
  })
}

export function filterTrackingSnapshot(
  snapshot: TrackingSnapshot,
  filters: TrackingFilters = {}
): TrackingSnapshot {
  let vehicles = sortVehiclesByFreshness(snapshot.vehicles)

  if (filters.assetIds?.length) {
    const allowed = new Set(filters.assetIds)
    vehicles = vehicles.filter((vehicle) => allowed.has(vehicle.assetId))
  }

  if (filters.routeIds?.length) {
    const allowed = new Set(filters.routeIds)
    vehicles = vehicles.filter((vehicle) => allowed.has(vehicle.routeId))
  }

  if (filters.statuses?.length) {
    const allowed = new Set(filters.statuses)
    vehicles = vehicles.filter((vehicle) => allowed.has(vehicle.statusLabel))
  }

  if (filters.freshness?.length) {
    const allowed = new Set(filters.freshness)
    vehicles = vehicles.filter((vehicle) => allowed.has(vehicle.freshnessLabel))
  }

  if (filters.limit && filters.limit > 0) {
    vehicles = vehicles.slice(0, filters.limit)
  }

  return {
    fetchedAt: snapshot.fetchedAt,
    vehicles,
    summary: buildTrackingSummary(snapshot.vehicles, vehicles),
  }
}

function toRouteLeadVehicle(
  vehicle: TrackingVehicleSnapshot | undefined
): TrackingRouteLeadVehicle | null {
  if (!vehicle) {
    return null
  }

  return {
    assetId: vehicle.assetId,
    label: vehicle.label,
    statusLabel: vehicle.statusLabel,
    freshnessLabel: vehicle.freshnessLabel,
    freshnessSeconds: vehicle.freshnessSeconds,
    when: vehicle.when,
    nextStopName: vehicle.nextStop?.name ?? null,
    nextStopEtaSeconds: vehicle.nextStopEtaSeconds,
    previousStopName: vehicle.previousStop?.name ?? null,
    message: vehicle.message,
  }
}

function getLastReportedAt(vehicles: TrackingVehicleSnapshot[]): string | null {
  const timestamps = vehicles
    .map((vehicle) => new Date(vehicle.when).getTime())
    .filter((timestamp) => Number.isFinite(timestamp))

  if (!timestamps.length) {
    return null
  }

  return new Date(Math.max(...timestamps)).toISOString()
}

function getPercent(numerator: number, denominator: number) {
  if (!denominator) {
    return 0
  }

  return Math.round((numerator / denominator) * 100)
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) {
    return null
  }

  const ordered = [...values].sort((a, b) => a - b)
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * ordered.length) - 1)
  )

  return ordered[index]
}

function median(values: number[]) {
  if (!values.length) {
    return null
  }

  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)

  if (ordered.length % 2 === 1) {
    return ordered[middle]
  }

  return Math.round((ordered[middle - 1] + ordered[middle]) / 2)
}

function buildTelemetryAgeSummary(
  vehicles: TrackingVehicleSnapshot[]
): TrackingTelemetryAgeSummary {
  const knownAges = vehicles
    .map((vehicle) => vehicle.freshnessSeconds)
    .filter((age): age is number => age !== null)
    .sort((a, b) => a - b)

  return {
    knownVehicleCount: knownAges.length,
    unknownVehicleCount: vehicles.length - knownAges.length,
    newestAgeSeconds: knownAges[0] ?? null,
    oldestAgeSeconds: knownAges[knownAges.length - 1] ?? null,
    medianAgeSeconds: median(knownAges),
    p90AgeSeconds: percentile(knownAges, 90),
  }
}

function buildDataQualityIssue(
  id: string,
  severity: TrackingDataQualitySeverity,
  title: string,
  message: string,
  vehicles: TrackingVehicleSnapshot[]
): TrackingDataQualityIssue | null {
  if (!vehicles.length) {
    return null
  }

  return {
    id,
    severity,
    title,
    message,
    count: vehicles.length,
    affectedAssetIds: vehicles
      .map((vehicle) => vehicle.assetId)
      .sort((a, b) => a - b),
  }
}

function buildDataQualitySummary(
  vehicles: TrackingVehicleSnapshot[]
): TrackingDataQualitySummary {
  const missingCoordinates = vehicles.filter(
    (vehicle) => vehicle.lat === null || vehicle.lng === null
  )
  const missingNextStop = vehicles.filter((vehicle) => !vehicle.nextStop?.name)
  const missingPreviousStop = vehicles.filter(
    (vehicle) => !vehicle.previousStop?.name
  )
  const missingRouteName = vehicles.filter((vehicle) => !vehicle.routeName)
  const unknownFreshness = vehicles.filter(
    (vehicle) => vehicle.freshnessSeconds === null
  )
  const unknownStatus = vehicles.filter(
    (vehicle) => vehicle.statusLabel === 'unknown'
  )

  const incompleteAssetIds = new Set<number>(
    [
      ...missingCoordinates,
      ...missingNextStop,
      ...missingPreviousStop,
      ...missingRouteName,
      ...unknownFreshness,
      ...unknownStatus,
    ].map((vehicle) => vehicle.assetId)
  )

  const completeVehicleCount = vehicles.length - incompleteAssetIds.size
  const issues = [
    buildDataQualityIssue(
      'missing-coordinates',
      missingCoordinates.length === vehicles.length ? 'critical' : 'warning',
      'Unidades sin coordenadas',
      'Estas unidades no pueden ubicarse en el mapa hasta que reporten latitud y longitud válidas.',
      missingCoordinates
    ),
    buildDataQualityIssue(
      'missing-next-stop',
      'warning',
      'Unidades sin próxima parada',
      'El sistema no pudo resolver la próxima parada para estas unidades.',
      missingNextStop
    ),
    buildDataQualityIssue(
      'missing-previous-stop',
      'info',
      'Unidades sin parada anterior',
      'La referencia de parada anterior no está disponible para estas unidades.',
      missingPreviousStop
    ),
    buildDataQualityIssue(
      'missing-route-name',
      'warning',
      'Unidades sin nombre de ruta',
      'Estas unidades apuntan a rutas que no tienen metadata descriptiva en el catálogo.',
      missingRouteName
    ),
    buildDataQualityIssue(
      'unknown-freshness',
      unknownFreshness.length === vehicles.length ? 'critical' : 'warning',
      'Unidades sin timestamp válido',
      'Estas unidades no tienen una hora de reporte válida para calcular frescura de señal.',
      unknownFreshness
    ),
    buildDataQualityIssue(
      'unknown-status',
      'info',
      'Unidades con estado desconocido',
      'El código de estado o velocidad no permitió clasificar estas unidades como en movimiento, detenidas o en espera.',
      unknownStatus
    ),
  ].filter((issue): issue is TrackingDataQualityIssue => Boolean(issue))

  return {
    totalVehicles: vehicles.length,
    completeVehicleCount,
    qualityPercent: getPercent(completeVehicleCount, vehicles.length),
    missingCoordinateVehicles: missingCoordinates.length,
    missingNextStopVehicles: missingNextStop.length,
    missingPreviousStopVehicles: missingPreviousStop.length,
    missingRouteNameVehicles: missingRouteName.length,
    unknownFreshnessVehicles: unknownFreshness.length,
    unknownStatusVehicles: unknownStatus.length,
    issues,
  }
}

function getRouteHealthLabel(
  routeVehicles: TrackingVehicleSnapshot[]
): TrackingRouteHealthLabel {
  const buckets = routeVehicles.map((vehicle) =>
    getFreshnessBucket(vehicle.freshnessSeconds)
  )

  if (buckets.includes('live')) {
    return 'operational'
  }

  if (buckets.includes('delayed')) {
    return 'delayed'
  }

  if (buckets.includes('offline')) {
    return 'offline'
  }

  return 'no-signal'
}

function getServiceStatus(
  routeHealth: TrackingServiceHealth['routeHealth']
): TrackingServiceHealth['status'] {
  if (
    routeHealth.operational > 0 &&
    routeHealth.delayed === 0 &&
    routeHealth.offline === 0 &&
    routeHealth['no-signal'] === 0
  ) {
    return 'healthy'
  }

  if (routeHealth.operational > 0 || routeHealth.delayed > 0) {
    return 'degraded'
  }

  return 'offline'
}

function formatRouteName(
  route: Pick<TrackingRouteSummary, 'routeId' | 'routeName'>
) {
  return route.routeName || `Ruta ${route.routeId}`
}

function formatCountLabel(value: number, singular: string, plural: string) {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function buildServiceAlert(
  serviceHealth: TrackingServiceHealth,
  totalVehicles: number,
  liveVehicles: number
): TrackingSummaryAlert | null {
  if (serviceHealth.status === 'healthy') {
    return null
  }

  const delayedRoutes = serviceHealth.routeHealth.delayed || 0
  const offlineRoutes = serviceHealth.routeHealth.offline || 0
  const noSignalRoutes = serviceHealth.routeHealth['no-signal'] || 0
  const visibleVehiclesLabel = formatCountLabel(
    totalVehicles,
    'unidad visible',
    'unidades visibles'
  )

  if (serviceHealth.status === 'offline') {
    return {
      id: 'service-offline',
      dedupeKey: 'tracking:service:offline',
      scope: 'service',
      severity: 'critical',
      title: 'Servicio sin señal confiable',
      message: `${serviceHealth.coveragePercent}% de cobertura en ${visibleVehiclesLabel}. ${formatCountLabel(offlineRoutes, 'ruta offline', 'rutas offline')} y ${formatCountLabel(noSignalRoutes, 'ruta sin señal', 'rutas sin señal')}.`,
      routeId: null,
      routeName: null,
      healthLabel: null,
      coveragePercent: serviceHealth.coveragePercent,
      liveVehicles,
      totalVehicles,
      lastReportedAt: null,
    }
  }

  return {
    id: 'service-degraded',
    dedupeKey: 'tracking:service:degraded',
    scope: 'service',
    severity: 'warning',
    title: 'Servicio degradado',
    message: `${serviceHealth.coveragePercent}% de cobertura en ${visibleVehiclesLabel}. ${formatCountLabel(delayedRoutes, 'ruta retrasada', 'rutas retrasadas')}, ${formatCountLabel(offlineRoutes, 'ruta offline', 'rutas offline')} y ${formatCountLabel(noSignalRoutes, 'ruta sin señal', 'rutas sin señal')}.`,
    routeId: null,
    routeName: null,
    healthLabel: null,
    coveragePercent: serviceHealth.coveragePercent,
    liveVehicles,
    totalVehicles,
    lastReportedAt: null,
  }
}

function buildRouteAlert(
  route: TrackingRouteSummary
): TrackingSummaryAlert | null {
  if (route.healthLabel === 'operational') {
    return null
  }

  const routeName = formatRouteName(route)
  const liveVehiclesLabel = formatCountLabel(
    route.liveVehicles,
    'unidad en vivo',
    'unidades en vivo'
  )
  const totalVehiclesLabel = formatCountLabel(
    route.totalVehicles,
    'unidad visible',
    'unidades visibles'
  )

  if (route.healthLabel === 'delayed') {
    return {
      id: `route-${route.routeId}-delayed`,
      dedupeKey: `tracking:route:${route.routeId}:delayed`,
      scope: 'route',
      severity: 'warning',
      title: `${routeName} con señal retrasada`,
      message: `${route.coveragePercent}% de cobertura, ${liveVehiclesLabel} de ${totalVehiclesLabel}. Último reporte ${route.lastReportedAt || 'no disponible'}.`,
      routeId: route.routeId,
      routeName,
      healthLabel: route.healthLabel,
      coveragePercent: route.coveragePercent,
      liveVehicles: route.liveVehicles,
      totalVehicles: route.totalVehicles,
      lastReportedAt: route.lastReportedAt,
    }
  }

  const statusCopy =
    route.healthLabel === 'offline'
      ? 'sin unidades reportando'
      : 'sin señal utilizable'

  return {
    id: `route-${route.routeId}-${route.healthLabel}`,
    dedupeKey: `tracking:route:${route.routeId}:${route.healthLabel}`,
    scope: 'route',
    severity: 'critical',
    title: `${routeName} ${statusCopy}`,
    message: `${route.coveragePercent}% de cobertura, ${liveVehiclesLabel} de ${totalVehiclesLabel}. Último reporte ${route.lastReportedAt || 'no disponible'}.`,
    routeId: route.routeId,
    routeName,
    healthLabel: route.healthLabel,
    coveragePercent: route.coveragePercent,
    liveVehicles: route.liveVehicles,
    totalVehicles: route.totalVehicles,
    lastReportedAt: route.lastReportedAt,
  }
}

function buildTrackingAlerts(
  routes: TrackingRouteSummary[],
  serviceHealth: TrackingServiceHealth,
  totalVehicles: number,
  liveVehicles: number
): TrackingSummaryAlert[] {
  const routeAlerts = routes
    .map((route) => buildRouteAlert(route))
    .filter((alert): alert is TrackingSummaryAlert => Boolean(alert))
    .sort((left, right) => {
      const severityRank = { critical: 0, warning: 1 }
      if (severityRank[left.severity] !== severityRank[right.severity]) {
        return severityRank[left.severity] - severityRank[right.severity]
      }

      const coverageDelta =
        (left.coveragePercent ?? 0) - (right.coveragePercent ?? 0)
      if (coverageDelta !== 0) {
        return coverageDelta
      }

      return (left.routeName || '').localeCompare(right.routeName || '')
    })

  const serviceAlert = buildServiceAlert(
    serviceHealth,
    totalVehicles,
    liveVehicles
  )

  return serviceAlert ? [serviceAlert, ...routeAlerts] : routeAlerts
}

function sortVehiclesByEta(vehicles: TrackingVehicleSnapshot[]) {
  return [...vehicles].sort((left, right) => {
    const leftEta = left.nextStopEtaSeconds ?? Number.POSITIVE_INFINITY
    const rightEta = right.nextStopEtaSeconds ?? Number.POSITIVE_INFINITY

    if (leftEta !== rightEta) {
      return leftEta - rightEta
    }

    const leftFreshness = left.freshnessSeconds ?? Number.POSITIVE_INFINITY
    const rightFreshness = right.freshnessSeconds ?? Number.POSITIVE_INFINITY

    if (leftFreshness !== rightFreshness) {
      return leftFreshness - rightFreshness
    }

    return left.assetId - right.assetId
  })
}

function buildUpcomingStops(
  filteredVehicles: TrackingVehicleSnapshot[]
): TrackingUpcomingStopSummary[] {
  const grouped = new Map<string, TrackingVehicleSnapshot[]>()

  filteredVehicles.forEach((vehicle) => {
    const stop = vehicle.nextStop
    if (!stop?.name) {
      return
    }

    const stopKey =
      stop.markerId !== null
        ? `marker-${stop.markerId}`
        : `route-point-${stop.routePointId}`
    const current = grouped.get(stopKey) || []
    current.push(vehicle)
    grouped.set(stopKey, current)
  })

  return Array.from(grouped.entries())
    .map(([stopKey, vehicles]) => {
      const orderedVehicles = sortVehiclesByEta(vehicles)
      const firstStop = orderedVehicles[0]?.nextStop
      const nextArrivalEtaSeconds =
        orderedVehicles.find((vehicle) => vehicle.nextStopEtaSeconds !== null)
          ?.nextStopEtaSeconds ?? null

      return {
        stopKey,
        routePointId: firstStop?.routePointId ?? 0,
        markerId: firstStop?.markerId ?? null,
        name: firstStop?.name ?? 'Parada sin nombre',
        lat: firstStop?.lat ?? null,
        lng: firstStop?.lng ?? null,
        arrivalCount: orderedVehicles.length,
        liveVehicleCount: orderedVehicles.filter(
          (vehicle) => vehicle.freshnessLabel === 'live'
        ).length,
        routeIds: [
          ...new Set(orderedVehicles.map((vehicle) => vehicle.routeId)),
        ],
        routeNames: [
          ...new Set(
            orderedVehicles.map((vehicle) => vehicle.routeName).filter(Boolean)
          ),
        ] as string[],
        nextArrivalEtaSeconds,
        vehicles: orderedVehicles.map((vehicle) => ({
          assetId: vehicle.assetId,
          label: vehicle.label,
          routeId: vehicle.routeId,
          routeName: vehicle.routeName,
          routeColor: vehicle.routeColor,
          freshnessLabel: vehicle.freshnessLabel,
          nextStopEtaSeconds: vehicle.nextStopEtaSeconds,
        })),
      }
    })
    .sort((left, right) => {
      const leftEta = left.nextArrivalEtaSeconds ?? Number.POSITIVE_INFINITY
      const rightEta = right.nextArrivalEtaSeconds ?? Number.POSITIVE_INFINITY

      if (leftEta !== rightEta) {
        return leftEta - rightEta
      }

      if (left.arrivalCount !== right.arrivalCount) {
        return right.arrivalCount - left.arrivalCount
      }

      return left.name.localeCompare(right.name)
    })
}

function buildTrackingSummary(
  allVehicles: TrackingVehicleSnapshot[],
  filteredVehicles = allVehicles
): TrackingSummary {
  const vehiclesWithCoordinates = filteredVehicles.filter(
    (vehicle) => vehicle.lat !== null && vehicle.lng !== null
  )

  const bounds = vehiclesWithCoordinates.length
    ? {
        minLat: Math.min(
          ...vehiclesWithCoordinates.map((vehicle) => vehicle.lat as number)
        ),
        maxLat: Math.max(
          ...vehiclesWithCoordinates.map((vehicle) => vehicle.lat as number)
        ),
        minLng: Math.min(
          ...vehiclesWithCoordinates.map((vehicle) => vehicle.lng as number)
        ),
        maxLng: Math.max(
          ...vehiclesWithCoordinates.map((vehicle) => vehicle.lng as number)
        ),
      }
    : null

  const routes = [
    ...new Set(filteredVehicles.map((vehicle) => vehicle.routeId)),
  ]
    .sort((a, b) => a - b)
    .map((routeId) => {
      const routeVehicles = filteredVehicles.filter(
        (vehicle) => vehicle.routeId === routeId
      )
      const firstVehicle = routeVehicles[0]
      const knownFreshnessVehicles = routeVehicles.filter(
        (vehicle) => vehicle.freshnessSeconds !== null
      )
      const healthLabel = getRouteHealthLabel(routeVehicles)

      return {
        routeId,
        routeName: firstVehicle?.routeName ?? null,
        routeColor: firstVehicle?.routeColor ?? null,
        directionStartName: firstVehicle?.directionStartName ?? null,
        directionEndName: firstVehicle?.directionEndName ?? null,
        totalVehicles: routeVehicles.length,
        liveVehicles: routeVehicles.filter(
          (vehicle) => vehicle.freshnessLabel === 'live'
        ).length,
        staleVehicles: routeVehicles.filter(
          (vehicle) => vehicle.freshnessLabel === 'stale'
        ).length,
        unknownVehicles: routeVehicles.filter(
          (vehicle) => vehicle.freshnessLabel === 'unknown'
        ).length,
        movingVehicles: routeVehicles.filter(
          (vehicle) => vehicle.statusLabel === 'moving'
        ).length,
        stoppedVehicles: routeVehicles.filter(
          (vehicle) => vehicle.statusLabel === 'stopped'
        ).length,
        idleVehicles: routeVehicles.filter(
          (vehicle) => vehicle.statusLabel === 'idle'
        ).length,
        vehicleLabels: routeVehicles.map((vehicle) => vehicle.label),
        nextStops: [
          ...new Set(
            routeVehicles
              .map((vehicle) => vehicle.nextStop?.name)
              .filter(Boolean)
          ),
        ] as string[],
        lastReportedAt: getLastReportedAt(routeVehicles),
        leadVehicle: toRouteLeadVehicle(firstVehicle),
        telemetry: buildTelemetryAgeSummary(routeVehicles),
        healthLabel,
        coveragePercent: getPercent(
          knownFreshnessVehicles.length,
          routeVehicles.length
        ),
      }
    })

  const freshnessBuckets = filteredVehicles.reduce<TrackingFreshnessBuckets>(
    (accumulator, vehicle) => {
      accumulator[getFreshnessBucket(vehicle.freshnessSeconds)] += 1
      return accumulator
    },
    {
      live: 0,
      delayed: 0,
      offline: 0,
      unknown: 0,
    }
  )

  const routeHealth = routes.reduce<TrackingServiceHealth['routeHealth']>(
    (accumulator, route) => {
      accumulator[route.healthLabel] += 1
      return accumulator
    },
    {
      operational: 0,
      delayed: 0,
      offline: 0,
      'no-signal': 0,
    }
  )

  const knownFreshnessVehicles = filteredVehicles.filter(
    (vehicle) => vehicle.freshnessSeconds !== null
  )
  const serviceHealth = {
    status: getServiceStatus(routeHealth),
    coveragePercent: getPercent(
      knownFreshnessVehicles.length,
      filteredVehicles.length
    ),
    liveCoveragePercent: getPercent(
      freshnessBuckets.live,
      filteredVehicles.length
    ),
    routeHealth,
  }

  return {
    totalVehicles: allVehicles.length,
    filteredVehicles: filteredVehicles.length,
    liveVehicles: filteredVehicles.filter(
      (vehicle) => vehicle.freshnessLabel === 'live'
    ).length,
    staleVehicles: filteredVehicles.filter(
      (vehicle) => vehicle.freshnessLabel === 'stale'
    ).length,
    unknownVehicles: filteredVehicles.filter(
      (vehicle) => vehicle.freshnessLabel === 'unknown'
    ).length,
    movingVehicles: filteredVehicles.filter(
      (vehicle) => vehicle.statusLabel === 'moving'
    ).length,
    stoppedVehicles: filteredVehicles.filter(
      (vehicle) => vehicle.statusLabel === 'stopped'
    ).length,
    idleVehicles: filteredVehicles.filter(
      (vehicle) => vehicle.statusLabel === 'idle'
    ).length,
    unknownStatusVehicles: filteredVehicles.filter(
      (vehicle) => vehicle.statusLabel === 'unknown'
    ).length,
    routeIds: routes.map((route) => route.routeId),
    routes,
    upcomingStops: buildUpcomingStops(filteredVehicles),
    bounds,
    freshnessBuckets,
    telemetry: buildTelemetryAgeSummary(filteredVehicles),
    dataQuality: buildDataQualitySummary(filteredVehicles),
    serviceHealth,
    alerts: buildTrackingAlerts(
      routes,
      serviceHealth,
      filteredVehicles.length,
      freshnessBuckets.live
    ),
  }
}

export function buildTrackingSnapshot(
  data: BootstrapData,
  fetchedAt: string,
  now = new Date()
): TrackingSnapshot {
  const assetsById = new Map<number, Asset>(
    data.assets.map((asset) => [asset.id, asset])
  )
  const routesById = new Map<number, Route>(
    data.routes.map((route) => [route.id, route])
  )
  const markersById = new Map<number, Marker>(
    data.markers.map((marker) => [marker.id, marker])
  )
  const routePointsByRoute = new Map<number, RoutePoint[]>()

  data.routePoints.forEach((point) => {
    const current = routePointsByRoute.get(point.routeId) || []
    current.push(point)
    routePointsByRoute.set(point.routeId, current)
  })

  const vehicles = sortVehiclesByFreshness(
    data.positions.map((position: Position) =>
      createTrackingVehicleSnapshot(
        position,
        assetsById,
        routesById,
        markersById,
        routePointsByRoute,
        now
      )
    )
  )

  return {
    vehicles,
    fetchedAt,
    summary: buildTrackingSummary(vehicles),
  }
}

export const trackingTestables = {
  getStatusLabel,
  getFreshnessSeconds,
  getFreshnessLabel,
  getFreshnessBucket,
  buildTelemetryAgeSummary,
  buildDataQualitySummary,
  getRouteHealthLabel,
  getServiceStatus,
}
