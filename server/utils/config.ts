import { useRuntimeConfig } from '#imports'

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
}

function toNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toList(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

export function getAppConfig(): AppConfig {
  const config = useRuntimeConfig()

  return {
    upstreamBaseUrl: ensureTrailingSlash(String(config.upstreamBaseUrl || '')),
    idClient: toNumber(String(config.idClient || '0'), 0),
    deviceId: String(config.deviceId || 'server'),
    apiKeys: toList(String(config.apiKeys || '')),
    rateLimitRpm: toNumber(String(config.rateLimitRpm || '60'), 60),
    corsOrigins: toList(String(config.corsOrigins || '')),
    cacheTtlPositions: toNumber(String(config.cacheTtlPositions || '10'), 10),
    cacheTtlCatalog: toNumber(String(config.cacheTtlCatalog || '1800'), 1800),
    cacheTtlBootstrap: toNumber(String(config.cacheTtlBootstrap || '300'), 300)
  }
}
