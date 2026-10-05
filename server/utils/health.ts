import { getBootstrapData } from './bootstrap'
import { getEventosFeed, getGastronomiaFeed, type FeedSnapshot } from './data'
import { getTelemetryAgeSeconds, RECENT_TELEMETRY_SECONDS } from './telemetry'

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
    if (data.stale) {
      return {
        status: 'degraded',
        lastSuccessAt: data.fetchedAt,
        latencyMs: Date.now() - start,
        message: data.staleReason || 'Serving last-known-good transport data',
      }
    }

    const incompatible = data.telemetry?.state === 'incompatible'
    const hasRecentSignal = data.positions.some((position) => {
      const age = getTelemetryAgeSeconds(position.when)
      return age !== null && age <= RECENT_TELEMETRY_SECONDS
    })
    return {
      status: !incompatible && hasRecentSignal ? 'healthy' : 'degraded',
      lastSuccessAt: data.fetchedAt,
      latencyMs: Date.now() - start,
      message: incompatible
        ? 'Vehicle telemetry payload incompatible'
        : hasRecentSignal
          ? null
          : data.positions.length
            ? 'No recent interpretable vehicle signals'
            : 'No vehicle telemetry available',
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
  getter: () => Promise<FeedSnapshot<unknown>>
): Promise<DependencyHealth> {
  const start = Date.now()
  try {
    const feed = await getter()
    return {
      status: !feed.lastSuccessAt
        ? 'offline'
        : feed.stale || !feed.complete || !feed.data.length
          ? 'degraded'
          : 'healthy',
      lastSuccessAt: feed.lastSuccessAt,
      latencyMs: Date.now() - start,
      message:
        feed.staleReason ||
        (feed.data.length ? null : `No items found in ${type}`),
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
    checkScraperHealth('eventos', getEventosFeed),
    checkScraperHealth('gastronomia', getGastronomiaFeed),
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
