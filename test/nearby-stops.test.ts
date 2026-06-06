import { describe, expect, test } from 'bun:test'

import {
  buildNearbyStops,
  nearbyStopsTestables,
} from '../server/utils/nearbyStops'
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
    {
      id: 103,
      groupId: 1,
      description: 'Sin coordenadas',
      lat: null,
      lng: null,
    },
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
    {
      id: 21,
      clientId: 151,
      description: 'Ruta Bairoa',
      lineColor: '#E11D48',
      assetColorCode: '#E11D48',
      directionStartName: 'Centro',
      directionEndName: 'Bairoa',
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
      id: 901,
      routeId: 20,
      direction: 1,
      order: 8,
      markerId: 100,
      lat: 18.234,
      lng: -66.034,
      type: 'stop',
      distance: 900,
      angle: 0,
      seconds: 600,
    },
    {
      id: 902,
      routeId: 20,
      direction: 0,
      order: 3,
      markerId: 101,
      lat: 18.235,
      lng: -66.032,
      type: 'stop',
      distance: 300,
      angle: 0,
      seconds: 60,
    },
    {
      id: 910,
      routeId: 21,
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
      id: 912,
      routeId: 21,
      direction: 0,
      order: 3,
      markerId: 102,
      lat: 18.239,
      lng: -66.039,
      type: 'stop',
      distance: 320,
      angle: 0,
      seconds: 90,
    },
    {
      id: 920,
      routeId: 21,
      direction: 0,
      order: 4,
      markerId: null,
      lat: 18.24,
      lng: -66.04,
      type: 'shape',
      distance: 450,
      angle: 0,
      seconds: 120,
    },
  ],
  stops: [],
  config: {},
  positions: [],
}

describe('buildNearbyStops', () => {
  test('returns stops ordered by distance with route metadata', () => {
    const feed = buildNearbyStops(baseData, {
      lat: 18.2341,
      lng: -66.0341,
      limit: 2,
      now: new Date('2026-05-05T15:45:00.000Z'),
    })

    expect(feed.generatedAt).toBe('2026-05-05T15:45:00.000Z')
    expect(feed.count).toBe(2)
    expect(feed.summary).toMatchObject({
      origin: { lat: 18.2341, lng: -66.0341 },
      totalStops: 3,
      returnedStops: 2,
      maxDistanceMeters: null,
      routeIds: [20, 21],
    })
    expect(feed.summary.nearestDistanceMeters).toBeLessThan(20)
    expect(feed.data[0]).toMatchObject({
      markerId: 100,
      name: 'Terminal Centro',
      routeCount: 2,
      routes: [
        {
          routeId: 21,
          routeName: 'Ruta Bairoa',
          routeColor: '#E11D48',
          routePointIds: [910],
          directions: [0],
        },
        {
          routeId: 20,
          routeName: 'Ruta Centro',
          routeColor: '#0047AB',
          routePointIds: [900, 901],
          directions: [0, 1],
        },
      ],
    })
    expect(feed.data[0].distanceLabel).toMatch(/m$/)
    expect(feed.data[1].markerId).toBe(101)
  })

  test('supports max distance filters and clamps limits', () => {
    const feed = buildNearbyStops(baseData, {
      lat: 18.2341,
      lng: -66.0341,
      limit: 99,
      maxDistanceMeters: 50,
      now: new Date('2026-05-05T15:45:00.000Z'),
    })

    expect(feed.count).toBe(1)
    expect(feed.summary.totalStops).toBe(1)
    expect(feed.summary.maxDistanceMeters).toBe(50)
    expect(feed.data[0].markerId).toBe(100)
  })

  test('formats kilometer distances for far stops', () => {
    expect(
      nearbyStopsTestables.getDistanceMeters(
        { lat: 18.234, lng: -66.034 },
        { lat: 18.239, lng: -66.039 }
      )
    ).toBeGreaterThan(700)
    expect(nearbyStopsTestables.formatDistanceLabel(1850)).toBe('1.9 km')
  })
})
