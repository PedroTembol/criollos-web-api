import { describe, test, expect } from 'bun:test'
import { parseEtaQuery, resolveEtaPath } from '../server/utils/etaQuery'

describe('ETA query contract', () => {
  test('requires vehicle and destination degrees or valid asset/routepoint IDs', () => {
    expect(parseEtaQuery({ latlngs: '18.2,-66.1|18.25,-66.05' }).latlngs).toBe(
      '18.2,-66.1|18.25,-66.05'
    )
    expect(parseEtaQuery({ assetId: '1', stopId: '362' })).toMatchObject({
      assetId: 1,
      stopId: 362,
      latlngs: '',
    })
    for (const query of [
      {},
      { latlngs: '18.2,-66.1' },
      { latlngs: '18200000,-66100000|18,-66' },
      { latlngs: 'NaN,0|18,-66' },
      { latlngs: ',|18,-66' },
      { assetId: '1', stopId: 'NaN' },
      { assetId: '1.2', stopId: '1' },
      { latlngs: '18,-66|18,-66', time: 'NaN' },
    ]) {
      expect(() => parseEtaQuery(query)).toThrow()
    }
  })
})

test('ETA selects only the requested recent vehicle, never a different same-route unit', () => {
  const now = Date.parse('2026-10-03T17:00:00Z')
  const data = {
    assets: [
      { id: 1, description: '1' },
      { id: 2, description: '2' },
    ],
    routePoints: [{ id: 5, lat: 18200000, lng: -66100000 }],
    positions: [
      { assetId: 2, lat: 18.19, lng: -66.09, when: '2026-10-03T16:59:59Z' },
    ],
  } as any
  expect(resolveEtaPath(data, 1, 5, now)).toBe('')
  expect(resolveEtaPath(data, 2, 5, now)).toBe('18.19,-66.09|18.2,-66.1')
  expect(resolveEtaPath({ ...data, stale: true }, 2, 5, now)).toBe('')
  expect(resolveEtaPath(data, 2, 5, now + 180000)).toBe('')
  for (const when of [
    'invalid',
    '2026-10-03T17:00:00',
    '2026-10-03T17:00:00.001Z',
  ]) {
    expect(
      resolveEtaPath(
        { ...data, positions: [{ ...data.positions[0], when }] },
        2,
        5,
        now
      )
    ).toBe('')
  }
  expect(
    resolveEtaPath({ ...data, telemetry: { state: 'incompatible' } }, 2, 5, now)
  ).toBe('')
  expect(
    resolveEtaPath(
      { ...data, routePoints: [{ id: 5, lat: 18.2, lng: -66.1 }] },
      2,
      5,
      now
    )
  ).toBe('18.19,-66.09|18.2,-66.1')
})
