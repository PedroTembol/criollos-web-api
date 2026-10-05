import {
  defineEventHandler,
  getQuery,
  setResponseHeader,
  setResponseStatus,
} from 'h3'
import { getAppConfig } from '../../../utils/config'
import {
  getCachedJson,
  setCachedJson,
  withCacheLock,
} from '../../../utils/cache'
import { fetchUpstreamJson } from '../../../utils/upstream'
import { decodePositions } from '../../../utils/positionDecoder'

type PositionsResponse = ReturnType<typeof decodePositions> & {
  fetchedAt: string
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const idMarker = query.idMarker ? Number(query.idMarker) : null
  const config = getAppConfig()
  const markerKey = idMarker ? String(idMarker) : 'all'
  // Legacy cached empty responses did not distinguish schema errors.
  const cacheKey = `positions:v2:${config.idClient}:${markerKey}`
  const cached = await getCachedJson<PositionsResponse>(cacheKey)
  const response =
    cached ??
    (await withCacheLock(cacheKey, async () => {
      const raw = await fetchUpstreamJson<unknown>('getAssetPosition', {
        IDCLIENT: config.idClient,
        IDMARKER: Number.isFinite(idMarker) ? idMarker : undefined,
      })
      const payload = {
        ...decodePositions(raw),
        fetchedAt: new Date().toISOString(),
      }
      await setCachedJson(cacheKey, payload, config.cacheTtlPositions)
      return payload
    }))
  if (response.telemetry.state === 'incompatible') {
    setResponseStatus(event, 502)
    setResponseHeader(event, 'Cache-Control', 'no-store')
  } else {
    setResponseHeader(
      event,
      'Cache-Control',
      `public, max-age=${config.cacheTtlPositions}`
    )
  }
  return response
})
