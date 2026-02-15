import { defineEventHandler, createError, getRequestHeader, getRequestIP } from 'h3'
import { getAppConfig } from '../utils/config'

type RateEntry = {
  count: number
  resetAt: number
}

// Rutas de la API que deben tener rate limiting
const API_ROUTES = ['/bootstrap', '/routes', '/stops', '/vehicles/positions', '/eta', '/feedback']

function isApiRoute(url: string): boolean {
  // Acepta rutas con prefijo /api/v1
  if (url.startsWith('/api/v1')) {
    return true
  }
  // También acepta rutas sin prefijo si son endpoints de la API
  // (para manejar casos donde ngrok remueve el prefijo)
  return API_ROUTES.some(route => url === route || url.startsWith(route + '/') || url.startsWith(route + '?'))
}

function getRateMap(): Map<string, RateEntry> {
  const globalKey = '__rateLimit'
  const globalAny = globalThis as typeof globalThis & { [key: string]: Map<string, RateEntry> }
  if (!globalAny[globalKey]) {
    globalAny[globalKey] = new Map()
  }
  return globalAny[globalKey]
}

export default defineEventHandler((event) => {
  // Leer la URL después de que el rewrite haya sido aplicado
  const url = event.node.req.url || ''
  const method = event.node.req.method || 'GET'
  
  console.log(`[rate-limit] ⏱️  Verificando rate limit: ${method} ${url} (después del rewrite)`)
  
  if (!isApiRoute(url)) {
    console.log(`[rate-limit] ⏭️  No es ruta de API, saltando`)
    return
  }

  if (event.node.req.method === 'OPTIONS') {
    console.log(`[rate-limit] ✅ OPTIONS request, saltando rate limit`)
    return
  }

  const config = getAppConfig()
  if (config.rateLimitRpm <= 0) {
    console.log(`[rate-limit] ⚠️  Rate limit deshabilitado`)
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
    console.log(`[rate-limit] ✅ Rate limit OK - Nuevo entry para ${key.substring(0, 20)}...`)
    return
  }

  if (entry.count >= config.rateLimitRpm) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    console.log(`[rate-limit] ❌ Rate limit excedido - ${entry.count}/${config.rateLimitRpm} para ${key.substring(0, 20)}...`)
    throw createError({
      statusCode: 429,
      statusMessage: 'Rate limit exceeded',
      data: { retryAfter }
    })
  }

  entry.count += 1
  rateMap.set(key, entry)
  console.log(`[rate-limit] ✅ Rate limit OK - ${entry.count}/${config.rateLimitRpm} para ${key.substring(0, 20)}...`)
})
