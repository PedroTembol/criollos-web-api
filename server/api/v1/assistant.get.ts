import {
  createError,
  defineEventHandler,
  getQuery,
  setResponseHeader,
} from 'h3'
import {
  buildAssistantResponse,
  detectAssistantIntent,
  extractAssistantSearchQuery,
} from '../../utils/assistant'
import { getBootstrapData } from '../../utils/bootstrap'
import { getAppConfig } from '../../utils/config'
import { getCachedEventos, getCachedGastronomia } from '../../utils/data'
import { globalSearch, type SearchResult } from '../../utils/search'

const ASSISTANT_SOURCE_TIMEOUT_MS = 5_000

async function withSourceTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('assistant source timeout')),
          ASSISTANT_SOURCE_TIMEOUT_MS
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function parseCoordinate(
  value: unknown,
  min: number,
  max: number
): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null
}

async function genericResults(
  intent: ReturnType<typeof detectAssistantIntent>
): Promise<SearchResult[]> {
  if (intent === 'events') {
    const eventos = await withSourceTimeout(getCachedEventos())
    return eventos.slice(0, 5).map((item) => ({
      type: 'evento',
      id: item.id,
      title: item.title,
      subtitle: item.venue || item.rawDate || 'Evento en Caguas',
      description: item.summary,
      imageUrl: item.imageUrl,
      link: item.sourceUrl,
    }))
  }

  if (intent === 'food') {
    const places = await withSourceTimeout(getCachedGastronomia())
    return places.slice(0, 5).map((item) => ({
      type: 'gastronomia',
      id: item.id,
      title: item.title,
      subtitle: item.category || 'Gastronomía en Caguas',
      description: item.summary,
      imageUrl: item.imageUrl,
      link: item.sourceUrl,
    }))
  }

  if (intent === 'trolley') {
    const bootstrap = await withSourceTimeout(getBootstrapData())
    return bootstrap.routes.slice(0, 5).map((route) => ({
      type: 'route',
      id: `route-${route.id}`,
      title: route.description || `Ruta ${route.id}`,
      subtitle: `${route.directionStartName || 'Inicio'} ↔ ${route.directionEndName || 'Final'}`,
      metadata: { routeId: route.id, color: route.lineColor },
    }))
  }

  return []
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const question = String(query.q || '').trim()
  if (!question) {
    throw createError({
      statusCode: 400,
      statusMessage: 'q is required',
    })
  }

  const lat = parseCoordinate(query.lat, -90, 90)
  const lng = parseCoordinate(query.lng, -180, 180)
  const hasLocation = lat !== null && lng !== null
  const intent = detectAssistantIntent(question)
  const searchQuery = extractAssistantSearchQuery(question)
  const limit = Math.min(Math.max(Number(query.limit) || 3, 1), 5)

  let results: SearchResult[] = []
  let degraded = false
  try {
    if (hasLocation || searchQuery) {
      const search = await withSourceTimeout(
        globalSearch({
          query: searchQuery,
          lat,
          lng,
          limit,
        })
      )
      results = search.results
    }
    if (!results.length && !hasLocation) {
      results = await genericResults(intent)
    }
  } catch (error) {
    degraded = true
    console.error('[assistant] source unavailable:', error)
  }

  const response = buildAssistantResponse(question, results, {
    hasLocation,
    limit,
  })
  const config = getAppConfig()
  setResponseHeader(
    event,
    'Cache-Control',
    `public, max-age=${config.cacheTtlDiscovery}, stale-while-revalidate=30`
  )

  return {
    status: 'success',
    question,
    generatedAt: new Date().toISOString(),
    degraded,
    ...response,
  }
})
