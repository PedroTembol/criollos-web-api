import { describe, expect, test } from 'bun:test'

import { buildDiscoveryFeed } from '../server/utils/discovery'
import { buildCriolloRecommendations } from '../server/utils/recommendations'
import { buildTrackingSnapshot } from '../server/utils/tracking'
import type { BootstrapData } from '../server/utils/normalize'
import type { Evento, GastronomiaPlace } from '../server/utils/scraper'

const baseData: BootstrapData = {
  assets: [
    { id: 10, groupId: 1, description: 'Trolley Centro' },
    { id: 11, groupId: 1, description: 'Trolley Bairoa' },
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
      when: '2026-03-19T05:59:30.000Z',
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
      when: '2026-03-19T05:50:00.000Z',
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
  ],
}

const baseEvent = (overrides: Partial<Evento>): Evento => ({
  id: overrides.id ?? 'evento',
  title: overrides.title ?? 'Festival Criollo',
  category: overrides.category ?? 'Música',
  categories: overrides.categories ?? [overrides.category ?? 'Música'],
  summary: overrides.summary ?? 'Música en la Plaza Palmer.',
  description: overrides.description ?? 'Actividad cultural en Caguas.',
  venue: overrides.venue ?? 'Plaza Palmer',
  imageUrl: overrides.imageUrl ?? null,
  sourceUrl: overrides.sourceUrl ?? 'https://visitacaguas.net/eventos/festival',
  publishedAt: overrides.publishedAt ?? '2026-03-19T12:00:00.000Z',
  rawDate: overrides.rawDate ?? '19 de marzo de 2026',
})

const basePlace = (overrides: Partial<GastronomiaPlace>): GastronomiaPlace => ({
  id: overrides.id ?? 'cafe',
  title: overrides.title ?? 'Café del Turabo',
  category: overrides.category ?? 'Cafetería',
  categories: overrides.categories ?? [overrides.category ?? 'Cafetería'],
  summary: overrides.summary ?? 'Café local cerca del casco urbano.',
  description: overrides.description ?? 'Parada gastronómica criolla.',
  imageUrl: overrides.imageUrl ?? null,
  sourceUrl: overrides.sourceUrl ?? 'https://visitacaguas.net/donde-comer/cafe',
})

describe('buildCriolloRecommendations', () => {
  test('combines tracking, discovery and food signals into prioritized cards', () => {
    const tracking = buildTrackingSnapshot(
      baseData,
      '2026-03-19T06:00:00.000Z',
      new Date('2026-03-19T06:00:00.000Z')
    )
    const discovery = buildDiscoveryFeed(
      [baseEvent({ id: 'festival' })],
      [
        basePlace({ id: 'cafe' }),
        basePlace({
          id: 'brunch',
          title: 'Brunch Criollo',
          category: 'Brunch',
        }),
      ],
      new Date('2026-03-19T06:00:00.000Z')
    )

    const feed = buildCriolloRecommendations({
      tracking,
      discovery,
      now: new Date('2026-03-19T06:00:00.000Z'),
    })

    expect(feed.generatedAt).toBe('2026-03-19T06:00:00.000Z')
    expect(feed.count).toBe(5)
    expect(feed.summary.byType).toEqual([
      { type: 'service', count: 1 },
      { type: 'mobility', count: 1 },
      { type: 'plan', count: 2 },
      { type: 'food', count: 1 },
    ])
    expect(feed.summary.priorities).toEqual({ high: 2, medium: 2, low: 1 })
    expect(feed.summary.nextBestAction).toMatchObject({
      id: 'rec-stop-marker-101',
      type: 'mobility',
      title: 'Próximo trolley hacia Plaza Palmer',
      actionHref: '/#trolley-board',
    })
    expect(feed.data.map((item) => item.type)).toEqual([
      'mobility',
      'plan',
      'service',
      'plan',
      'food',
    ])
    expect(feed.data[0]).toMatchObject({
      id: 'rec-stop-marker-101',
      title: 'Próximo trolley hacia Plaza Palmer',
      priority: 'high',
    })
    expect(feed.data[1]).toMatchObject({
      id: 'rec-discovery-day-2026-03-19',
      actionHref: '/discovery',
    })
    expect(feed.data[2]).toMatchObject({
      id: 'rec-service-degraded',
      priority: 'medium',
      actionHref: '/#trolley-board',
    })
  })

  test('supports type filters and limit for UI surfaces', () => {
    const tracking = buildTrackingSnapshot(
      baseData,
      '2026-03-19T06:00:00.000Z',
      new Date('2026-03-19T06:00:00.000Z')
    )
    const discovery = buildDiscoveryFeed(
      [],
      [basePlace({ id: 'cafe' })],
      new Date('2026-03-19T06:00:00.000Z')
    )

    const feed = buildCriolloRecommendations(
      { tracking, discovery, now: new Date('2026-03-19T06:00:00.000Z') },
      { types: ['food'], limit: 1 }
    )

    expect(feed.count).toBe(1)
    expect(feed.data[0]).toMatchObject({
      type: 'food',
      actionHref: '/gastronomia',
    })
    expect(feed.summary.byType).toEqual([{ type: 'food', count: 1 }])
    expect(feed.summary.nextBestAction).toMatchObject({
      type: 'food',
      actionLabel: 'Explorar gastronomía',
      actionHref: '/gastronomia',
    })
  })

  test('returns a null nextBestAction when no recommendations match filters', () => {
    const feed = buildCriolloRecommendations(
      {
        tracking: null,
        discovery: null,
        now: new Date('2026-03-19T06:00:00.000Z'),
      },
      { types: ['plan'] }
    )

    expect(feed.count).toBe(0)
    expect(feed.summary.nextBestAction).toBeNull()
    expect(feed.summary.priorities).toEqual({ high: 0, medium: 0, low: 0 })
  })
})
