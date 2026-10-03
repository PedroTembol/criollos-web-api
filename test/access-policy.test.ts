import { describe, expect, test } from 'bun:test'
import {
  isPublicReadRequest,
  isPublicBetaSignupRequest,
  matchesApiKey,
} from '../server/utils/accessPolicy'
import { isPublicApiRoute } from '../server/utils/apiRoutes'

describe('public read access', () => {
  test('explicit transport/catalog routes allow anonymous reads with either prefix', () => {
    for (const path of [
      '/bootstrap',
      '/routes',
      '/stops',
      '/tracking',
      '/vehicles/positions',
      '/vehicles/nearby',
      '/stops/nearby',
      '/eta',
      '/routes/151/stops',
      '/eventos/calendar',
      '/calendars/eventos.ics',
    ]) {
      for (const prefix of ['', '/api/v1'])
        for (const method of ['GET', 'HEAD']) {
          expect(isPublicReadRequest(method, `${prefix}${path}?limit=3`)).toBe(
            true
          )
        }
    }
  })
  test('unknown children, malformed paths and write methods retain auth', () => {
    for (const path of [
      '/api/v1/admin',
      '/api/v1/beta',
      '/api/v1/feedback',
      '/api/v1/routes/0/stops',
      '/api/v1/routes/foo/stops',
      '/api/v1/eventos/delete',
      '/api/v10/routes',
    ]) {
      expect(isPublicReadRequest('GET', path)).toBe(false)
    }
    for (const method of ['POST', 'PATCH', 'DELETE', 'PUT'])
      expect(isPublicReadRequest(method, '/api/v1/eventos')).toBe(false)
    expect(isPublicApiRoute('/api/v10/routes')).toBe(false)
    expect(isPublicApiRoute('/api/v1/beta')).toBe(true)
  })
  test('only the exact beta POST is public; no beta reads or child writes', () => {
    expect(isPublicBetaSignupRequest('POST', '/api/v1/beta')).toBe(true)
    for (const path of [
      '/beta',
      '/api/v1/beta/admin',
      '/api/v1/feedback',
      '/api/v1/beta/',
    ])
      expect(isPublicBetaSignupRequest('POST', path)).toBe(false)
    expect(isPublicBetaSignupRequest('GET', '/api/v1/beta')).toBe(false)
  })
  test('protected key comparison only accepts configured keys', async () => {
    expect(
      await matchesApiKey('local-test-key', ['another', 'local-test-key'])
    ).toBe(true)
    expect(
      await matchesApiKey('local-test-key-extra', ['local-test-key'])
    ).toBe(false)
    expect(await matchesApiKey('local-test-key', [])).toBe(false)
  })
})
