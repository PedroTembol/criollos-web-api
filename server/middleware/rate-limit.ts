import {
  defineEventHandler,
  createError,
  getRequestHeader,
  getRequestIP,
} from 'h3'
import { getAppConfig } from '../utils/config'
import { isPublicApiRoute } from '../utils/apiRoutes'
import { devLog } from '../utils/logging'

type RateEntry = {
  count: number
  resetAt: number
}

function getRateMap(): Map<string, RateEntry> {
  const globalKey = '__rateLimit'
  const globalAny = globalThis as typeof globalThis & {
    [key: string]: Map<string, RateEntry>
  }
  if (!globalAny[globalKey]) {
    globalAny[globalKey] = new Map()
  }
  return globalAny[globalKey]
}

export default defineEventHandler((event) => {
  // Leer la URL después de que el rewrite haya sido aplicado
  const url = event.node.req.url || ''
  const method = event.node.req.method || 'GET'

  devLog(
    `[rate-limit] ⏱️  Verificando rate limit: ${method} ${url} (después del rewrite)`
  )

  if (!isPublicApiRoute(url)) {
    devLog(`[rate-limit] ⏭️  No es ruta de API, saltando`)
    return
  }

  if (event.node.req.method === 'OPTIONS') {
    devLog(`[rate-limit] ✅ OPTIONS request, saltando rate limit`)
    return
  }

  const config = getAppConfig()
  if (config.rateLimitRpm <= 0) {
    devLog(`[rate-limit] ⚠️  Rate limit deshabilitado`)
    return
  }

  const apiKey = getRequestHeader(event, 'x-api-key')
  const ip = getRequestIP(event, { trustProxy: true }) || 'unknown'
  const key = apiKey ? `key:${apiKey}` : `ip:${ip}`
  const now = Date.now()
  const windowMs = 60 * 1000

  const rateMap = getRateMap()
  const entry = rateMap.get(key)

  if (!entry || entry.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    devLog(
      `[rate-limit] ✅ Rate limit OK - Nuevo entry para ${key.substring(0, 20)}...`
    )
    return
  }

  if (entry.count >= config.rateLimitRpm) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    devLog(
      `[rate-limit] ❌ Rate limit excedido - ${entry.count}/${config.rateLimitRpm} para ${key.substring(0, 20)}...`
    )
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate limit exceeded',
      data: { retryAfter },
    })
  }

  entry.count += 1
  rateMap.set(key, entry)
  devLog(
    `[rate-limit] ✅ Rate limit OK - ${entry.count}/${config.rateLimitRpm} para ${key.substring(0, 20)}...`
  )
})
