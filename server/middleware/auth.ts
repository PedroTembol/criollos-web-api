import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { getAppConfig } from '../utils/config'
import { isPublicApiRoute } from '../utils/apiRoutes'
import { devLog } from '../utils/logging'

// Rutas públicas que no requieren autenticación (sin prefijo y con prefijo)
const PUBLIC_NO_AUTH_ROUTES = [
  '/eventos',
  '/gastronomia',
  '/discovery',
  '/search',
  '/health',
  '/notifications',
  '/recommendations',
  '/proactive-recommendations',
  '/bootstrap',
  '/api/v1/eventos',
  '/api/v1/gastronomia',
  '/api/v1/discovery',
  '/api/v1/search',
  '/api/v1/health',
  '/api/v1/notifications',
  '/api/v1/recommendations',
  '/api/v1/proactive-recommendations',
  '/api/v1/bootstrap',
]

function isNoAuthRoute(url: string): boolean {
  return PUBLIC_NO_AUTH_ROUTES.some((route) => {
    return (
      url === route ||
      url.startsWith(route + '/') ||
      url.startsWith(route + '?')
    )
  })
}

export default defineEventHandler((event) => {
  // Leer la URL después de que el rewrite haya sido aplicado
  const url = event.node.req.url || ''
  const method = event.node.req.method || 'GET'

  devLog(
    `[auth] 🔍 Verificando autenticación: ${method} ${url} (después del rewrite)`
  )

  if (!isPublicApiRoute(url)) {
    devLog(`[auth] ⏭️  No es ruta de API, saltando`)
    return
  }

  // Rutas públicas no requieren API key
  if (isNoAuthRoute(url)) {
    devLog(`[auth] ✅ Ruta pública, no requiere autenticación`)
    return
  }

  if (event.node.req.method === 'OPTIONS') {
    devLog(`[auth] ✅ OPTIONS request, saltando autenticación`)
    return
  }

  const config = getAppConfig()
  devLog(`[auth] 🔑 API Keys configuradas: ${config.apiKeys.length}`)

  if (config.apiKeys.length === 0) {
    devLog(`[auth] ⚠️  No hay API keys configuradas, saltando autenticación`)
    return
  }

  const apiKey = getRequestHeader(event, 'x-api-key')
  devLog(
    `[auth] 🔑 API Key recibida: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NINGUNA'}`
  )

  if (!apiKey) {
    devLog(`[auth] ❌ Error: Missing API key`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing API key',
    })
  }

  if (!config.apiKeys.includes(apiKey)) {
    devLog(`[auth] ❌ Error: Invalid API key`)
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid API key',
    })
  }

  devLog(`[auth] ✅ Autenticación exitosa`)
})
