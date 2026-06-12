import { describe, expect, test } from 'bun:test'

import { isPublicApiRoute, publicApiRoutes } from '../server/utils/apiRoutes'

describe('public API route registry', () => {
  test('keeps all public endpoints in the shared middleware registry', () => {
    expect(publicApiRoutes).toEqual([
      '/bootstrap',
      '/routes',
      '/stops',
      '/vehicles/positions',
      '/vehicles/nearby',
      '/tracking',
      '/eta',
      '/eventos',
      '/gastronomia',
      '/discovery',
      '/recommendations',
      '/search',
      '/proactive-recommendations',
      '/notifications',
      '/assistant',
      '/feedback',
      '/health',
    ])
  })

  test('matches prefixed, bare, nested and query-string public API urls', () => {
    expect(isPublicApiRoute('/api/v1/discovery')).toBe(true)
    expect(isPublicApiRoute('/discovery')).toBe(true)
    expect(isPublicApiRoute('/discovery?type=evento')).toBe(true)
    expect(isPublicApiRoute('/feedback/submit')).toBe(true)
    expect(isPublicApiRoute('/api/v1/tracking?routeId=21')).toBe(true)
    expect(isPublicApiRoute('/notifications?source=tracking')).toBe(true)
  })

  test('ignores website routes and empty values', () => {
    expect(isPublicApiRoute('')).toBe(false)
    expect(isPublicApiRoute('/')).toBe(false)
    expect(isPublicApiRoute('/discovery-center')).toBe(false)
    expect(isPublicApiRoute('/landing')).toBe(false)
  })
})
