// Ruta sin prefijo /api/v1 que ejecuta el mismo handler que /api/v1/routes
// Esto maneja el caso donde ngrok remueve el prefijo antes de que llegue al servidor
import { defineEventHandler, setResponseHeader } from 'h3'
import { getAppConfig } from '../utils/config'
import { getBootstrapData } from '../utils/bootstrap'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  console.log(`[routes] 📥 Petición recibida (sin prefijo): ${url}`)
  
  try {
    const config = getAppConfig()
    console.log(`[routes] ⚙️  Obteniendo datos de routes...`)

    const data = await getBootstrapData()
    console.log(`[routes] ✅ Datos obtenidos exitosamente - ${data.routes?.length || 0} rutas`)

    setResponseHeader(event, 'Cache-Control', `public, max-age=${config.cacheTtlCatalog}`)
    return {
      routes: data.routes,
      fetchedAt: data.fetchedAt
    }
  } catch (error) {
    console.error(`[routes] ❌ Error:`, error)
    throw error
  }
})
