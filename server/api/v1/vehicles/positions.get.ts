import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { getAppConfig } from '../../../utils/config'
import {
  getCachedJson,
  setCachedJson,
  withCacheLock,
} from '../../../utils/cache'
import { fetchUpstreamJson } from '../../../utils/upstream'
import { Position } from '../../../utils/normalize'

type PositionsResponse = {
  positions: Position[]
  fetchedAt: string
}

function parseLatLngFromTrail(trail: string) {
  if (!trail || typeof trail !== 'string') {
    return { lat: null, lng: null }
  }
  const first = trail.split('*')[0]
  const [latRaw, lngRaw] = first.split(',')
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  }
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  console.log(`[positions] 📥 Petición recibida: ${url}`)

  try {
    const query = getQuery(event)
    const idMarker = query.idMarker ? Number(query.idMarker) : null
    console.log(`[positions] 🔍 Query params: idMarker=${idMarker}`)

    const config = getAppConfig()
    const markerKey = idMarker ? String(idMarker) : 'all'
    const cacheKey = `positions:${config.idClient}:${markerKey}`
    console.log(`[positions] 🔑 Cache key: ${cacheKey}`)

    const cached = await getCachedJson<PositionsResponse>(cacheKey)
    if (cached) {
      console.log(
        `[positions] ✅ Datos obtenidos de cache - ${cached.positions?.length || 0} posiciones`
      )
      setResponseHeader(
        event,
        'Cache-Control',
        `public, max-age=${config.cacheTtlPositions}`
      )
      return cached
    }

    console.log(`[positions] ⚙️  Cache miss, obteniendo datos del upstream...`)

    const response = await withCacheLock(cacheKey, async () => {
      const data = await fetchUpstreamJson<unknown[]>('getAssetPosition', {
        IDCLIENT: config.idClient,
        IDMARKER: Number.isFinite(idMarker) ? idMarker : undefined,
      })

      // El upstream devuelve un objeto con metadata o un array de posiciones
      // Si data es un array de arrays, es el formato esperado
      const rawPositions = Array.isArray(data) ? data : []

      const positions = rawPositions
        .filter((row) => Array.isArray(row) && row.length >= 12)
        .map((row) => {
          const [
            assetId,
            driverId,
            when,
            speed,
            inputX,
            trail,
            status,
            msg,
            extendedDescription,
            routeId,
            routePointNextId,
            routePointPrevId,
          ] = row as [
            number,
            number,
            string,
            number,
            number,
            string,
            number,
            string,
            string,
            number,
            number,
            number,
          ]

          const { lat, lng } = parseLatLngFromTrail(trail)
          return {
            assetId,
            driverId,
            when,
            speed,
            inputX,
            trail,
            status,
            msg,
            extendedDescription,
            routeId,
            routePointNextId,
            routePointPrevId,
            lat,
            lng,
          }
        })

      const payload: PositionsResponse = {
        positions,
        fetchedAt: new Date().toISOString(),
      }

      await setCachedJson(cacheKey, payload, config.cacheTtlPositions)
      console.log(
        `[positions] ✅ Datos obtenidos del upstream - ${payload.positions?.length || 0} posiciones`
      )
      return payload
    })

    setResponseHeader(
      event,
      'Cache-Control',
      `public, max-age=${config.cacheTtlPositions}`
    )
    return response
  } catch (error) {
    console.error(`[positions] ❌ Error:`, error)
    throw error
  }
})
