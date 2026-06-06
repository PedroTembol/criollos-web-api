import { getBootstrapData } from './bootstrap'
import { getCachedEventos, getCachedGastronomia } from './data'
import { filterDiscoveryFeed, buildDiscoveryFeed } from './discovery'
import { buildNearbyStops } from './nearbyStops'
import { buildNearbyVehicles } from './nearbyVehicles'

export interface SearchResult {
  type: 'route' | 'stop' | 'evento' | 'gastronomia' | 'vehicle'
  id: string
  title: string
  subtitle: string
  description?: string
  imageUrl?: string | null
  link?: string | null
  metadata?: Record<string, any>
}

export interface SearchOptions {
  query: string
  limit?: number
  lat?: number | null
  lng?: number | null
}

export interface GlobalSearchResponse {
  query: string
  count: number
  results: SearchResult[]
  suggestions: string[]
  nearbyEnabled: boolean
}

/**
 * Realiza una búsqueda global en todo el ecosistema de Criollos:
 * - Rutas de Trolley
 * - Paradas de Trolley
 * - Eventos Culturales
 * - Lugares Gastronómicos
 * - Opcional: Elementos cercanos si se proveen coordenadas
 */
export async function globalSearch(
  options: SearchOptions
): Promise<GlobalSearchResponse> {
  const { query, limit = 10, lat, lng } = options
  const normalizedQuery = query.trim().toLowerCase()
  const hasCoordinates =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)

  if (!normalizedQuery && !hasCoordinates) {
    return {
      query,
      count: 0,
      results: [],
      suggestions: [],
      nearbyEnabled: false,
    }
  }

  // 1. Obtener todas las fuentes de datos (paralelizado)
  const [bootstrap, eventos, places] = await Promise.all([
    getBootstrapData(),
    getCachedEventos(),
    getCachedGastronomia(),
  ])

  const results: SearchResult[] = []

  // 2. Si hay coordenadas, buscar elementos cercanos prioritarios (sin query)
  if (hasCoordinates) {
    // 2.1 Vehículos cercanos (limitado a los 2 más cercanos para no saturar)
    const nearbyVehicles = buildNearbyVehicles(bootstrap, {
      lat: lat!,
      lng: lng!,
      limit: 2,
    })
    for (const vehicle of nearbyVehicles.data) {
      results.push({
        type: 'vehicle',
        id: `v-nearby-${vehicle.assetId}`,
        title: vehicle.description,
        subtitle: `Trolley Cercano (${vehicle.distanceLabel})`,
        description: `En camino por ${vehicle.routeName || 'Ruta'}`,
        metadata: {
          assetId: vehicle.assetId,
          routeId: vehicle.routeId,
          distanceMeters: vehicle.distanceMeters,
          speed: vehicle.speed,
          lastReportedAt: vehicle.lastReportedAt,
        },
      })
    }

    // 2.2 Paradas cercanas (limitado a las 3 más cercanas)
    const nearbyStops = buildNearbyStops(bootstrap, {
      lat: lat!,
      lng: lng!,
      limit: 3,
    })
    for (const stop of nearbyStops.data) {
      results.push({
        type: 'stop',
        id: `s-nearby-${stop.markerId}`,
        title: stop.name,
        subtitle: `Parada Cercana (${stop.distanceLabel})`,
        description: stop.routes
          .map((r) => r.routeName)
          .filter(Boolean)
          .join(', '),
        metadata: {
          stopId: stop.markerId,
          lat: stop.lat,
          lng: stop.lng,
          distanceMeters: stop.distanceMeters,
          routeCount: stop.routeCount,
        },
      })
    }

    // 2.3 Eventos y Gastronomía cercanos (limitado a los 4 más cercanos)
    const discovery = buildDiscoveryFeed(eventos, places)
    const nearbyDiscovery = filterDiscoveryFeed(discovery, {
      lat: lat!,
      lng: lng!,
      radiusMeters: 1000,
      limit: 4,
    })

    for (const item of nearbyDiscovery.data) {
      results.push({
        type: item.type as 'evento' | 'gastronomia',
        id: `nearby-${item.id}`,
        title: item.title,
        subtitle: `${item.tag || item.type} Cercano`,
        description: item.subtitle,
        imageUrl: item.imageUrl,
        link: item.link,
        metadata: {
          lat: item.lat,
          lng: item.lng,
          markerId: item.markerId,
        },
      })
    }
  }

  // 3. Buscar por texto (solo si hay query)
  if (normalizedQuery) {
    // 3.1 Buscar en Rutas (Transporte)
    for (const route of bootstrap.routes) {
      const haystack =
        `${route.id} ${route.description} ${route.directionStartName} ${route.directionEndName}`.toLowerCase()
      if (haystack.includes(normalizedQuery)) {
        results.push({
          type: 'route',
          id: `route-${route.id}`,
          title: `Ruta ${route.id}: ${route.description}`,
          subtitle: 'Transporte Público (Trolley)',
          description: `${route.directionStartName} ↔ ${route.directionEndName}`,
          metadata: {
            routeId: route.id,
            color: route.lineColor,
            directionStart: route.directionStartName,
            directionEnd: route.directionEndName,
          },
        })
      }
    }

    // 3.2 Buscar en Paradas (Markers)
    for (const marker of bootstrap.markers) {
      const haystack = marker.description.toLowerCase()
      if (haystack.includes(normalizedQuery)) {
        results.push({
          type: 'stop',
          id: `stop-${marker.id}`,
          title: marker.description,
          subtitle: 'Parada de Trolley',
          metadata: {
            stopId: marker.id,
            lat: marker.lat,
            lng: marker.lng,
          },
        })
      }
    }

    // 3.3 Buscar en Discovery (Eventos + Gastronomía)
    const discovery = buildDiscoveryFeed(eventos, places)
    const filteredDiscovery = filterDiscoveryFeed(discovery, {
      query: normalizedQuery,
    })

    for (const item of filteredDiscovery.data) {
      if (item.type === 'evento' || item.type === 'gastronomia') {
        results.push({
          type: item.type as 'evento' | 'gastronomia',
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          description: item.description,
          imageUrl: item.imageUrl,
          link: item.link,
          metadata: {
            lat: item.lat,
            lng: item.lng,
            markerId: item.markerId,
          },
        })
      }
    }
  }

  // 4. Deduplicar por ID y limitar resultados
  const seen = new Set<string>()
  const uniqueResults: SearchResult[] = []

  for (const result of results) {
    if (!seen.has(result.id)) {
      uniqueResults.push(result)
      seen.add(result.id)
    }
    if (uniqueResults.length >= limit) break
  }

  return {
    query,
    count: uniqueResults.length,
    results: uniqueResults,
    suggestions: [],
    nearbyEnabled: hasCoordinates,
  }
}
