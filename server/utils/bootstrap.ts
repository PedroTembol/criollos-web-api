import { getAppConfig } from './config'
import { getCachedJson, setCachedJson, withCacheLock } from './cache'
import { fetchUpstreamJson } from './upstream'
import { normalizeGetAll, BootstrapData } from './normalize'

export type BootstrapResponse = BootstrapData & {
  fetchedAt: string
  stale?: boolean
  staleReason?: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown upstream error'
}

export function buildStaleBootstrapResponse(
  lastKnownGood: BootstrapResponse | null,
  error: unknown
): BootstrapResponse | null {
  if (!lastKnownGood) {
    return null
  }

  return {
    ...lastKnownGood,
    stale: true,
    staleReason: getErrorMessage(error),
  }
}

export async function getBootstrapData(
  idMarker?: number | null
): Promise<BootstrapResponse> {
  const config = getAppConfig()
  const markerKey = idMarker ? String(idMarker) : 'all'
  const cacheKey = `bootstrap:${config.idClient}:${markerKey}`
  const staleCacheKey = `${cacheKey}:last-known-good`

  const cached = await getCachedJson<BootstrapResponse>(cacheKey)
  if (cached) {
    return cached
  }

  return withCacheLock(cacheKey, async () => {
    try {
      const data = await fetchUpstreamJson<unknown[]>('GetAll', {
        IDCLIENT: config.idClient,
        IDMARKER: idMarker ?? undefined,
      })

      const normalized = normalizeGetAll(data)
      const response: BootstrapResponse = {
        ...normalized,
        fetchedAt: new Date().toISOString(),
      }

      await Promise.all([
        setCachedJson(cacheKey, response, config.cacheTtlBootstrap),
        setCachedJson(staleCacheKey, response, config.cacheTtlBootstrapStale),
      ])
      return response
    } catch (error) {
      const lastKnownGood =
        await getCachedJson<BootstrapResponse>(staleCacheKey)
      const staleResponse = buildStaleBootstrapResponse(lastKnownGood, error)
      if (!staleResponse) {
        throw error
      }

      // Avoid retrying the failing upstream on every request.
      await setCachedJson(
        cacheKey,
        staleResponse,
        Math.min(config.cacheTtlBootstrap, 30)
      )
      return staleResponse
    }
  })
}
