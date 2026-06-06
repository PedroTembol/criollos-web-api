import { getBootstrapData } from './bootstrap'
import { getCachedEventos, getCachedGastronomia } from './data'
import { getCachedJson } from './cache'
import { getAppConfig } from './config'

export type HealthStatus = 'healthy' | 'degraded' | 'offline'

export type DependencyHealth = {
  status: HealthStatus
  lastSuccessAt: string | null
  latencyMs: number | null
  message: string | null
}

export type GlobalHealth = {
  status: HealthStatus
  version: string
  timestamp: string
  dependencies: {
    transport: DependencyHealth
    agenda: DependencyHealth
    gastronomia: DependencyHealth
  }
}

async function checkTransportHealth(): Promise<DependencyHealth> {
  const start = Date.now()
  try {
    // We try to get data, if it's cached it's fine, if not it will try upstream
    const data = await getBootstrapData()
    return {
      status: data.positions.length > 0 ? 'healthy' : 'degraded',
      lastSuccessAt: data.fetchedAt,
      latencyMs: Date.now() - start,
      message:
        data.positions.length > 0
          ? null
          : 'No active vehicles found in upstream',
    }
  } catch (error) {
    return {
      status: 'offline',
      lastSuccessAt: null,
      latencyMs: Date.now() - start,
      message:
        error instanceof Error ? error.message : 'Unknown transport error',
    }
  }
}

async function checkScraperHealth(
  type: 'eventos' | 'gastronomia',
  getter: () => Promise<any[]>
): Promise<DependencyHealth> {
  const start = Date.now()
  const cacheKey =
    type === 'eventos' ? 'eventos:visitacaguas' : 'gastronomia:visitacaguas'

  try {
    const data = await getter()
    // We check the cache meta to see when it was last updated
    // getCachedJson doesn't give us the expiration, but we know if it returned data
    return {
      status: data.length > 0 ? 'healthy' : 'degraded',
      lastSuccessAt: new Date().toISOString(), // Approximation if we just got it or it's in cache
      latencyMs: Date.now() - start,
      message: data.length > 0 ? null : `No items found in ${type}`,
    }
  } catch (error) {
    return {
      status: 'offline',
      lastSuccessAt: null,
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : `Unknown ${type} error`,
    }
  }
}

export async function getGlobalHealth(): Promise<GlobalHealth> {
  const [transport, agenda, gastronomia] = await Promise.all([
    checkTransportHealth(),
    checkScraperHealth('eventos', getCachedEventos),
    checkScraperHealth('gastronomia', getCachedGastronomia),
  ])

  let status: HealthStatus = 'healthy'
  if (
    transport.status === 'offline' ||
    agenda.status === 'offline' ||
    gastronomia.status === 'offline'
  ) {
    status = 'offline'
  } else if (
    transport.status === 'degraded' ||
    agenda.status === 'degraded' ||
    gastronomia.status === 'degraded'
  ) {
    status = 'degraded'
  }

  return {
    status,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      transport,
      agenda,
      gastronomia,
    },
  }
}
