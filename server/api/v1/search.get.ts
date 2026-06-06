import { globalSearch } from '../../utils/search'
import { getAppConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim()
  const limit = Number(query.limit) || 10
  const lat = query.lat ? Number(query.lat) : null
  const lng = query.lng ? Number(query.lng) : null

  if (!q && (lat == null || lng == null)) {
    return {
      status: 'success',
      count: 0,
      data: [],
      query: q,
      nearbyEnabled: false,
    }
  }

  try {
    const results = await globalSearch({ query: q, limit, lat, lng })

    // Cache control para búsquedas (TTL corto)
    const config = getAppConfig()
    setResponseHeader(
      event,
      'Cache-Control',
      `public, max-age=${config.cacheTtlDiscovery}, stale-while-revalidate=30`
    )

    return {
      status: 'success',
      ...results,
    }
  } catch (error) {
    console.error('Search API error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error processing search request',
    })
  }
})
