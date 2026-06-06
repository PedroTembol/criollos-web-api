import { defineEventHandler, getQuery, type H3Event } from 'h3'
import { getAppConfig } from '../../utils/config'
import { getBootstrapData } from '../../utils/bootstrap'
import { applyConditionalCache } from '../../utils/httpCache'
import {
  buildTrackingSnapshot,
  filterTrackingSnapshot,
  type TrackingFilters,
  type TrackingVehicleSnapshot,
} from '../../utils/tracking'

const ALLOWED_FRESHNESS: TrackingVehicleSnapshot['freshnessLabel'][] = [
  'live',
  'stale',
  'unknown',
]
const ALLOWED_STATUS: TrackingVehicleSnapshot['statusLabel'][] = [
  'moving',
  'stopped',
  'idle',
  'unknown',
]

function parseListParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseIntList(
  value: string | string[] | undefined
): number[] | undefined {
  const parsed = parseListParam(value)
    .map((entry) => Number.parseInt(entry, 10))
    .filter((entry) => Number.isFinite(entry))

  return parsed.length ? parsed : undefined
}

function parseTrackingFilters(event: H3Event): TrackingFilters {
  const query = getQuery(event)
  const freshness = parseListParam(
    query.freshness as string | string[] | undefined
  ).filter((value): value is TrackingVehicleSnapshot['freshnessLabel'] =>
    ALLOWED_FRESHNESS.includes(
      value as TrackingVehicleSnapshot['freshnessLabel']
    )
  )
  const statuses = parseListParam(
    query.status as string | string[] | undefined
  ).filter((value): value is TrackingVehicleSnapshot['statusLabel'] =>
    ALLOWED_STATUS.includes(value as TrackingVehicleSnapshot['statusLabel'])
  )
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const parsedLimit =
    typeof limitRaw === 'string' ? Number.parseInt(limitRaw, 10) : Number.NaN

  return {
    assetIds: parseIntList(query.assetId as string | string[] | undefined),
    routeIds: parseIntList(query.routeId as string | string[] | undefined),
    statuses: statuses.length ? statuses : undefined,
    freshness: freshness.length ? freshness : undefined,
    limit:
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 50)
        : null,
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const idMarker = query.idMarker ? Number(query.idMarker) : null
  const config = getAppConfig()

  const data = await getBootstrapData(
    Number.isFinite(idMarker) ? idMarker : null
  )
  const snapshot = buildTrackingSnapshot(data, data.fetchedAt)
  const filtered = filterTrackingSnapshot(snapshot, parseTrackingFilters(event))

  if (
    applyConditionalCache(event, {
      maxAgeSeconds: config.cacheTtlBootstrap,
      payload: filtered,
      lastModified: filtered.fetchedAt,
    })
  ) {
    return null
  }

  return filtered
})
