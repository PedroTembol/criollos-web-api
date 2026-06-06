import { describe, expect, test } from 'bun:test'
import { buildNearbyVehicles } from '../server/utils/nearbyVehicles'
import type { BootstrapResponse } from '../server/utils/bootstrap'

const mockBootstrapData: BootstrapResponse = {
  assets: [
    { id: 1, groupId: 1, description: 'Trolley 1' },
    { id: 2, groupId: 1, description: 'Trolley 2' },
  ],
  routes: [
    { id: 10, description: 'Ruta A', lineColor: '#FF0000' } as any,
    { id: 20, description: 'Ruta B', lineColor: '#00FF00' } as any,
  ],
  positions: [
    {
      assetId: 1,
      routeId: 10,
      lat: 18.2388,
      lng: -66.0352,
      speed: 20,
      status: 1,
      msg: 'Moving',
      when: '2026-05-18T06:00:00Z',
      driverId: 0,
      inputX: 0,
      trail: '',
      extendedDescription: '',
      routePointNextId: 0,
      routePointPrevId: 0,
    },
    {
      assetId: 2,
      routeId: 20,
      lat: 18.23,
      lng: -66.03,
      speed: 0,
      status: 0,
      msg: 'Stopped',
      when: '2026-05-18T06:05:00Z',
      driverId: 0,
      inputX: 0,
      trail: '',
      extendedDescription: '',
      routePointNextId: 0,
      routePointPrevId: 0,
    },
  ],
  markers: [],
  routePoints: [],
  stops: [],
  config: {},
  fetchedAt: '2026-05-18T06:10:00Z',
}

describe('buildNearbyVehicles', () => {
  test('returns nearby vehicles ordered by distance', () => {
    const result = buildNearbyVehicles(mockBootstrapData, {
      lat: 18.2388,
      lng: -66.0352,
      now: new Date('2026-05-18T06:10:00Z'),
    })

    expect(result.count).toBe(2)
    expect(result.data[0].assetId).toBe(1)
    expect(result.data[0].distanceMeters).toBe(0)
    expect(result.data[1].assetId).toBe(2)
    expect(result.data[1].distanceMeters).toBeGreaterThan(0)
    expect(result.summary.routeIds).toEqual([10, 20])
  })

  test('respects limit parameter', () => {
    const result = buildNearbyVehicles(mockBootstrapData, {
      lat: 18.2388,
      lng: -66.0352,
      limit: 1,
    })

    expect(result.count).toBe(1)
    expect(result.data.length).toBe(1)
    expect(result.data[0].assetId).toBe(1)
  })
})
