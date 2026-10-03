import { describe, expect, test } from 'bun:test'
import {
  BETA_DAILY_WRITE_ATTEMPT_LIMIT,
  createBetaWriteAttemptGuard,
} from '../server/utils/betaQuota'

describe('per-isolate beta write attempt budget', () => {
  test('permits 100 reservations and rejects further attempts with a generic 503', () => {
    const guard = createBetaWriteAttemptGuard()
    const now = Date.parse('2026-10-03T13:00:00Z')
    for (let count = 0; count < BETA_DAILY_WRITE_ATTEMPT_LIMIT; count++)
      guard.reserve(now)
    try {
      guard.reserve(now)
      throw new Error('Expected the daily write budget to reject the attempt')
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 503,
        statusMessage: 'Beta registration is temporarily unavailable',
      })
    }
  })
  test('resets precisely at midnight UTC rather than the Puerto Rico calendar day', () => {
    const guard = createBetaWriteAttemptGuard()
    const beforeMidnight = Date.parse('2026-10-03T23:59:59.999Z')
    for (let count = 0; count < 100; count++) guard.reserve(beforeMidnight)
    expect(() => guard.reserve(beforeMidnight)).toThrow()
    expect(() =>
      guard.reserve(Date.parse('2026-10-04T00:00:00Z'))
    ).not.toThrow()
    for (let count = 1; count < 100; count++)
      guard.reserve(Date.parse('2026-10-04T00:00:00Z'))
    expect(() =>
      guard.reserve(Date.parse('2026-10-04T00:00:00.001Z'))
    ).toThrow()
  })
  test('failed puts consume reservations, while existing records require no reservation', async () => {
    const guard = createBetaWriteAttemptGuard()
    const now = Date.parse('2026-10-03T13:00:00Z')
    let puts = 0
    const writeIfNew = async (alreadyExists: boolean) => {
      if (alreadyExists) return
      guard.reserve(now)
      puts++
      throw new Error('Fixture KV write failure')
    }
    for (let count = 0; count < 150; count++) await writeIfNew(true)
    for (let count = 0; count < 100; count++) {
      await expect(writeIfNew(false)).rejects.toThrow(
        'Fixture KV write failure'
      )
    }
    expect(puts).toBe(100)
    await expect(writeIfNew(false)).rejects.toMatchObject({ statusCode: 503 })
    expect(puts).toBe(100)
    await expect(writeIfNew(true)).resolves.toBeUndefined()
  })
  test('rejects invalid clocks without changing the budget', () => {
    const guard = createBetaWriteAttemptGuard()
    expect(() => guard.reserve(NaN)).toThrow()
    expect(() => guard.reserve(Infinity)).toThrow()
    for (let count = 0; count < 100; count++) guard.reserve(0)
    expect(() => guard.reserve(0)).toThrow()
  })
})
