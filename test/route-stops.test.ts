import { describe, expect, test } from 'bun:test'

import { buildRouteStops } from '../server/utils/routeStops'
import type { BootstrapData } from '../server/utils/normalize'

const baseData: BootstrapData = {
  assets: [],
  markers: [
    {
      id: 100,
      groupId: 1,
      description: 'Terminal Centro',
      lat: 18.234,
      lng: -66.034,
    },
    {
      id: 101,
      groupId: 1,
      description: 'Plaza Palmer',
      lat: 18.235,
      lng: -66.032,
    },
    { id: 102, groupId: 1, description: 'Bairoa', lat: 18.239, lng: -66.039 },
  ],
  routes: [
    {
      id: 20,
      clientId: 151,
      description: 'Ruta Centro',
      lineColor: '#0047AB',
      assetColorCode: '#0047AB',
      directionStartName: 'Terminal',
      directionEndName: 'Plaza',
      svgFillColor1: '#fff',
      svgFillColor2: '#000',
      isOpen: true,
      departureTimes: '',
    },
  ],
  routePoints: [
    {
      id: 900,
      routeId: 20,
      direction: 0,
      order: 2,
      markerId: 101,
      lat: 18.235,
      lng: -66.032,
      type: 'stop',
      distance: 300,
      angle: 0,
      seconds: 60,
    },
    {
      id: 901,
      routeId: 20,
      direction: 0,
      order: 1,
      markerId: 100,
      lat: 18.234,
      lng: -66.034,
      type: 'stop',
      distance: 0,
      angle: 0,
      seconds: 0,
    },
    {
      id: 902,
      routeId: 20,
      direction: 1,
      order: 1,
      markerId: 101,
      lat: 18.235,
      lng: -66.032,
      type: 'stop',
      distance: 0,
      angle: 0,
      seconds: 0,
    },
    {
      id: 903,
      routeId: 20,
      direction: 1,
      order: 2,
      markerId: 100,
      lat: 18.234,
      lng: -66.034,
      type: 'stop',
      distance: 310,
      angle: 0,
      seconds: 75,
    },
    {
      id: 904,
      routeId: 20,
      direction: 0,
      order: 3,
      markerId: null,
      lat: 18.236,
      lng: -66.033,
      type: 'shape',
      distance: 500,
      angle: 0,
      seconds: 100,
    },
    {
      id: 910,
      routeId: 21,
      direction: 0,
      order: 1,
      markerId: 102,
      lat: 18.239,
      lng: -66.039,
      type: 'stop',
      distance: 0,
      angle: 0,
      seconds: 0,
    },
  ],
  stops: [],
  config: {},
  positions: [],
}

describe('buildRouteStops', () => {
  test('groups route stops by direction with ordered stop metrics', () => {
    const feed = buildRouteStops(baseData, {
      routeId: 20,
      now: new Date('2026-05-10T06:00:00.000Z'),
    })

    expect(feed.generatedAt).toBe('2026-05-10T06:00:00.000Z')
    expect(feed.count).toBe(4)
    expect(feed.summary).toMatchObject({
      routeId: 20,
      routeName: 'Ruta Centro',
      routeColor: '#0047AB',
      isOpen: true,
      directionCount: 2,
      stopCount: 4,
    })
    expect(feed.summary.directions).toEqual([
      {
        direction: 0,
        label: 'Terminal → Plaza',
        stopCount: 2,
        totalDistanceMeters: 300,
        totalTravelSeconds: 60,
      },
      {
        direction: 1,
        label: 'Plaza → Terminal',
        stopCount: 2,
        totalDistanceMeters: 310,
        totalTravelSeconds: 75,
      },
    ])
    expect(feed.directions[0].stops).toMatchObject([
      {
        routePointId: 901,
        markerId: 100,
        name: 'Terminal Centro',
        sequence: 1,
        distanceMeters: 0,
        travelSecondsFromStart: 0,
        segmentDistanceMeters: null,
        segmentTravelSeconds: null,
      },
      {
        routePointId: 900,
        markerId: 101,
        name: 'Plaza Palmer',
        sequence: 2,
        distanceMeters: 300,
        travelSecondsFromStart: 60,
        segmentDistanceMeters: 300,
        segmentTravelSeconds: 60,
      },
    ])
  })

  test('returns an empty route sequence when a route has no stops', () => {
    const feed = buildRouteStops(baseData, {
      routeId: 999,
      now: new Date('2026-05-10T06:00:00.000Z'),
    })

    expect(feed.route).toBeNull()
    expect(feed.count).toBe(0)
    expect(feed.summary).toMatchObject({
      routeId: 999,
      routeName: null,
      directionCount: 0,
      stopCount: 0,
      directions: [],
    })
    expect(feed.directions).toEqual([])
  })
})
