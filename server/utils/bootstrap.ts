import { getAppConfig } from './config'
import { getCachedJson, setCachedJson, withCacheLock } from './cache'
import { fetchUpstreamJson } from './upstream'
import { normalizeGetAll, BootstrapData } from './normalize'

export type BootstrapResponse = BootstrapData & {
  fetchedAt: string
}

export async function getBootstrapData(idMarker?: number | null): Promise<BootstrapResponse> {
  const config = getAppConfig()
  const markerKey = idMarker ? String(idMarker) : 'all'
  const cacheKey = `bootstrap:${config.idClient}:${markerKey}`

  const cached = await getCachedJson<BootstrapResponse>(cacheKey)
  if (cached) {
    return cached
  }

  return withCacheLock(cacheKey, async () => {
    const data = await fetchUpstreamJson<unknown[]>('GetAll', {
      IDCLIENT: config.idClient,
      IDMARKER: idMarker ?? undefined
    })

    const normalized = normalizeGetAll(data)
    const response: BootstrapResponse = {
      ...normalized,
      fetchedAt: new Date().toISOString()
    }

    await setCachedJson(cacheKey, response, config.cacheTtlBootstrap)
    return response
  })
}
