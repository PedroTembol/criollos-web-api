import { describe, expect, it } from 'bun:test'
import { buildStaleBootstrapResponse } from '../server/utils/bootstrap'

describe('buildStaleBootstrapResponse', () => {
  it('marks last-known-good transport data as stale and preserves its timestamp', () => {
    const lastKnownGood = {
      routes: [],
      stops: [],
      positions: [],
      fetchedAt: '2026-06-07T01:00:00.000Z',
    }

    expect(
      buildStaleBootstrapResponse(
        lastKnownGood,
        new Error('Upstream rate limited')
      )
    ).toEqual({
      ...lastKnownGood,
      stale: true,
      staleReason: 'Upstream rate limited',
    })
  })

  it('does not invent fallback data when no successful response exists', () => {
    expect(
      buildStaleBootstrapResponse(null, new Error('Upstream unavailable'))
    ).toBeNull()
  })
})
