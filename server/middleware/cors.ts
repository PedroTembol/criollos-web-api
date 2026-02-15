import { defineEventHandler, getRequestHeader, setResponseHeader } from 'h3'
import { getAppConfig } from '../utils/config'

// Rutas de la API que deben tener CORS
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

export default defineEventHandler((event) => {
  // Leer la URL después de que el rewrite haya sido aplicado
  const url = event.node.req.url || ''
  const method = event.node.req.method || 'GET'
  
  console.log(`[cors] 🌐 Verificando CORS: ${method} ${url} (después del rewrite)`)
  
  if (!isApiRoute(url)) {
    console.log(`[cors] ⏭️  No es ruta de API, saltando`)
    return
  }

  const config = getAppConfig()
  const origin = getRequestHeader(event, 'origin') || ''
  const allowList = config.corsOrigins

  let allowedOrigin = '*'
  if (allowList.length > 0) {
    allowedOrigin = allowList.includes(origin) ? origin : allowList[0]
  }

  console.log(`[cors] ✅ Configurando CORS - Origin: ${origin}, Allowed: ${allowedOrigin}`)

  setResponseHeader(event, 'Access-Control-Allow-Origin', allowedOrigin)
  setResponseHeader(event, 'Vary', 'Origin')
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, x-api-key, ngrok-skip-browser-warning')

  if (event.node.req.method === 'OPTIONS') {
    console.log(`[cors] ✅ OPTIONS request, respondiendo 204`)
    event.node.res.statusCode = 204
    return ''
  }
})
