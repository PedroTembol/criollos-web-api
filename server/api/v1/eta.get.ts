import { devError } from '../../utils/logging'
import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { getAppConfig } from '../../utils/config'
import { getCachedJson, setCachedJson, withCacheLock } from '../../utils/cache'
import { fetchUpstreamJson } from '../../utils/upstream'
import { getBootstrapData } from '../../utils/bootstrap'
import { parseEtaQuery, resolveEtaPath } from '../../utils/etaQuery'

type EtaResponse = {
  total_seconds?: number
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = parseEtaQuery(query)
  const { assetId, stopId, time } = parsed
  const config = getAppConfig()

  let latlngs = parsed.latlngs

  // Autocompletar latlngs si faltan pero tenemos asset + stop
  if (!latlngs && assetId && stopId) {
    const data = await getBootstrapData()
    latlngs = resolveEtaPath(data, assetId, stopId)
  }

  if (!latlngs) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return {
      total_seconds: -1,
      error: 'Recent vehicle location or stop unavailable',
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
      const upstream = await fetchUpstreamJson<EtaResponse>('GetGoogleETA', {
        IDCLIENT: config.idClient,
        latlngs,
        time: Number.isFinite(time) ? time : undefined,
      })
      const totalSeconds = Number(upstream.total_seconds)
      if (
        upstream.total_seconds === undefined ||
        !Number.isFinite(totalSeconds) ||
        totalSeconds < 0
      )
        return { total_seconds: -1, error: 'ETA unavailable' }
      const data = {
        ...upstream,
        total_seconds: totalSeconds,
        estimateKind: 'point-to-point',
        fetchedAt: new Date().toISOString(),
      }
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
    response.total_seconds != null && response.total_seconds >= 0
      ? `public, max-age=${config.cacheTtlPositions}`
      : 'no-store'
  )
  return response
})
