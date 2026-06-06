import { defineEventHandler, getQuery, createError } from 'h3'
import { getBootstrapData } from '../../../utils/bootstrap'
import { buildNearbyVehicles } from '../../../utils/nearbyVehicles'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const limit = query.limit ? Number(query.limit) : null

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan parámetros lat/lng válidos',
    })
  }

  const bootstrap = await getBootstrapData()
  return buildNearbyVehicles(bootstrap, { lat, lng, limit })
})
