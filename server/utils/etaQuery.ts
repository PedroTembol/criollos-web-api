import { createError } from 'h3'
import { getTelemetryAgeSeconds, RECENT_TELEMETRY_SECONDS } from './telemetry'

type EtaQuery = {
  assetId?: unknown
  stopId?: unknown
  latlngs?: unknown
  time?: unknown
}
function positiveId(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `${name} must be a positive integer`,
    })
  }
  return Number(value)
}

export function parseEtaQuery(query: EtaQuery) {
  const assetId = positiveId(query.assetId, 'assetId')
  const stopId = positiveId(query.stopId, 'stopId')
  let latlngs = ''
  if (query.latlngs !== undefined) {
    if (typeof query.latlngs !== 'string')
      throw createError({
        statusCode: 400,
        statusMessage: 'latlngs requires two coordinate pairs in degrees',
      })
    const pairs = query.latlngs.split('|')
    const coordinates = pairs.map((pair) =>
      pair
        .split(',')
        .map((value) => (value.trim() === '' ? NaN : Number(value)))
    )
    if (
      pairs.length !== 2 ||
      coordinates.some(
        (point) =>
          point.length !== 2 ||
          !point.every(Number.isFinite) ||
          Math.abs(point[0]) > 90 ||
          Math.abs(point[1]) > 180
      )
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'latlngs requires two coordinate pairs in degrees',
      })
    }
    latlngs = coordinates.map((point) => point.join(',')).join('|')
  } else if (!assetId || !stopId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Supply two coordinate pairs or both assetId and stopId',
    })
  }
  let time: number | undefined
  if (query.time !== undefined) {
    if (
      typeof query.time !== 'string' ||
      query.time.trim() === '' ||
      !Number.isFinite(Number(query.time)) ||
      Number(query.time) < 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'time must be a nonnegative number',
      })
    }
    time = Number(query.time)
  }
  return { assetId, stopId, latlngs, time }
}

import type { BootstrapResponse } from './bootstrap'

export function resolveEtaPath(
  data: BootstrapResponse,
  assetId: number,
  stopId: number,
  now = Date.now()
): string {
  if (data.stale || data.telemetry?.state === 'incompatible') return ''
  const asset = data.assets.find(
    (item) => item.id === assetId || item.description === String(assetId)
  )
  const vehicle =
    data.positions.find((item) => item.assetId === assetId) ??
    (asset
      ? data.positions.find((item) => item.assetId === asset.id)
      : undefined)
  const stop = data.routePoints.find((item) => item.id === stopId)
  const age = vehicle ? getTelemetryAgeSeconds(vehicle.when, now) : null
  if (
    !vehicle ||
    !stop ||
    age === null ||
    age > RECENT_TELEMETRY_SECONDS ||
    vehicle.lat === null ||
    vehicle.lng === null
  )
    return ''
  const lat = Math.abs(stop.lat) > 90 ? stop.lat / 1000000 : stop.lat
  const lng = Math.abs(stop.lng) > 180 ? stop.lng / 1000000 : stop.lng
  try {
    return parseEtaQuery({
      latlngs: `${vehicle.lat},${vehicle.lng}|${lat},${lng}`,
    }).latlngs
  } catch {
    return ''
  }
}
