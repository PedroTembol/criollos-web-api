import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { getAppConfig } from '../../utils/config'
import { globalSearch, type SearchOptions } from '../../utils/search'

/**
 * Endpoint de Recomendaciones Proactivas:
 * Devuelve tarjetas accionables basadas en:
 * 1. Proximidad (si se proveen coordenadas)
 * 2. Estado del servicio de trolley (alertas/próximas llegadas)
 * 3. Agenda cultural y gastronomía (eventos/lugares destacados)
 *
 * A diferencia de /search, este endpoint está optimizado para
 * superficies "hero" o asistentes que necesitan proponer
 * "lo mejor que puedes hacer ahora mismo".
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 5
  const lat = query.lat ? Number(query.lat) : null
  const lng = query.lng ? Number(query.lng) : null
  const config = getAppConfig()

  try {
    // Reutilizamos la lógica potente de globalSearch pero con limit bajo
    // y forzamos búsqueda de cercanía si hay coordenadas.
    const results = await globalSearch({
      query: '', // Sin query de texto para obtener recomendaciones proactivas
      limit,
      lat,
      lng,
    })

    // Transformamos los resultados de búsqueda en un formato de "Recomendación"
    // similar al que ya usa /recommendations (compatibilidad)
    const recommendations = results.results.map((r) => ({
      id: r.id,
      type:
        r.type === 'evento'
          ? 'plan'
          : r.type === 'gastronomia'
            ? 'food'
            : 'mobility',
      priority: r.id.includes('nearby') ? 'high' : 'medium',
      title: r.title,
      message: r.description || r.subtitle,
      actionLabel:
        r.type === 'stop' || r.type === 'vehicle'
          ? 'Ver en Mapa'
          : 'Ver Detalles',
      actionHref:
        r.link ||
        (r.type === 'stop' ? `/#map?stopId=${r.metadata?.stopId}` : '/'),
      evidence: [r.subtitle],
      tags: [r.type],
      metadata: r.metadata,
    }))

    setResponseHeader(
      event,
      'Cache-Control',
      `public, max-age=${config.cacheTtlDiscovery}, stale-while-revalidate=60`
    )

    return {
      status: 'success',
      count: recommendations.length,
      data: recommendations,
      nearbyEnabled: results.nearbyEnabled,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[proactive-recommendations] error:', error)
    return {
      status: 'error',
      message: 'Failed to generate proactive recommendations',
    }
  }
})
