import { devLog, devError } from '../utils/logging'
// Ruta sin prefijo /api/v1 que ejecuta el mismo handler que /api/v1/stops
// Esto maneja el caso donde ngrok remueve el prefijo antes de que llegue al servidor
import { defineEventHandler } from 'h3'
import { getAppConfig } from '../utils/config'
import { getBootstrapData } from '../utils/bootstrap'
import {
  applyCatalogConditionalCache,
  buildStopsCatalogResponse,
} from '../utils/catalogCache'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  devLog(`[stops] 📥 Petición recibida (sin prefijo): ${url}`)

  try {
    const config = getAppConfig()
    devLog(`[stops] ⚙️  Obteniendo datos de stops...`)

    const data = await getBootstrapData()
    devLog(
      `[stops] ✅ Datos obtenidos exitosamente - ${data.stops?.length || 0} paradas`
    )

    const payload = buildStopsCatalogResponse(data)
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
    devError(`[stops] ❌ Error:`, error)
    throw error
  }
})
