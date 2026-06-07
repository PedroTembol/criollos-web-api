// Removed import { useRuntimeConfig } from '#imports' to support tests

export type AppConfig = {
  upstreamBaseUrl: string
  idClient: number
  deviceId: string
  apiKeys: string[]
  rateLimitRpm: number
  corsOrigins: string[]
  cacheTtlPositions: number
  cacheTtlCatalog: number
  cacheTtlBootstrap: number
  cacheTtlBootstrapStale: number
}

function toNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

export function getAppConfig(): AppConfig {
  let config: any = {}

  try {
    // En Nitro, useRuntimeConfig está disponible globalmente como un auto-import
    // pero para tests unitarios fuera de Nitro, usamos un fallback a process.env
    // @ts-ignore
    config =
      typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : process.env
  } catch (e) {
    config = process.env
  }

  return {
    upstreamBaseUrl: ensureTrailingSlash(
      String(config.upstreamBaseUrl || config.CRIOLLOS_UPSTREAM_URL || '')
    ),
    idClient: toNumber(
      String(config.idClient || config.CRIOLLOS_ID_CLIENT || '0'),
      0
    ),
    deviceId: String(config.deviceId || config.CRIOLLOS_DEVICE_ID || 'server'),
    apiKeys: toList(String(config.apiKeys || config.CRIOLLOS_API_KEYS || '')),
    rateLimitRpm: toNumber(
      String(config.rateLimitRpm || config.CRIOLLOS_RATE_LIMIT_RPM || '60'),
      60
    ),
    corsOrigins: toList(
      String(config.corsOrigins || config.CRIOLLOS_CORS_ORIGINS || '')
    ),
    cacheTtlPositions: toNumber(
      String(
        config.cacheTtlPositions || config.CRIOLLOS_CACHE_TTL_POSITIONS || '10'
      ),
      10
    ),
    cacheTtlCatalog: toNumber(
      String(
        config.cacheTtlCatalog || config.CRIOLLOS_CACHE_TTL_CATALOG || '1800'
      ),
      1800
    ),
    cacheTtlBootstrap: toNumber(
      String(
        config.cacheTtlBootstrap || config.CRIOLLOS_CACHE_TTL_BOOTSTRAP || '300'
      ),
      300
    ),
    cacheTtlBootstrapStale: toNumber(
      String(
        config.cacheTtlBootstrapStale ||
          config.CRIOLLOS_CACHE_TTL_BOOTSTRAP_STALE ||
          '86400'
      ),
      86400
    ),
  }
}
