import { describe, expect, test } from 'bun:test'

import {
  buildRoutesCatalogResponse,
  buildStopsCatalogResponse,
} from '../server/utils/catalogCache'
import type { BootstrapResponse } from '../server/utils/bootstrap'

describe('catalog cache payload helpers', () => {
  const bootstrap: BootstrapResponse = {
    fetchedAt: '2026-05-14T06:00:00.000Z',
    assets: [{ id: 1, groupId: 10, description: 'Unidad 1' }],
    markers: [
      { id: 101, groupId: 10, description: 'Plaza', lat: 18.234, lng: -66.037 },
    ],
    routes: [
      {
        id: 20,
        clientId: 151,
        description: 'Centro Urbano',
        lineColor: '#1d4ed8',
        assetColorCode: '#1d4ed8',
        directionStartName: 'Plaza',
        directionEndName: 'Terminal',
        svgFillColor1: '#1d4ed8',
        svgFillColor2: '#fbbf24',
        isOpen: true,
        departureTimes: '',
      },
    ],
    routePoints: [
      {
        id: 500,
        routeId: 20,
        direction: 1,
        order: 1,
        markerId: 101,
        lat: 18.234,
        lng: -66.037,
        type: 'stop',
        distance: 0,
        angle: 0,
        seconds: 0,
      },
    ],
    stops: [
      {
        id: 500,
        routeId: 20,
        direction: 1,
        order: 1,
        markerId: 101,
        lat: 18.234,
        lng: -66.037,
        type: 'stop',
        distance: 0,
        angle: 0,
        seconds: 0,
      },
    ],
    config: { city: 'Caguas' },
    positions: [
      {
        assetId: 1,
        driverId: 9,
        when: '2026-05-14T06:00:00.000Z',
        speed: 0,
        inputX: 0,
        trail: '18.234,-66.037',
        status: 0,
        msg: '',
        extendedDescription: 'Unidad 1',
        routeId: 20,
        routePointNextId: 500,
        routePointPrevId: 500,
        lat: 18.234,
        lng: -66.037,
      },
    ],
  }

  test('routes payload keeps only routes plus fetchedAt for stable ETag generation', () => {
    expect(buildRoutesCatalogResponse(bootstrap)).toEqual({
      routes: bootstrap.routes,
      fetchedAt: bootstrap.fetchedAt,
    })
  })

  test('stops payload keeps only stops plus fetchedAt for stable ETag generation', () => {
    expect(buildStopsCatalogResponse(bootstrap)).toEqual({
      stops: bootstrap.stops,
      fetchedAt: bootstrap.fetchedAt,
    })
  })
})
