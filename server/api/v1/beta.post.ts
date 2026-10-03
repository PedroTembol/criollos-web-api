import {
  defineEventHandler,
  getRequestHeader,
  getRequestIP,
  setResponseHeader,
} from 'h3'
import {
  createBetaSignupStore,
  registerBetaSignup,
} from '../../utils/betaSignup'
import {
  enforceBetaAttemptLimit,
  readBetaRequestBody,
} from '../../utils/betaRequest'
import { sha256Hex } from '../../utils/secureHash'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const client =
    getRequestHeader(event, 'cf-connecting-ip') ||
    getRequestIP(event) ||
    'unknown'
  enforceBetaAttemptLimit(event, await sha256Hex(client))
  const body = await readBetaRequestBody(event)
  const binding =
    event.context.cloudflare?.env?.BETA_SIGNUPS ??
    event.context._platform?.cloudflare?.env?.BETA_SIGNUPS
  return registerBetaSignup(body, createBetaSignupStore(binding))
})
