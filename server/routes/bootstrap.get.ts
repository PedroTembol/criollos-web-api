import { devLog, devError } from '../utils/logging'
// Ruta sin prefijo /api/v1 que ejecuta el mismo handler que /api/v1/bootstrap
// Esto maneja el caso donde ngrok remueve el prefijo antes de que llegue al servidor
import { defineEventHandler, getQuery } from 'h3'
import { getAppConfig } from '../utils/config'
import { getBootstrapData } from '../utils/bootstrap'
import { applyCatalogConditionalCache } from '../utils/catalogCache'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  devLog(`[bootstrap] 📥 Petición recibida (sin prefijo): ${url}`)

  try {
    const query = getQuery(event)
    const idMarker = query.idMarker ? Number(query.idMarker) : null
    devLog(`[bootstrap] 🔍 Query params: idMarker=${idMarker}`)

    const config = getAppConfig()
    devLog(`[bootstrap] ⚙️  Obteniendo datos de bootstrap...`)

    const data = await getBootstrapData(
      Number.isFinite(idMarker) ? idMarker : null
    )
    devLog(`[bootstrap] ✅ Datos obtenidos exitosamente`)

    if (
      applyCatalogConditionalCache(
        event,
        data,
        config.cacheTtlBootstrap,
        data.fetchedAt
      )
    ) {
      return null
    }

    return data
  } catch (error) {
    devError(`[bootstrap] ❌ Error:`, error)
    throw error
  }
})
