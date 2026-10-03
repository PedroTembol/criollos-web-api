import { defineEventHandler, getQuery, createError } from 'h3'
import { getBootstrapData } from '../../../utils/bootstrap'
import { buildNearbyVehicles } from '../../../utils/nearbyVehicles'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const limit = query.limit ? Number(query.limit) : null

  if (
    query.lat === undefined ||
    query.lng === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan parámetros lat/lng válidos',
    })
  }

  const bootstrap = await getBootstrapData()
  return {
    ...buildNearbyVehicles(bootstrap, { lat, lng, limit }),
    fetchedAt: bootstrap.fetchedAt,
    source: bootstrap.stale ? 'stale-cache' : 'upstream',
    ...(bootstrap.stale
      ? { stale: true, staleReason: bootstrap.staleReason }
      : {}),
  }
})
