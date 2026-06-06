import { createError, defineEventHandler, getQuery, type H3Event } from 'h3'
import { getBootstrapData } from '../../../utils/bootstrap'
import { getAppConfig } from '../../../utils/config'
import { applyConditionalCache } from '../../../utils/httpCache'
import {
  buildNearbyStops,
  type NearbyStopsOptions,
} from '../../../utils/nearbyStops'

function parseNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function parseNearbyStopsOptions(event: H3Event): NearbyStopsOptions {
  const query = getQuery(event)
  const lat = parseNumber(query.lat as string | string[] | undefined)
  const lng = parseNumber(query.lng as string | string[] | undefined)

  if (
    lat === null ||
    lng === null ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'lat and lng query params are required and must be valid coordinates',
    })
  }

  return {
    lat,
    lng,
    limit: parseNumber(query.limit as string | string[] | undefined),
    maxDistanceMeters: parseNumber(
      query.maxDistanceMeters as string | string[] | undefined
    ),
  }
}

export default defineEventHandler(async (event) => {
  const config = getAppConfig()
  const options = parseNearbyStopsOptions(event)
  const data = await getBootstrapData(null)
  const nearbyStops = buildNearbyStops(data, options)
  const payload = {
    status: 'success',
    source: 'live',
    fetchedAt: data.fetchedAt,
    ...nearbyStops,
  }

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: config.cacheTtlBootstrap,
      payload,
      lastModified: data.fetchedAt,
    })
  ) {
    return null
  }

  return payload
})
