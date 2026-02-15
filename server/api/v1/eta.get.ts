import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { getAppConfig } from '../../utils/config'
import { getCachedJson, setCachedJson, withCacheLock } from '../../utils/cache'
import { fetchUpstreamJson } from '../../utils/upstream'

type EtaResponse = {
  total_seconds?: number
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const latlngs = query.latlngs ? String(query.latlngs) : ''
  const time = query.time ? Number(query.time) : undefined
  const config = getAppConfig()

  if (!latlngs) {
    return {
      ok: false,
      error: {
        code: 'MISSING_LATLNGS',
        message: 'latlngs query param is required'
      }
    }
  }

  const cacheKey = `eta:${config.idClient}:${latlngs}:${time ?? 'now'}`
  const cached = await getCachedJson<EtaResponse>(cacheKey)
  if (cached) {
    setResponseHeader(event, 'Cache-Control', `public, max-age=${config.cacheTtlPositions}`)
    return cached
  }

  const response = await withCacheLock(cacheKey, async () => {
    const data = await fetchUpstreamJson<EtaResponse>('GetGoogleETA', {
      IDCLIENT: config.idClient,
      latlngs,
      time: Number.isFinite(time) ? time : undefined
    })
    await setCachedJson(cacheKey, data, config.cacheTtlPositions)
    return data
  })

  setResponseHeader(event, 'Cache-Control', `public, max-age=${config.cacheTtlPositions}`)
  return response
})
