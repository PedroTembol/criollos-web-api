import { createError } from 'h3'

export const BETA_DAILY_WRITE_ATTEMPT_LIMIT = 100
const UTC_DAY_MS = 24 * 60 * 60_000

/**
 * Best-effort protection within one live isolate, not a global KV quota.
 * Reserve immediately before put; failed writes consume budget. Existing
 * records must be checked first so duplicate registrations never reserve.
 */
export function createBetaWriteAttemptGuard() {
  let utcDay: number | null = null
  let attempts = 0
  return {
    reserve(now = Date.now()): void {
      if (!Number.isFinite(now)) throw new RangeError('Invalid beta quota time')
      const day = Math.floor(now / UTC_DAY_MS)
      if (day !== utcDay) {
        utcDay = day
        attempts = 0
      }
      if (attempts >= BETA_DAILY_WRITE_ATTEMPT_LIMIT) {
        throw createError({
          statusCode: 503,
          statusMessage: 'Beta registration is temporarily unavailable',
        })
      }
      attempts++
    },
  }
}

export const betaWriteAttemptGuard = createBetaWriteAttemptGuard()

export function reserveBetaWriteAttempt(now = Date.now()): void {
  betaWriteAttemptGuard.reserve(now)
}
