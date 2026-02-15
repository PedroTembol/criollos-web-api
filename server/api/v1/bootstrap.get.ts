import { defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { getAppConfig } from '../../utils/config'
import { getBootstrapData } from '../../utils/bootstrap'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  console.log(`[bootstrap] 📥 Petición recibida: ${url}`)
  
  try {
    const query = getQuery(event)
    const idMarker = query.idMarker ? Number(query.idMarker) : null
    console.log(`[bootstrap] 🔍 Query params: idMarker=${idMarker}`)
    
    const config = getAppConfig()
    console.log(`[bootstrap] ⚙️  Obteniendo datos de bootstrap...`)

    const data = await getBootstrapData(Number.isFinite(idMarker) ? idMarker : null)
    console.log(`[bootstrap] ✅ Datos obtenidos exitosamente`)

    setResponseHeader(event, 'Cache-Control', `public, max-age=${config.cacheTtlBootstrap}`)
    return data
  } catch (error) {
    console.error(`[bootstrap] ❌ Error:`, error)
    throw error
  }
})
