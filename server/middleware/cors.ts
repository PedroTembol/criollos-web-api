import { defineEventHandler, getRequestHeader, setResponseHeader } from 'h3'
import { getAppConfig } from '../utils/config'
import { isPublicApiRoute } from '../utils/apiRoutes'
import { devLog } from '../utils/logging'

export default defineEventHandler((event) => {
  // Leer la URL después de que el rewrite haya sido aplicado
  const url = event.node.req.url || ''
  const method = event.node.req.method || 'GET'

  devLog(`[cors] 🌐 Verificando CORS: ${method} ${url} (después del rewrite)`)

  if (!isPublicApiRoute(url)) {
    devLog(`[cors] ⏭️  No es ruta de API, saltando`)
    return
  }

  const config = getAppConfig()
  const origin = getRequestHeader(event, 'origin') || ''
  const allowList = config.corsOrigins

  let allowedOrigin = '*'
  if (allowList.length > 0) {
    allowedOrigin = allowList.includes(origin) ? origin : allowList[0]
  }

  devLog(
    `[cors] ✅ Configurando CORS - Origin: ${origin}, Allowed: ${allowedOrigin}`
  )

  setResponseHeader(event, 'Access-Control-Allow-Origin', allowedOrigin)
  setResponseHeader(event, 'Vary', 'Origin')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  setResponseHeader(
    event,
    'Access-Control-Allow-Headers',
    'Content-Type, x-api-key, ngrok-skip-browser-warning'
  )

  if (event.node.req.method === 'OPTIONS') {
    devLog(`[cors] ✅ OPTIONS request, respondiendo 204`)
    event.node.res.statusCode = 204
    return ''
  }
})
