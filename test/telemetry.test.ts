import { describe, expect, test } from 'bun:test'
import { getTelemetryAgeSeconds } from '../server/utils/telemetry'
import {
  buildTrackingSnapshot,
  trackingTestables,
} from '../server/utils/tracking'

const now = new Date('2026-10-05T13:00:00Z')

describe('telemetry source clocks', () => {
  test('recognizes an explicit offset and the strict two-minute boundary', () => {
    expect(
      getTelemetryAgeSeconds('2026-10-05T08:59:00-04:00', now.getTime())
    ).toBe(60)
    expect(getTelemetryAgeSeconds('2026-10-05T12:58:00Z', now.getTime())).toBe(
      120
    )
    const age = getTelemetryAgeSeconds(
      '2026-10-05T12:57:59.999Z',
      now.getTime()
    )
    expect(age).toBe(121)
    expect(trackingTestables.getFreshnessLabel(age)).toBe('stale')
  })

  test('treats invalid, missing, timezone-less and future timestamps as unknown', () => {
    for (const timestamp of [
      null,
      undefined,
      '',
      'invalid',
      0,
      '2026-10-05',
      '2026-10-05T13:00:00',
      '2026-10-05T13:00:00.001Z',
    ]) {
      const age = getTelemetryAgeSeconds(timestamp, now.getTime())
      expect(age).toBeNull()
      expect(trackingTestables.getFreshnessLabel(age)).toBe('unknown')
    }
  })

  test('does not expose a future timestamp as the last vehicle report in tracking', () => {
    const snapshot = buildTrackingSnapshot(
      {
        assets: [],
        markers: [],
        routes: [],
        routePoints: [],
        stops: [],
        config: {},
        positions: [
          {
            assetId: 1,
            routeId: 2,
            when: '2026-10-05T14:00:00Z',
            speed: 0,
            status: 1,
            lat: null,
            lng: null,
          },
        ],
      } as any,
      now.toISOString(),
      now
    )
    expect(snapshot.vehicles[0].freshnessSeconds).toBeNull()
    expect(snapshot.vehicles[0].freshnessLabel).toBe('unknown')
    expect(snapshot.summary.liveVehicles).toBe(0)
    expect(snapshot.summary.routes[0].lastReportedAt).toBeNull()
  })
})
