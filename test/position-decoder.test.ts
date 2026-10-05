import { describe, expect, test } from 'bun:test'
import { decodePositions } from '../server/utils/positionDecoder'
import { normalizeGetAll } from '../server/utils/normalize'
import { getTelemetryAgeSeconds } from '../server/utils/telemetry'

// Fictional contract fixtures; never observations of a live vehicle.
const row = [
  10,
  0,
  '2026-10-05T13:00:00Z',
  5,
  0,
  '18.2,-66.1*18.1,-66',
  1,
  '',
  '',
  20,
  100,
  99,
]
const catalog = [
  [[10, 1, 'Fixture unit']],
  [],
  [
    [
      20,
      151,
      'Fixture route',
      '#000',
      '#000',
      'Start',
      'End',
      '#000',
      '#000',
      0,
      '',
    ],
  ],
  [[100, 20, 0, 1, 1, 18200000, -66100000, 'P', 0, 0, 0]],
  [],
]

describe('provider position contract', () => {
  test('decodes all twelve fields and the first trail point', () => {
    const decoded = decodePositions([row])
    expect(decoded.telemetry).toEqual({
      state: 'available',
      receivedRows: 1,
      rejectedRows: 0,
    })
    expect(decoded.positions[0]).toEqual({
      assetId: 10,
      driverId: 0,
      when: row[2],
      speed: 5,
      inputX: 0,
      trail: row[5],
      status: 1,
      msg: '',
      extendedDescription: '',
      routeId: 20,
      routePointNextId: 100,
      routePointPrevId: 99,
      lat: 18.2,
      lng: -66.1,
    })
    expect(normalizeGetAll([...catalog, [row]]).positions).toEqual(
      decoded.positions
    )
  })

  test('distinguishes an empty array from an unrecognized payload', () => {
    expect(decodePositions([]).telemetry).toEqual({
      state: 'empty',
      receivedRows: 0,
      rejectedRows: 0,
    })
    for (const value of [null, undefined, { data: [] }, 'not an array']) {
      expect(decodePositions(value)).toEqual({
        positions: [],
        telemetry: {
          state: 'incompatible',
          receivedRows: null,
          rejectedRows: 0,
        },
      })
    }
  })

  test('rejects nine short rows without inventing vehicles or losing the catalog', () => {
    const decoded = normalizeGetAll([
      ...catalog,
      Array.from({ length: 9 }, () => [20, 'summary', 'unknown']),
    ])
    expect(decoded.positions).toEqual([])
    expect(decoded.telemetry).toEqual({
      state: 'incompatible',
      receivedRows: 9,
      rejectedRows: 9,
    })
    expect(decoded.routes).toHaveLength(1)
    expect(decoded.stops).toHaveLength(1)
  })

  test('retains valid rows but reports partially incompatible telemetry', () => {
    const badId = [...row]
    badId[0] = '10'
    const badTrail = [...row]
    badTrail[5] = 18
    const decoded = decodePositions([row, badId, badTrail, {}])
    expect(decoded.positions).toHaveLength(1)
    expect(decoded.telemetry).toEqual({
      state: 'incompatible',
      receivedRows: 4,
      rejectedRows: 3,
    })
  })

  test('keeps structurally valid rows with missing or invalid timestamps unknown', () => {
    for (const timestamp of [null, '', 'not-a-date', '2026-10-05T13:00:00']) {
      const missing = [...row]
      missing[2] = timestamp
      const decoded = decodePositions([missing])
      expect(decoded.telemetry.state).toBe('available')
      expect(decoded.positions).toHaveLength(1)
      expect(
        getTelemetryAgeSeconds(
          decoded.positions[0].when,
          Date.parse('2026-10-05T13:01:00Z')
        )
      ).toBeNull()
    }
  })

  test('never invents zero coordinates for empty or invalid trails', () => {
    for (const trail of ['', ',', 'NaN,-66', '91,-66', '18,-181', '18,-66,0']) {
      const invalid = [...row]
      invalid[5] = trail
      expect(decodePositions([invalid]).positions[0]).toMatchObject({
        lat: null,
        lng: null,
      })
    }
  })

  test('a missing telemetry section preserves the catalog and reports incompatibility', () => {
    expect(normalizeGetAll(catalog)).toMatchObject({
      positions: [],
      telemetry: { state: 'incompatible', receivedRows: null },
    })
    expect(() => normalizeGetAll({})).toThrow(
      'Transport catalog payload incompatible'
    )
  })
})
