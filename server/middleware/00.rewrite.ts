import { defineEventHandler } from 'h3'
import { publicApiRoutes } from '../utils/apiRoutes'
import { devLog } from '../utils/logging'

/**
 * Middleware que reescribe las rutas sin prefijo /api/v1 a /api/v1/...
 * Esto maneja el caso donde ngrok remueve el prefijo antes de que llegue al servidor.
 */
export default defineEventHandler((event) => {
  const originalUrl = event.node.req.url || ''
  const method = event.node.req.method || 'GET'

  devLog(`[rewrite] 🔄 ${method} ${originalUrl}`)

  // Si ya tiene el prefijo /api/v1, no hacer nada
  if (originalUrl.startsWith('/api/v1')) {
    devLog(`[rewrite] ✅ Ya tiene prefijo /api/v1, no se reescribe`)
    return
  }

  // Si es una ruta de la API sin prefijo, agregar el prefijo
  for (const route of publicApiRoutes) {
    if (
      originalUrl === route ||
      originalUrl.startsWith(route + '/') ||
      originalUrl.startsWith(route + '?')
    ) {
      const newUrl = '/api/v1' + originalUrl
      // Cambiar la URL en el request
      event.node.req.url = newUrl
      // También actualizar context.url si existe
      if (event.context) {
        event.context.url = newUrl
      }
      devLog(`[rewrite] 🔀 Reescribiendo: ${originalUrl} -> ${newUrl}`)
      devLog(
        `[rewrite] ✅ Verificación - event.node.req.url ahora es: ${event.node.req.url}`
      )
      return
    }
  }

  devLog(`[rewrite] ⏭️  No es una ruta de API, saltando`)
})
