import { describe, expect, test } from 'bun:test'

import { buildNotificationsFeed } from '../server/utils/notifications'

describe('buildNotificationsFeed', () => {
  const inputs = {
    generatedAt: '2026-06-06T14:00:00.000Z',
    tracking: [
      {
        id: 'route-21-offline',
        dedupeKey: 'tracking:route:21:offline',
        scope: 'route' as const,
        severity: 'critical' as const,
        title: 'Ruta Bairoa sin señal',
        message: 'La ruta no tiene unidades reportando.',
        routeId: 21,
        routeName: 'Ruta Bairoa',
        healthLabel: 'offline' as const,
        coveragePercent: 0,
        liveVehicles: 0,
        totalVehicles: 2,
        lastReportedAt: null,
      },
    ],
    eventos: [
      {
        id: 'eventos-day-2026-06-07',
        dedupeKey: 'eventos:day:2026-06-07',
        scope: 'day' as const,
        severity: 'warning' as const,
        title: 'Agenda activa mañana',
        message: 'Hay tres eventos disponibles.',
        date: '2026-06-07',
        count: 3,
        categories: ['Música'],
        venue: 'Plaza Palmer',
      },
    ],
    discovery: [
      {
        id: 'discovery-food',
        dedupeKey: 'discovery:food:2:cafe',
        scope: 'food' as const,
        severity: 'info' as const,
        title: 'Dos sabores para descubrir',
        message: 'Explora dos cafés locales.',
        date: null,
        count: 2,
        eventCount: 0,
        foodCount: 2,
        categories: ['Café'],
      },
    ],
    gastronomia: [
      {
        id: 'gastronomia-category-cafe',
        dedupeKey: 'gastronomia:category:cafe',
        scope: 'category' as const,
        severity: 'info' as const,
        title: 'Ruta del café',
        message: 'Hay opciones de café para explorar.',
        count: 2,
        categories: ['Café'],
        withImageCount: 2,
      },
    ],
  }

  test('normalizes, prioritizes and summarizes notification-ready alerts', () => {
    const feed = buildNotificationsFeed(inputs)

    expect(feed.generatedAt).toBe('2026-06-06T14:00:00.000Z')
    expect(feed.cursor).toMatch(/^notifications-[a-f0-9]{8}$/)
    expect(feed.count).toBe(4)
    expect(feed.unreadCount).toBe(4)
    expect(feed.data.map((item) => item.severity)).toEqual([
      'critical',
      'warning',
      'info',
      'info',
    ])
    expect(feed.data[0]).toMatchObject({
      source: 'tracking',
      actionHref: '/?routeId=21#trolley-board',
      tags: ['trolley', 'Ruta Bairoa', 'offline'],
    })
    expect(feed.data[1]).toMatchObject({
      source: 'eventos',
      scheduledFor: '2026-06-07',
      actionHref: '/eventos?from=2026-06-07&to=2026-06-07',
    })
    expect(feed.summary).toEqual({
      bySource: [
        { source: 'tracking', count: 1 },
        { source: 'eventos', count: 1 },
        { source: 'discovery', count: 1 },
        { source: 'gastronomia', count: 1 },
      ],
      bySeverity: { info: 2, warning: 1, critical: 1 },
    })
  })

  test('filters sources and omits dedupe keys already seen by the consumer', () => {
    const feed = buildNotificationsFeed(inputs, {
      sources: ['tracking', 'eventos'],
      seen: ['tracking:route:21:offline'],
      limit: 1,
    })

    expect(feed.count).toBe(1)
    expect(feed.unreadCount).toBe(1)
    expect(feed.data[0].source).toBe('eventos')
    expect(feed.summary.bySource).toEqual([{ source: 'eventos', count: 1 }])
  })

  test('deduplicates repeated source alerts by dedupeKey', () => {
    const feed = buildNotificationsFeed({
      ...inputs,
      discovery: [
        {
          ...inputs.discovery[0],
          dedupeKey: 'gastronomia:category:cafe',
        },
      ],
    })

    expect(feed.unreadCount).toBe(3)
  })
})
