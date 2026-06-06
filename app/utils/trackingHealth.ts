export interface TrackingHealthSummaryInput {
  freshnessBuckets?: {
    live?: number | null
    delayed?: number | null
    offline?: number | null
    unknown?: number | null
  } | null
  dataQuality?: {
    qualityPercent?: number | null
    completeVehicleCount?: number | null
    totalVehicles?: number | null
    issues?: Array<{
      id?: string | null
      severity?: 'info' | 'warning' | 'critical' | null
      title?: string | null
      count?: number | null
    }> | null
  } | null
  serviceHealth?: {
    status?: 'healthy' | 'degraded' | 'offline' | null
    coveragePercent?: number | null
    liveCoveragePercent?: number | null
    routeHealth?: {
      operational?: number | null
      delayed?: number | null
      offline?: number | null
      'no-signal'?: number | null
    } | null
  } | null
  routes?: Array<{
    routeId?: number | null
    routeName?: string | null
    healthLabel?: 'operational' | 'delayed' | 'offline' | 'no-signal' | null
    coveragePercent?: number | null
    liveVehicles?: number | null
    totalVehicles?: number | null
    lastReportedAt?: string | null
  }> | null
}

interface TrackingHealthCard {
  id: string
  label: string
  value: string
  hint: string
  tone: 'healthy' | 'warning' | 'critical' | 'neutral'
}

interface TrackingAlertRoute {
  id: string
  routeId: number | null
  routeName: string
  label: string
  tone: TrackingHealthCard['tone']
  hint: string
}

function formatPercent(value?: number | null): string {
  return `${Math.max(0, value || 0)}%`
}

function formatCount(value: number, singular: string, plural: string): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function formatStatus(
  status?: TrackingHealthSummaryInput['serviceHealth']['status']
): string {
  if (status === 'healthy') {
    return 'Saludable'
  }

  if (status === 'degraded') {
    return 'Degradado'
  }

  if (status === 'offline') {
    return 'Sin servicio'
  }

  return 'Sin lectura'
}

function getStatusTone(
  status?: TrackingHealthSummaryInput['serviceHealth']['status']
): TrackingHealthCard['tone'] {
  if (status === 'healthy') {
    return 'healthy'
  }

  if (status === 'degraded') {
    return 'warning'
  }

  if (status === 'offline') {
    return 'critical'
  }

  return 'neutral'
}

function formatRouteHealthBreakdown(
  summary?: TrackingHealthSummaryInput | null
): string {
  const routeHealth = summary?.serviceHealth?.routeHealth
  const parts = [
    {
      count: routeHealth?.operational || 0,
      singular: 'ruta operando',
      plural: 'rutas operando',
    },
    {
      count: routeHealth?.delayed || 0,
      singular: 'ruta retrasada',
      plural: 'rutas retrasadas',
    },
    {
      count: routeHealth?.offline || 0,
      singular: 'ruta offline',
      plural: 'rutas offline',
    },
    {
      count: routeHealth?.['no-signal'] || 0,
      singular: 'ruta sin señal',
      plural: 'rutas sin señal',
    },
  ].filter((entry) => entry.count > 0)

  if (!parts.length) {
    return 'Sin rutas visibles en este momento.'
  }

  return parts
    .map((entry) => formatCount(entry.count, entry.singular, entry.plural))
    .join(' · ')
}

export function getTrackingHealthCards(
  summary?: TrackingHealthSummaryInput | null,
  totalVehicles = 0
): TrackingHealthCard[] {
  const freshnessBuckets = summary?.freshnessBuckets
  const live = freshnessBuckets?.live || 0
  const delayed = freshnessBuckets?.delayed || 0
  const offline = freshnessBuckets?.offline || 0
  const unknown = freshnessBuckets?.unknown || 0
  const liveCoveragePercent = summary?.serviceHealth?.liveCoveragePercent || 0
  const coveragePercent = summary?.serviceHealth?.coveragePercent || 0
  const dataQualityPercent = summary?.dataQuality?.qualityPercent || 0
  const dataQualityIssues = summary?.dataQuality?.issues || []
  const firstQualityIssue = dataQualityIssues[0]

  return [
    {
      id: 'status',
      label: 'Estado del servicio',
      value: formatStatus(summary?.serviceHealth?.status),
      hint: formatRouteHealthBreakdown(summary),
      tone: getStatusTone(summary?.serviceHealth?.status),
    },
    {
      id: 'coverage',
      label: 'Cobertura de señal',
      value: formatPercent(coveragePercent),
      hint:
        totalVehicles > 0
          ? `${formatPercent(liveCoveragePercent)} de las unidades visibles reportan en vivo ahora mismo.`
          : 'Todavía no hay unidades visibles para calcular cobertura.',
      tone:
        coveragePercent >= 80
          ? 'healthy'
          : coveragePercent >= 40
            ? 'warning'
            : 'critical',
    },
    {
      id: 'freshness',
      label: 'Lecturas recientes',
      value: `${formatCount(live, 'unidad en vivo', 'unidades en vivo')}`,
      hint: [
        formatCount(delayed, 'unidad retrasada', 'unidades retrasadas'),
        formatCount(offline, 'unidad offline', 'unidades offline'),
        formatCount(unknown, 'unidad sin señal', 'unidades sin señal'),
      ].join(' · '),
      tone:
        offline > 0
          ? 'critical'
          : delayed > 0 || unknown > 0
            ? 'warning'
            : 'healthy',
    },
    {
      id: 'data-quality',
      label: 'Calidad de datos',
      value: formatPercent(dataQualityPercent),
      hint: firstQualityIssue
        ? `${firstQualityIssue.title || 'Dato incompleto'}: ${formatCount(firstQualityIssue.count || 0, 'unidad afectada', 'unidades afectadas')}.`
        : `${formatCount(summary?.dataQuality?.completeVehicleCount || 0, 'unidad completa', 'unidades completas')} de ${formatCount(summary?.dataQuality?.totalVehicles || totalVehicles, 'unidad visible', 'unidades visibles')}.`,
      tone:
        dataQualityPercent >= 90
          ? 'healthy'
          : dataQualityPercent >= 60
            ? 'warning'
            : 'critical',
    },
  ]
}

function formatRouteLabel(
  route?: TrackingHealthSummaryInput['routes'][number] | null
): string {
  if (route?.routeName) {
    return route.routeName
  }

  if (route?.routeId !== null && route?.routeId !== undefined) {
    return `Ruta ${route.routeId}`
  }

  return 'Ruta sin nombre'
}

function formatRouteHealthLabel(
  healthLabel?: TrackingHealthSummaryInput['routes'][number]['healthLabel']
) {
  if (healthLabel === 'delayed') {
    return 'Retrasada'
  }

  if (healthLabel === 'offline') {
    return 'Offline'
  }

  if (healthLabel === 'no-signal') {
    return 'Sin señal'
  }

  return 'Operando'
}

function getRouteTone(
  healthLabel?: TrackingHealthSummaryInput['routes'][number]['healthLabel']
): TrackingHealthCard['tone'] {
  if (healthLabel === 'offline' || healthLabel === 'no-signal') {
    return 'critical'
  }

  if (healthLabel === 'delayed') {
    return 'warning'
  }

  return 'healthy'
}

export function getTrackingAlertRoutes(
  summary?: TrackingHealthSummaryInput | null
): TrackingAlertRoute[] {
  const routes = summary?.routes || []

  return routes
    .filter(
      (route) => route?.healthLabel && route.healthLabel !== 'operational'
    )
    .map((route) => ({
      id: `${route.routeId || 'route'}-${route.healthLabel}`,
      routeId: route.routeId ?? null,
      routeName: formatRouteLabel(route),
      label: formatRouteHealthLabel(route.healthLabel),
      tone: getRouteTone(route.healthLabel),
      hint: `${formatPercent(route.coveragePercent)} de cobertura, ${formatCount(route.liveVehicles || 0, 'unidad en vivo', 'unidades en vivo')} de ${formatCount(route.totalVehicles || 0, 'unidad visible', 'unidades visibles')}.`,
    }))
}
