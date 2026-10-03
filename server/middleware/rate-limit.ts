import {
  defineEventHandler,
  createError,
  getRequestHeader,
  getRequestIP,
  setResponseHeader,
} from 'h3'
import { sha256Hex } from '../utils/secureHash'
import { getAppConfig } from '../utils/config'
import { isPublicApiRoute } from '../utils/apiRoutes'

type RateEntry = { count: number; resetAt: number }
function getRateMap(): Map<string, RateEntry> {
  const runtime = globalThis as typeof globalThis & {
    __rateLimit?: Map<string, RateEntry>
  }
  return (runtime.__rateLimit ??= new Map())
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  if (!isPublicApiRoute(url) || event.node.req.method === 'OPTIONS') return
  const config = getAppConfig()
  if (config.rateLimitRpm <= 0) return

  const apiKey = getRequestHeader(event, 'x-api-key')
  const ip =
    getRequestHeader(event, 'cf-connecting-ip') ||
    getRequestIP(event, { trustProxy: true }) ||
    'unknown'
  const key = apiKey ? `key:${await sha256Hex(apiKey)}` : `ip:${ip}`
  const now = Date.now()
  const rateMap = getRateMap()
  // Bound expired entries in the isolate; deployment still needs account-level protection.
  if (rateMap.size >= 1000)
    for (const [entryKey, value] of rateMap)
      if (value.resetAt <= now) rateMap.delete(entryKey)
  const entry = rateMap.get(key)
  if (!entry || entry.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + 60000 })
    return
  }
  if (entry.count >= config.rateLimitRpm) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate limit exceeded',
      data: { retryAfter },
    })
  }
  entry.count++
})
