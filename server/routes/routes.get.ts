import { devLog, devError } from '../utils/logging'
// Ruta sin prefijo /api/v1 que ejecuta el mismo handler que /api/v1/routes
// Esto maneja el caso donde ngrok remueve el prefijo antes de que llegue al servidor
import { defineEventHandler } from 'h3'
import { getAppConfig } from '../utils/config'
import { getBootstrapData } from '../utils/bootstrap'
import {
  applyCatalogConditionalCache,
  buildRoutesCatalogResponse,
} from '../utils/catalogCache'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  devLog(`[routes] 📥 Petición recibida (sin prefijo): ${url}`)

  try {
    const config = getAppConfig()
    devLog(`[routes] ⚙️  Obteniendo datos de routes...`)

    const data = await getBootstrapData()
    devLog(
      `[routes] ✅ Datos obtenidos exitosamente - ${data.routes?.length || 0} rutas`
    )

    const payload = buildRoutesCatalogResponse(data)
    if (
      applyCatalogConditionalCache(
        event,
        payload,
        config.cacheTtlCatalog,
        data.fetchedAt
      )
    ) {
      return null
    }

    return payload
  } catch (error) {
    devError(`[routes] ❌ Error:`, error)
    throw error
  }
})
