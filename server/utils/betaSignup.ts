import { sha256Hex } from './secureHash'
import { createError } from 'h3'
import { reserveBetaWriteAttempt } from './betaQuota'

export const BETA_SIGNUP_RETENTION_SECONDS = 90 * 24 * 60 * 60

export type BetaSignup = {
  email: string
  platform: 'ios' | 'android' | 'both'
  createdAt: string
}

export interface BetaSignupStore {
  read(key: string): Promise<unknown>
  write(key: string, signup: BetaSignup): Promise<void>
}

export function validateBetaSignup(
  body: unknown,
  now = new Date()
): BetaSignup {
  if (
    !body ||
    typeof body !== 'object' ||
    !('email' in body) ||
    typeof body.email !== 'string'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid email is required',
    })
  }
  const email = body.email.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid email is required',
    })
  }
  const platform = 'platform' in body ? body.platform : 'both'
  if (platform !== 'ios' && platform !== 'android' && platform !== 'both') {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid platform is required',
    })
  }
  return { email, platform, createdAt: now.toISOString() }
}

export function createBetaSignupStore(
  binding: unknown
): BetaSignupStore | null {
  if (
    !binding ||
    typeof binding !== 'object' ||
    !('get' in binding) ||
    !('put' in binding) ||
    typeof binding.get !== 'function' ||
    typeof binding.put !== 'function'
  )
    return null
  return {
    read: (key) => binding.get(key, 'json'),
    write: async (key, signup) => {
      reserveBetaWriteAttempt()
      await binding.put(key, JSON.stringify(signup), {
        expirationTtl: BETA_SIGNUP_RETENTION_SECONDS,
      })
    },
  }
}

export async function registerBetaSignup(
  body: unknown,
  store: BetaSignupStore | null,
  now = new Date()
) {
  const signup = validateBetaSignup(body, now)
  if (!store)
    throw createError({
      statusCode: 503,
      statusMessage: 'Beta registration is temporarily unavailable',
    })
  const key = `beta:v1:${await sha256Hex(signup.email)}`
  try {
    if (!(await store.read(key))) await store.write(key, signup)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Beta registration is temporarily unavailable',
    })
  }
  return { ok: true, persisted: true, message: 'Interés registrado' }
}
