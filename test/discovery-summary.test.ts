import { describe, expect, test } from 'bun:test'

import {
  formatDiscoveryDateRange,
  formatDiscoveryTypeBreakdown,
  getDiscoveryAlertCards,
  getDiscoverySummaryCards,
} from '../app/utils/discoverySummary'

describe('formatDiscoveryDateRange', () => {
  test('formats a visible editorial window from API summary dates', () => {
    expect(
      formatDiscoveryDateRange({
        dateRange: {
          start: '2026-04-12T00:00:00.000Z',
          end: '2026-04-14T00:00:00.000Z',
        },
      })
    ).toBe('12 abr al 14 abr')
  })

  test('returns a fallback when no valid range is present', () => {
    expect(
      formatDiscoveryDateRange({ dateRange: { start: null, end: null } })
    ).toBe('Sin agenda fechada visible')
  })
})

describe('formatDiscoveryTypeBreakdown', () => {
  test('turns API summary counts into human-readable copy', () => {
    expect(
      formatDiscoveryTypeBreakdown({
        types: [
          { type: 'evento', count: 2 },
          { type: 'gastronomia', count: 1 },
        ],
      })
    ).toBe('2 eventos · 1 lugar')
  })

  test('returns empty-state copy when there are no visible items', () => {
    expect(formatDiscoveryTypeBreakdown({ types: [] })).toBe(
      'Sin resultados visibles'
    )
  })
})

describe('getDiscoverySummaryCards', () => {
  test('builds three cards directly from visible summary metadata', () => {
    expect(
      getDiscoverySummaryCards(
        {
          types: [
            { type: 'evento', count: 2 },
            { type: 'gastronomia', count: 1 },
          ],
          categories: ['Música', 'Café', 'Brunch'],
          dateRange: {
            start: '2026-04-12T00:00:00.000Z',
            end: '2026-04-14T00:00:00.000Z',
          },
          withImageCount: 2,
          sourceDomains: ['visitacaguas.net'],
        },
        3
      )
    ).toEqual([
      {
        id: 'mix',
        label: 'Mix visible',
        value: '2 eventos · 1 lugar',
        hint: '3 resultados visibles en el feed actual.',
      },
      {
        id: 'agenda',
        label: 'Ventana editorial',
        value: '12 abr al 14 abr',
        hint: 'Categorías activas: Música, Café, Brunch',
      },
      {
        id: 'coverage',
        label: 'Cobertura visual',
        value: '2 tarjetas con imagen',
        hint: 'Fuentes: visitacaguas.net',
      },
    ])
  })

  test('adapts hints for empty subsets', () => {
    expect(
      getDiscoverySummaryCards(
        { types: [], categories: [], withImageCount: 0, sourceDomains: [] },
        0
      )[0].hint
    ).toBe('Ajusta los filtros para volver a poblar el feed.')
  })
})

describe('getDiscoveryAlertCards', () => {
  test('formats discovery alerts into editorial cards for the landing', () => {
    expect(
      getDiscoveryAlertCards({
        alerts: [
          {
            id: 'discovery-day-2026-04-12',
            scope: 'day',
            severity: 'warning',
            title: 'Plan para hoy en Caguas',
            message:
              '2 eventos visibles para 12 abr, con foco en Música y Familia. Súmale 3 paradas para comer del mismo feed.',
            date: '2026-04-12',
            count: 5,
            eventCount: 2,
            foodCount: 3,
            categories: ['Música', 'Familia'],
          },
        ],
      })
    ).toEqual([
      {
        id: 'discovery-day-2026-04-12',
        eyebrow: 'Atención rápida',
        title: 'Plan para hoy en Caguas',
        body: '2 eventos visibles para 12 abr, con foco en Música y Familia. Súmale 3 paradas para comer del mismo feed.',
        meta: '2 eventos · 3 lugares · Música, Familia · 12 abr',
        severity: 'warning',
      },
    ])
  })
})
