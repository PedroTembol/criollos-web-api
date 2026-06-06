import { defineEventHandler } from 'h3'
import { getGlobalHealth } from '../../utils/health'

export default defineEventHandler(async () => {
  return await getGlobalHealth()
})
