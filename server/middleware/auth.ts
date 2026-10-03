import { defineEventHandler, getRequestHeader, createError } from 'h3'
import { getAppConfig } from '../utils/config'
import { isPublicApiRoute } from '../utils/apiRoutes'
import {
  isPublicReadRequest,
  isPublicBetaSignupRequest,
  matchesApiKey,
} from '../utils/accessPolicy'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  const method = event.node.req.method || 'GET'
  if (
    !isPublicApiRoute(url) ||
    method === 'OPTIONS' ||
    isPublicReadRequest(method, url) ||
    isPublicBetaSignupRequest(method, url)
  )
    return

  const config = getAppConfig()
  if (config.apiKeys.length === 0) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Protected API access is not configured',
    })
  }
  const apiKey = getRequestHeader(event, 'x-api-key')
  if (!apiKey)
    throw createError({ statusCode: 401, statusMessage: 'Missing API key' })
  if (!(await matchesApiKey(apiKey, config.apiKeys))) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid API key' })
  }
})
