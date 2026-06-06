import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getBootstrapData } from '../../../../utils/bootstrap'
import { getAppConfig } from '../../../../utils/config'
import { applyConditionalCache } from '../../../../utils/httpCache'
import { buildRouteStops } from '../../../../utils/routeStops'

function parseRouteId(value: string | undefined) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default defineEventHandler(async (event) => {
  const routeId = parseRouteId(getRouterParam(event, 'routeId'))

  if (routeId === null) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'routeId path param is required and must be a positive integer',
    })
  }

  const config = getAppConfig()
  const data = await getBootstrapData(null)

  if (!data.routes.some((route) => route.id === routeId)) {
    throw createError({
      statusCode: 404,
      statusMessage: `Route ${routeId} was not found`,
    })
  }

  const routeStops = buildRouteStops(data, { routeId })
  const payload = {
    status: 'success',
    source: 'live',
    fetchedAt: data.fetchedAt,
    ...routeStops,
  }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: config.cacheTtlCatalog,
      payload,
      lastModified: data.fetchedAt,
    })
  ) {
    return null
  }

  return payload
})
