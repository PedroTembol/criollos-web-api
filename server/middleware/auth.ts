import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { getAppConfig } from '../utils/config'

// Rutas de la API que deben ser protegidas
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
  
  console.log(`[auth] 🔍 Verificando autenticación: ${method} ${url} (después del rewrite)`)
  
  if (!isApiRoute(url)) {
    console.log(`[auth] ⏭️  No es ruta de API, saltando`)
    return
  }

  if (event.node.req.method === 'OPTIONS') {
    console.log(`[auth] ✅ OPTIONS request, saltando autenticación`)
    return
  }

  const config = getAppConfig()
  console.log(`[auth] 🔑 API Keys configuradas: ${config.apiKeys.length}`)
  
  if (config.apiKeys.length === 0) {
    console.log(`[auth] ⚠️  No hay API keys configuradas, saltando autenticación`)
    return
  }

  const apiKey = getRequestHeader(event, 'x-api-key')
  console.log(`[auth] 🔑 API Key recibida: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NINGUNA'}`)
  
  if (!apiKey) {
    console.log(`[auth] ❌ Error: Missing API key`)
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing API key'
    })
  }

  if (!config.apiKeys.includes(apiKey)) {
    console.log(`[auth] ❌ Error: Invalid API key`)
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid API key'
    })
  }
  
  console.log(`[auth] ✅ Autenticación exitosa`)
})
