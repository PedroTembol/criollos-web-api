import { devLog, devError } from '../../utils/logging'
import {
  defineEventHandler,
  getQuery,
  setResponseHeader,
  createError,
} from 'h3'
import { getAppConfig } from '../../utils/config'
import { getCachedJson, setCachedJson, withCacheLock } from '../../utils/cache'
import { fetchUpstreamJson } from '../../utils/upstream'
import { getBootstrapData } from '../../utils/bootstrap'

type EtaResponse = {
  total_seconds?: number
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const assetId = query.assetId ? Number(query.assetId) : undefined
  const stopId = query.stopId ? Number(query.stopId) : undefined
  const config = getAppConfig()

  let latlngs = query.latlngs ? String(query.latlngs) : ''
  const time = query.time ? Number(query.time) : undefined

  // Autocompletar latlngs si faltan pero tenemos asset + stop
  if (!latlngs && assetId && stopId) {
    const data = await getBootstrapData()
    // A veces el assetId del app es el description en el API raw
    const assetStr = String(assetId)
    let vehicle = data.positions.find((p) => String(p.assetId) === assetStr)
    if (!vehicle) {
      const assetDef = data.assets.find(
        (a) => String(a.id) === assetStr || a.description === assetStr
      )
      if (assetDef) {
        vehicle = data.positions.find((p) => p.assetId === assetDef.id)
      }
    }

    // Busqueda fallback por description directa si nada funcionó
    if (!vehicle) {
      const assetDef = data.assets.find((a) => a.description === assetStr)
      if (assetDef) {
        vehicle = data.positions.find((p) => p.assetId === assetDef.id)
      }
    }

    const stop = data.routePoints.find((rp) => rp.id === stopId)

    if (vehicle && stop && vehicle.lat && vehicle.lng) {
      latlngs = `${vehicle.lat},${vehicle.lng}|${stop.lat / 1000000},${stop.lng / 1000000}`
    } else {
      // Intento final: buscar cualquier trolley cercano en la misma ruta del stop
      if (stop) {
        const nearbyVehicle = data.positions.find(
          (p) => p.routeId === stop.routeId && p.lat && p.lng
        )
        if (nearbyVehicle) {
          latlngs = `${nearbyVehicle.lat},${nearbyVehicle.lng}|${stop.lat / 1000000},${stop.lng / 1000000}`
        }
      }
    }
  }

  if (!latlngs) {
    // Si no pudimos calcular path, devolvemos -1 silencioso para no romper el app
    return {
      total_seconds: -1,
      error: `Path computation failed (assetId=${assetId}, stopId=${stopId})`,
    }
  }

  const cacheKey = `eta:${config.idClient}:${latlngs}:${time ?? 'now'}`
  const cached = await getCachedJson<EtaResponse>(cacheKey)
  if (cached) {
    setResponseHeader(
      event,
      'Cache-Control',
      `public, max-age=${config.cacheTtlPositions}`
    )
    return cached
  }

  const response = await withCacheLock(cacheKey, async () => {
    try {
      const data = await fetchUpstreamJson<EtaResponse>('GetGoogleETA', {
        IDCLIENT: config.idClient,
        latlngs,
        time: Number.isFinite(time) ? time : undefined,
      })
      await setCachedJson(cacheKey, data, config.cacheTtlPositions)
      return data
    } catch (e) {
      devError(`[eta] Error fetching from upstream:`, e)
      return { total_seconds: -1, error: 'Upstream unavailable' }
    }
  })

  setResponseHeader(
    event,
    'Cache-Control',
    `public, max-age=${config.cacheTtlPositions}`
  )
  return response
})
