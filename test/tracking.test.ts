import { describe, expect, test } from 'bun:test'

import {
  buildTrackingSnapshot,
  filterTrackingSnapshot,
  trackingTestables,
  type TrackingSnapshot,
} from '../server/utils/tracking'
import type { BootstrapData } from '../server/utils/normalize'

const baseData: BootstrapData = {
  assets: [
    { id: 10, groupId: 1, description: 'Trolley Centro' },
    { id: 11, groupId: 1, description: 'Trolley Bairoa' },
    { id: 12, groupId: 1, description: 'Trolley Express' },
  ],
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
      direction: 0,
      order: 2,
      markerId: null,
      lat: 18.2345,
      lng: -66.033,
      type: 'shape',
      distance: 150,
      angle: 0,
      seconds: 30,
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
      id: 911,
      routeId: 21,
      direction: 0,
      order: 2,
      markerId: null,
      lat: 18.236,
      lng: -66.036,
      type: 'shape',
      distance: 150,
      angle: 0,
      seconds: 40,
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
  ],
  stops: [],
  config: {},
  positions: [
    {
      assetId: 10,
      driverId: 77,
      when: '2026-03-15T06:00:00.000Z',
      speed: 12,
      inputX: 0,
      trail: '18.2347,-66.0328',
      status: 1,
      msg: 'En ruta',
      extendedDescription: '',
      routeId: 20,
      routePointNextId: 901,
      routePointPrevId: 900,
      lat: 18.2347,
      lng: -66.0328,
    },
    {
      assetId: 11,
      driverId: 78,
      when: '2026-03-15T05:56:30.000Z',
      speed: 0,
      inputX: 0,
      trail: '18.2365,-66.0368',
      status: 1,
      msg: 'Esperando',
      extendedDescription: '',
      routeId: 21,
      routePointNextId: 911,
      routePointPrevId: 910,
      lat: 18.2365,
      lng: -66.0368,
    },
    {
      assetId: 12,
      driverId: 79,
      when: 'not-a-date',
      speed: 0,
      inputX: 0,
      trail: '',
      status: 0,
      msg: '',
      extendedDescription: 'Sin reportar',
      routeId: 21,
      routePointNextId: 912,
      routePointPrevId: 910,
      lat: null,
      lng: null,
    },
  ],
}

describe('buildTrackingSnapshot', () => {
  test('enriches vehicles with route labels and adjacent stops', () => {
    const snapshot = buildTrackingSnapshot(
      baseData,
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    expect(snapshot.vehicles).toHaveLength(3)
    expect(snapshot.vehicles[0]).toMatchObject({
      assetId: 10,
      label: 'Trolley Centro',
      routeName: 'Ruta Centro',
      statusLabel: 'moving',
      freshnessSeconds: 60,
      freshnessLabel: 'live',
      nextStop: {
        routePointId: 902,
        markerId: 101,
        name: 'Plaza Palmer',
      },
      nextStopEtaSeconds: 30,
      previousStop: {
        routePointId: 900,
        markerId: 100,
        name: 'Terminal Centro',
      },
    })

    expect(snapshot.summary).toEqual({
      totalVehicles: 3,
      filteredVehicles: 3,
      liveVehicles: 1,
      staleVehicles: 1,
      unknownVehicles: 1,
      movingVehicles: 1,
      stoppedVehicles: 1,
      idleVehicles: 1,
      unknownStatusVehicles: 0,
      routeIds: [20, 21],
      routes: [
        {
          routeId: 20,
          routeName: 'Ruta Centro',
          routeColor: '#0047AB',
          directionStartName: 'Terminal',
          directionEndName: 'Plaza',
          totalVehicles: 1,
          liveVehicles: 1,
          staleVehicles: 0,
          unknownVehicles: 0,
          movingVehicles: 1,
          stoppedVehicles: 0,
          idleVehicles: 0,
          vehicleLabels: ['Trolley Centro'],
          nextStops: ['Plaza Palmer'],
          lastReportedAt: '2026-03-15T06:00:00.000Z',
          leadVehicle: {
            assetId: 10,
            label: 'Trolley Centro',
            statusLabel: 'moving',
            freshnessLabel: 'live',
            freshnessSeconds: 60,
            when: '2026-03-15T06:00:00.000Z',
            nextStopName: 'Plaza Palmer',
            nextStopEtaSeconds: 30,
            previousStopName: 'Terminal Centro',
            message: 'En ruta',
          },
          telemetry: {
            knownVehicleCount: 1,
            unknownVehicleCount: 0,
            newestAgeSeconds: 60,
            oldestAgeSeconds: 60,
            medianAgeSeconds: 60,
            p90AgeSeconds: 60,
          },
          healthLabel: 'operational',
          coveragePercent: 100,
        },
        {
          routeId: 21,
          routeName: 'Ruta Bairoa',
          routeColor: '#E11D48',
          directionStartName: 'Centro',
          directionEndName: 'Bairoa',
          totalVehicles: 2,
          liveVehicles: 0,
          staleVehicles: 1,
          unknownVehicles: 1,
          movingVehicles: 0,
          stoppedVehicles: 1,
          idleVehicles: 1,
          vehicleLabels: ['Trolley Bairoa', 'Trolley Express'],
          nextStops: ['Bairoa'],
          lastReportedAt: '2026-03-15T05:56:30.000Z',
          leadVehicle: {
            assetId: 11,
            label: 'Trolley Bairoa',
            statusLabel: 'stopped',
            freshnessLabel: 'stale',
            freshnessSeconds: 270,
            when: '2026-03-15T05:56:30.000Z',
            nextStopName: 'Bairoa',
            nextStopEtaSeconds: 50,
            previousStopName: 'Terminal Centro',
            message: 'Esperando',
          },
          telemetry: {
            knownVehicleCount: 1,
            unknownVehicleCount: 1,
            newestAgeSeconds: 270,
            oldestAgeSeconds: 270,
            medianAgeSeconds: 270,
            p90AgeSeconds: 270,
          },
          healthLabel: 'delayed',
          coveragePercent: 50,
        },
      ],
      upcomingStops: [
        {
          stopKey: 'marker-102',
          routePointId: 912,
          markerId: 102,
          name: 'Bairoa',
          lat: 18.239,
          lng: -66.039,
          arrivalCount: 2,
          liveVehicleCount: 0,
          routeIds: [21],
          routeNames: ['Ruta Bairoa'],
          nextArrivalEtaSeconds: 0,
          vehicles: [
            {
              assetId: 12,
              label: 'Trolley Express',
              routeId: 21,
              routeName: 'Ruta Bairoa',
              routeColor: '#E11D48',
              freshnessLabel: 'unknown',
              nextStopEtaSeconds: 0,
            },
            {
              assetId: 11,
              label: 'Trolley Bairoa',
              routeId: 21,
              routeName: 'Ruta Bairoa',
              routeColor: '#E11D48',
              freshnessLabel: 'stale',
              nextStopEtaSeconds: 50,
            },
          ],
        },
        {
          stopKey: 'marker-101',
          routePointId: 902,
          markerId: 101,
          name: 'Plaza Palmer',
          lat: 18.235,
          lng: -66.032,
          arrivalCount: 1,
          liveVehicleCount: 1,
          routeIds: [20],
          routeNames: ['Ruta Centro'],
          nextArrivalEtaSeconds: 30,
          vehicles: [
            {
              assetId: 10,
              label: 'Trolley Centro',
              routeId: 20,
              routeName: 'Ruta Centro',
              routeColor: '#0047AB',
              freshnessLabel: 'live',
              nextStopEtaSeconds: 30,
            },
          ],
        },
      ],
      bounds: {
        minLat: 18.2347,
        maxLat: 18.2365,
        minLng: -66.0368,
        maxLng: -66.0328,
      },
      freshnessBuckets: {
        live: 1,
        delayed: 1,
        offline: 0,
        unknown: 1,
      },
      telemetry: {
        knownVehicleCount: 2,
        unknownVehicleCount: 1,
        newestAgeSeconds: 60,
        oldestAgeSeconds: 270,
        medianAgeSeconds: 165,
        p90AgeSeconds: 270,
      },
      dataQuality: {
        totalVehicles: 3,
        completeVehicleCount: 2,
        qualityPercent: 67,
        missingCoordinateVehicles: 1,
        missingNextStopVehicles: 0,
        missingPreviousStopVehicles: 0,
        missingRouteNameVehicles: 0,
        unknownFreshnessVehicles: 1,
        unknownStatusVehicles: 0,
        issues: [
          {
            id: 'missing-coordinates',
            severity: 'warning',
            title: 'Unidades sin coordenadas',
            message:
              'Estas unidades no pueden ubicarse en el mapa hasta que reporten latitud y longitud válidas.',
            count: 1,
            affectedAssetIds: [12],
          },
          {
            id: 'unknown-freshness',
            severity: 'warning',
            title: 'Unidades sin timestamp válido',
            message:
              'Estas unidades no tienen una hora de reporte válida para calcular frescura de señal.',
            count: 1,
            affectedAssetIds: [12],
          },
        ],
      },
      serviceHealth: {
        status: 'degraded',
        coveragePercent: 67,
        liveCoveragePercent: 33,
        routeHealth: {
          operational: 1,
          delayed: 1,
          offline: 0,
          'no-signal': 0,
        },
      },
      alerts: [
        {
          id: 'service-degraded',
          dedupeKey: 'tracking:service:degraded',
          scope: 'service',
          severity: 'warning',
          title: 'Servicio degradado',
          message:
            '67% de cobertura en 3 unidades visibles. 1 ruta retrasada, 0 rutas offline y 0 rutas sin señal.',
          routeId: null,
          routeName: null,
          healthLabel: null,
          coveragePercent: 67,
          liveVehicles: 1,
          totalVehicles: 3,
          lastReportedAt: null,
        },
        {
          id: 'route-21-delayed',
          dedupeKey: 'tracking:route:21:delayed',
          scope: 'route',
          severity: 'warning',
          title: 'Ruta Bairoa con señal retrasada',
          message:
            '50% de cobertura, 0 unidades en vivo de 2 unidades visibles. Último reporte 2026-03-15T05:56:30.000Z.',
          routeId: 21,
          routeName: 'Ruta Bairoa',
          healthLabel: 'delayed',
          coveragePercent: 50,
          liveVehicles: 0,
          totalVehicles: 2,
          lastReportedAt: '2026-03-15T05:56:30.000Z',
        },
      ],
    })
  })

  test('builds route summaries and bounds from filtered subset', () => {
    const snapshot = buildTrackingSnapshot(
      baseData,
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    const filtered = filterTrackingSnapshot(snapshot, {
      routeIds: [21],
    })

    expect(filtered.summary.routes).toEqual([
      {
        routeId: 21,
        routeName: 'Ruta Bairoa',
        routeColor: '#E11D48',
        directionStartName: 'Centro',
        directionEndName: 'Bairoa',
        totalVehicles: 2,
        liveVehicles: 0,
        staleVehicles: 1,
        unknownVehicles: 1,
        movingVehicles: 0,
        stoppedVehicles: 1,
        idleVehicles: 1,
        vehicleLabels: ['Trolley Bairoa', 'Trolley Express'],
        nextStops: ['Bairoa'],
        lastReportedAt: '2026-03-15T05:56:30.000Z',
        leadVehicle: {
          assetId: 11,
          label: 'Trolley Bairoa',
          statusLabel: 'stopped',
          freshnessLabel: 'stale',
          freshnessSeconds: 270,
          when: '2026-03-15T05:56:30.000Z',
          nextStopName: 'Bairoa',
          nextStopEtaSeconds: 50,
          previousStopName: 'Terminal Centro',
          message: 'Esperando',
        },
        telemetry: {
          knownVehicleCount: 1,
          unknownVehicleCount: 1,
          newestAgeSeconds: 270,
          oldestAgeSeconds: 270,
          medianAgeSeconds: 270,
          p90AgeSeconds: 270,
        },
        healthLabel: 'delayed',
        coveragePercent: 50,
      },
    ])
    expect(filtered.summary.upcomingStops).toEqual([
      {
        stopKey: 'marker-102',
        routePointId: 912,
        markerId: 102,
        name: 'Bairoa',
        lat: 18.239,
        lng: -66.039,
        arrivalCount: 2,
        liveVehicleCount: 0,
        routeIds: [21],
        routeNames: ['Ruta Bairoa'],
        nextArrivalEtaSeconds: 0,
        vehicles: [
          {
            assetId: 12,
            label: 'Trolley Express',
            routeId: 21,
            routeName: 'Ruta Bairoa',
            routeColor: '#E11D48',
            freshnessLabel: 'unknown',
            nextStopEtaSeconds: 0,
          },
          {
            assetId: 11,
            label: 'Trolley Bairoa',
            routeId: 21,
            routeName: 'Ruta Bairoa',
            routeColor: '#E11D48',
            freshnessLabel: 'stale',
            nextStopEtaSeconds: 50,
          },
        ],
      },
    ])
    expect(filtered.summary.bounds).toEqual({
      minLat: 18.2365,
      maxLat: 18.2365,
      minLng: -66.0368,
      maxLng: -66.0368,
    })
  })
})

describe('filterTrackingSnapshot', () => {
  test('filters by route, status, freshness and limit while preserving total count', () => {
    const snapshot = buildTrackingSnapshot(
      baseData,
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    const filtered = filterTrackingSnapshot(snapshot, {
      routeIds: [21],
      statuses: ['stopped', 'idle'],
      freshness: ['stale', 'unknown'],
      limit: 1,
    })

    expect(filtered.vehicles).toHaveLength(1)
    expect(filtered.vehicles[0]).toMatchObject({
      assetId: 11,
      routeId: 21,
      statusLabel: 'stopped',
      freshnessLabel: 'stale',
    })
    expect(filtered.summary.totalVehicles).toBe(3)
    expect(filtered.summary.filteredVehicles).toBe(1)
    expect(filtered.summary.routeIds).toEqual([21])
  })

  test('filters by asset ids and sorts by freshest vehicle first', () => {
    const snapshot = buildTrackingSnapshot(
      baseData,
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    const filtered = filterTrackingSnapshot(snapshot, {
      assetIds: [12, 10, 11],
    })

    expect(filtered.vehicles.map((vehicle) => vehicle.assetId)).toEqual([
      10, 11, 12,
    ])
  })

  test('exposes route lead vehicle, health label and lastReportedAt even when some vehicles lack valid timestamps', () => {
    const snapshot = buildTrackingSnapshot(
      baseData,
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    const route = snapshot.summary.routes.find((item) => item.routeId === 21)

    expect(route?.lastReportedAt).toBe('2026-03-15T05:56:30.000Z')
    expect(route?.leadVehicle).toMatchObject({
      assetId: 11,
      freshnessLabel: 'stale',
      nextStopName: 'Bairoa',
      nextStopEtaSeconds: 50,
    })
    expect(route?.healthLabel).toBe('delayed')
    expect(route?.coveragePercent).toBe(50)
    expect(snapshot.summary.freshnessBuckets).toEqual({
      live: 1,
      delayed: 1,
      offline: 0,
      unknown: 1,
    })
    expect(snapshot.summary.serviceHealth).toEqual({
      status: 'degraded',
      coveragePercent: 67,
      liveCoveragePercent: 33,
      routeHealth: {
        operational: 1,
        delayed: 1,
        offline: 0,
        'no-signal': 0,
      },
    })
    expect(snapshot.summary.dataQuality).toMatchObject({
      totalVehicles: 3,
      completeVehicleCount: 2,
      qualityPercent: 67,
      missingCoordinateVehicles: 1,
      unknownFreshnessVehicles: 1,
      issues: [
        { id: 'missing-coordinates', count: 1, affectedAssetIds: [12] },
        { id: 'unknown-freshness', count: 1, affectedAssetIds: [12] },
      ],
    })
    expect(snapshot.summary.alerts).toEqual([
      {
        id: 'service-degraded',
        dedupeKey: 'tracking:service:degraded',
        scope: 'service',
        severity: 'warning',
        title: 'Servicio degradado',
        message:
          '67% de cobertura en 3 unidades visibles. 1 ruta retrasada, 0 rutas offline y 0 rutas sin señal.',
        routeId: null,
        routeName: null,
        healthLabel: null,
        coveragePercent: 67,
        liveVehicles: 1,
        totalVehicles: 3,
        lastReportedAt: null,
      },
      {
        id: 'route-21-delayed',
        dedupeKey: 'tracking:route:21:delayed',
        scope: 'route',
        severity: 'warning',
        title: 'Ruta Bairoa con señal retrasada',
        message:
          '50% de cobertura, 0 unidades en vivo de 2 unidades visibles. Último reporte 2026-03-15T05:56:30.000Z.',
        routeId: 21,
        routeName: 'Ruta Bairoa',
        healthLabel: 'delayed',
        coveragePercent: 50,
        liveVehicles: 0,
        totalVehicles: 2,
        lastReportedAt: '2026-03-15T05:56:30.000Z',
      },
    ])
  })

  test('groups upcoming arrivals by stop and orders each stop by ETA', () => {
    const snapshot = buildTrackingSnapshot(
      {
        ...baseData,
        positions: [
          {
            ...baseData.positions[0],
            assetId: 10,
            routePointNextId: 901,
            routePointPrevId: 900,
          },
          {
            ...baseData.positions[1],
            assetId: 11,
            routePointNextId: 911,
            routePointPrevId: 910,
            when: '2026-03-15T05:59:30.000Z',
          },
          {
            ...baseData.positions[2],
            assetId: 12,
            routePointNextId: 911,
            routePointPrevId: 910,
            when: '2026-03-15T05:58:30.000Z',
          },
        ],
      },
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    expect(snapshot.summary.upcomingStops).toEqual([
      {
        stopKey: 'marker-101',
        routePointId: 902,
        markerId: 101,
        name: 'Plaza Palmer',
        lat: 18.235,
        lng: -66.032,
        arrivalCount: 1,
        liveVehicleCount: 1,
        routeIds: [20],
        routeNames: ['Ruta Centro'],
        nextArrivalEtaSeconds: 30,
        vehicles: [
          {
            assetId: 10,
            label: 'Trolley Centro',
            routeId: 20,
            routeName: 'Ruta Centro',
            routeColor: '#0047AB',
            freshnessLabel: 'live',
            nextStopEtaSeconds: 30,
          },
        ],
      },
      {
        stopKey: 'marker-102',
        routePointId: 912,
        markerId: 102,
        name: 'Bairoa',
        lat: 18.239,
        lng: -66.039,
        arrivalCount: 2,
        liveVehicleCount: 1,
        routeIds: [21],
        routeNames: ['Ruta Bairoa'],
        nextArrivalEtaSeconds: 50,
        vehicles: [
          {
            assetId: 11,
            label: 'Trolley Bairoa',
            routeId: 21,
            routeName: 'Ruta Bairoa',
            routeColor: '#E11D48',
            freshnessLabel: 'live',
            nextStopEtaSeconds: 50,
          },
          {
            assetId: 12,
            label: 'Trolley Express',
            routeId: 21,
            routeName: 'Ruta Bairoa',
            routeColor: '#E11D48',
            freshnessLabel: 'stale',
            nextStopEtaSeconds: 50,
          },
        ],
      },
    ])
  })

  test('sorts critical route alerts before warnings and includes offline service alerts', () => {
    const snapshot = buildTrackingSnapshot(
      {
        ...baseData,
        positions: [
          {
            ...baseData.positions[0],
            when: '2026-03-15T05:40:00.000Z',
            routeId: 20,
          },
          {
            ...baseData.positions[1],
            when: '2026-03-15T05:54:00.000Z',
            routeId: 21,
          },
        ],
      },
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    expect(snapshot.summary.alerts).toEqual([
      {
        id: 'service-offline',
        dedupeKey: 'tracking:service:offline',
        scope: 'service',
        severity: 'critical',
        title: 'Servicio sin señal confiable',
        message:
          '100% de cobertura en 2 unidades visibles. 2 rutas offline y 0 rutas sin señal.',
        routeId: null,
        routeName: null,
        healthLabel: null,
        coveragePercent: 100,
        liveVehicles: 0,
        totalVehicles: 2,
        lastReportedAt: null,
      },
      {
        id: 'route-21-offline',
        dedupeKey: 'tracking:route:21:offline',
        scope: 'route',
        severity: 'critical',
        title: 'Ruta Bairoa sin unidades reportando',
        message:
          '100% de cobertura, 0 unidades en vivo de 1 unidad visible. Último reporte 2026-03-15T05:54:00.000Z.',
        routeId: 21,
        routeName: 'Ruta Bairoa',
        healthLabel: 'offline',
        coveragePercent: 100,
        liveVehicles: 0,
        totalVehicles: 1,
        lastReportedAt: '2026-03-15T05:54:00.000Z',
      },
      {
        id: 'route-20-offline',
        dedupeKey: 'tracking:route:20:offline',
        scope: 'route',
        severity: 'critical',
        title: 'Ruta Centro sin unidades reportando',
        message:
          '100% de cobertura, 0 unidades en vivo de 1 unidad visible. Último reporte 2026-03-15T05:40:00.000Z.',
        routeId: 20,
        routeName: 'Ruta Centro',
        healthLabel: 'offline',
        coveragePercent: 100,
        liveVehicles: 0,
        totalVehicles: 1,
        lastReportedAt: '2026-03-15T05:40:00.000Z',
      },
    ])
  })
})

describe('tracking helpers', () => {
  test('marks stale and unknown freshness correctly', () => {
    expect(trackingTestables.getFreshnessLabel(121)).toBe('stale')
    expect(trackingTestables.getFreshnessLabel(null)).toBe('unknown')
    expect(trackingTestables.getFreshnessBucket(240)).toBe('delayed')
    expect(trackingTestables.getFreshnessBucket(301)).toBe('offline')
  })

  test('derives route and service health from freshness buckets', () => {
    expect(
      trackingTestables.getRouteHealthLabel([
        { freshnessSeconds: 30 },
        { freshnessSeconds: 500 },
      ] as any)
    ).toBe('operational')
    expect(
      trackingTestables.getRouteHealthLabel([{ freshnessSeconds: 240 }] as any)
    ).toBe('delayed')
    expect(
      trackingTestables.getRouteHealthLabel([{ freshnessSeconds: 600 }] as any)
    ).toBe('offline')
    expect(
      trackingTestables.getRouteHealthLabel([{ freshnessSeconds: null }] as any)
    ).toBe('no-signal')
    expect(
      trackingTestables.getServiceStatus({
        operational: 2,
        delayed: 0,
        offline: 0,
        'no-signal': 0,
      })
    ).toBe('healthy')
    expect(
      trackingTestables.getServiceStatus({
        operational: 1,
        delayed: 1,
        offline: 0,
        'no-signal': 0,
      })
    ).toBe('degraded')
    expect(
      trackingTestables.getServiceStatus({
        operational: 0,
        delayed: 0,
        offline: 1,
        'no-signal': 1,
      })
    ).toBe('offline')
  })

  test('summarizes telemetry age percentiles for known and unknown vehicle reports', () => {
    expect(
      trackingTestables.buildTelemetryAgeSummary([
        { freshnessSeconds: 60 },
        { freshnessSeconds: 270 },
        { freshnessSeconds: null },
        { freshnessSeconds: 90 },
      ] as any)
    ).toEqual({
      knownVehicleCount: 3,
      unknownVehicleCount: 1,
      newestAgeSeconds: 60,
      oldestAgeSeconds: 270,
      medianAgeSeconds: 90,
      p90AgeSeconds: 270,
    })
  })

  test('summarizes tracking data quality gaps for QA dashboards', () => {
    expect(
      trackingTestables.buildDataQualitySummary([
        {
          assetId: 10,
          routeName: 'Ruta Centro',
          statusLabel: 'moving',
          freshnessSeconds: 60,
          lat: 18.234,
          lng: -66.034,
          nextStop: { name: 'Plaza' },
          previousStop: { name: 'Terminal' },
        },
        {
          assetId: 11,
          routeName: null,
          statusLabel: 'unknown',
          freshnessSeconds: null,
          lat: null,
          lng: null,
          nextStop: null,
          previousStop: null,
        },
      ] as any)
    ).toMatchObject({
      totalVehicles: 2,
      completeVehicleCount: 1,
      qualityPercent: 50,
      missingCoordinateVehicles: 1,
      missingNextStopVehicles: 1,
      missingPreviousStopVehicles: 1,
      missingRouteNameVehicles: 1,
      unknownFreshnessVehicles: 1,
      unknownStatusVehicles: 1,
      issues: [
        { id: 'missing-coordinates', count: 1, affectedAssetIds: [11] },
        { id: 'missing-next-stop', count: 1, affectedAssetIds: [11] },
        { id: 'missing-previous-stop', count: 1, affectedAssetIds: [11] },
        { id: 'missing-route-name', count: 1, affectedAssetIds: [11] },
        { id: 'unknown-freshness', count: 1, affectedAssetIds: [11] },
        { id: 'unknown-status', count: 1, affectedAssetIds: [11] },
      ],
    })
  })

  test('falls back to idle when speed is zero and status is zero', () => {
    expect(trackingTestables.getStatusLabel(0, 0)).toBe('idle')
  })

  test('exposes local eta to the next stop from the current route point', () => {
    const snapshot = buildTrackingSnapshot(
      baseData,
      '2026-03-15T06:00:10.000Z',
      new Date('2026-03-15T06:01:00.000Z')
    )

    expect(
      snapshot.vehicles.map((vehicle) => ({
        assetId: vehicle.assetId,
        nextStopEtaSeconds: vehicle.nextStopEtaSeconds,
      }))
    ).toEqual([
      { assetId: 10, nextStopEtaSeconds: 30 },
      { assetId: 11, nextStopEtaSeconds: 50 },
      { assetId: 12, nextStopEtaSeconds: 0 },
    ])
  })
})
