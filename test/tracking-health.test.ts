import { describe, expect, test } from 'bun:test'

import {
  getTrackingAlertRoutes,
  getTrackingHealthCards,
} from '../app/utils/trackingHealth'

const baseSummary = {
  freshnessBuckets: {
    live: 1,
    delayed: 1,
    offline: 1,
    unknown: 0,
  },
  dataQuality: {
    qualityPercent: 67,
    completeVehicleCount: 2,
    totalVehicles: 3,
    issues: [
      {
        id: 'missing-coordinates',
        severity: 'warning' as const,
        title: 'Unidades sin coordenadas',
        count: 1,
      },
    ],
  },
  serviceHealth: {
    status: 'degraded' as const,
    coveragePercent: 67,
    liveCoveragePercent: 33,
    routeHealth: {
      operational: 1,
      delayed: 1,
      offline: 1,
      'no-signal': 0,
    },
  },
  routes: [
    {
      routeId: 20,
      routeName: 'Ruta Centro',
      healthLabel: 'operational' as const,
      coveragePercent: 100,
      liveVehicles: 1,
      totalVehicles: 1,
    },
    {
      routeId: 21,
      routeName: 'Ruta Bairoa',
      healthLabel: 'delayed' as const,
      coveragePercent: 50,
      liveVehicles: 0,
      totalVehicles: 2,
    },
    {
      routeId: 22,
      routeName: 'Ruta Turabo',
      healthLabel: 'offline' as const,
      coveragePercent: 0,
      liveVehicles: 0,
      totalVehicles: 1,
    },
  ],
}

describe('getTrackingHealthCards', () => {
  test('builds service, coverage and freshness cards from tracking summary metadata', () => {
    expect(getTrackingHealthCards(baseSummary, 3)).toEqual([
      {
        id: 'status',
        label: 'Estado del servicio',
        value: 'Degradado',
        hint: '1 ruta operando · 1 ruta retrasada · 1 ruta offline',
        tone: 'warning',
      },
      {
        id: 'coverage',
        label: 'Cobertura de señal',
        value: '67%',
        hint: '33% de las unidades visibles reportan en vivo ahora mismo.',
        tone: 'warning',
      },
      {
        id: 'freshness',
        label: 'Lecturas recientes',
        value: '1 unidad en vivo',
        hint: '1 unidad retrasada · 1 unidad offline · 0 unidades sin señal',
        tone: 'critical',
      },
      {
        id: 'data-quality',
        label: 'Calidad de datos',
        value: '67%',
        hint: 'Unidades sin coordenadas: 1 unidad afectada.',
        tone: 'warning',
      },
    ])
  })

  test('returns empty-state copy when no vehicles are visible', () => {
    expect(
      getTrackingHealthCards(
        {
          freshnessBuckets: { live: 0, delayed: 0, offline: 0, unknown: 0 },
          serviceHealth: {
            status: 'offline',
            coveragePercent: 0,
            liveCoveragePercent: 0,
            routeHealth: {
              operational: 0,
              delayed: 0,
              offline: 0,
              'no-signal': 0,
            },
          },
          routes: [],
        },
        0
      )[1].hint
    ).toBe('Todavía no hay unidades visibles para calcular cobertura.')
  })
})

describe('getTrackingAlertRoutes', () => {
  test('returns only delayed or offline routes with human-readable hints', () => {
    expect(getTrackingAlertRoutes(baseSummary)).toEqual([
      {
        id: '21-delayed',
        routeId: 21,
        routeName: 'Ruta Bairoa',
        label: 'Retrasada',
        tone: 'warning',
        hint: '50% de cobertura, 0 unidades en vivo de 2 unidades visibles.',
      },
      {
        id: '22-offline',
        routeId: 22,
        routeName: 'Ruta Turabo',
        label: 'Offline',
        tone: 'critical',
        hint: '0% de cobertura, 0 unidades en vivo de 1 unidad visible.',
      },
    ])
  })
})
