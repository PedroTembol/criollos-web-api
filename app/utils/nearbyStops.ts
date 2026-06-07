export interface NearbyStop {
  markerId: number
  name: string
  lat: number
  lng: number
  distanceMeters: number
  distanceLabel: string
  routeCount: number
  routes: Array<{
    routeId: number
    routeName: string | null
    routeColor: string | null
    directionStartName: string | null
    directionEndName: string | null
  }>
}

export interface NearbyStopsSummary {
  origin: {
    lat: number
    lng: number
  }
  totalStops: number
  returnedStops: number
  nearestDistanceMeters: number | null
}

export interface NearbyStopsFeed {
  count: number
  summary: NearbyStopsSummary
  data: NearbyStop[]
}

interface NearbyStopsSummaryCard {
  id: string
  label: string
  value: string
  hint: string
  tone: 'healthy' | 'warning' | 'critical' | 'neutral'
}

function formatCount(value: number, singular: string, plural: string): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

export function getNearbyStopsSummaryCards(
  summary?: NearbyStopsSummary | null,
  count = 0
): NearbyStopsSummaryCard[] {
  const nearestDistance = summary?.nearestDistanceMeters ?? null

  return [
    {
      id: 'nearest',
      label: 'Parada más cercana',
      value:
        nearestDistance !== null
          ? nearestDistance < 1000
            ? `${nearestDistance} m`
            : `${(nearestDistance / 1000).toFixed(1)} km`
          : 'Sin lectura',
      hint:
        nearestDistance !== null
          ? nearestDistance <= 300
            ? 'A pasos de tu ubicación.'
            : nearestDistance <= 800
              ? 'A unos minutos caminando.'
              : 'Requiere caminata larga o transporte.'
          : 'Activa tu GPS para encontrar paradas.',
      tone:
        nearestDistance === null
          ? 'neutral'
          : nearestDistance <= 500
            ? 'healthy'
            : nearestDistance <= 1500
              ? 'warning'
              : 'critical',
    },
    {
      id: 'coverage',
      label: 'Opciones de movilidad',
      value: formatCount(count, 'parada visible', 'paradas visibles'),
      hint: summary?.totalStops
        ? `Hay ${formatCount(summary.totalStops, 'parada en total', 'paradas en total')} en el catálogo cerca de ti.`
        : 'No detectamos paradas oficiales en este radio.',
      tone: count >= 3 ? 'healthy' : count > 0 ? 'warning' : 'critical',
    },
  ]
}

export function getUserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!process.client || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}
