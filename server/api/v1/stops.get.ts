import { defineEventHandler, setResponseHeader } from 'h3'
import { getAppConfig } from '../../utils/config'
import { getBootstrapData } from '../../utils/bootstrap'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  console.log(`[stops] 📥 Petición recibida: ${url}`)
  
  try {
    const config = getAppConfig()
    console.log(`[stops] ⚙️  Obteniendo datos de stops...`)

    const data = await getBootstrapData()
    console.log(`[stops] ✅ Datos obtenidos exitosamente - ${data.stops?.length || 0} paradas`)

    setResponseHeader(event, 'Cache-Control', `public, max-age=${config.cacheTtlCatalog}`)
    return {
      stops: data.stops,
      fetchedAt: data.fetchedAt
    }
  } catch (error) {
    console.error(`[stops] ❌ Error:`, error)
    throw error
  }
})
