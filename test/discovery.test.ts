import { describe, expect, test } from 'bun:test'

import {
  buildDiscoveryFeed,
  filterDiscoveryFeed,
  pickFeaturedPlaces,
  sortUpcomingEvents,
} from '../server/utils/discovery'
import type { Evento, GastronomiaPlace } from '../server/utils/scraper'

const baseEvent = (overrides: Partial<Evento>): Evento => ({
  id: overrides.id ?? 'evento',
  title: overrides.title ?? 'Evento',
  category: overrides.category ?? 'General',
  categories: overrides.categories ?? [overrides.category ?? 'General'],
  summary: overrides.summary ?? 'Resumen',
  description: overrides.description ?? 'Descripcion',
  venue: overrides.venue ?? null,
  imageUrl: overrides.imageUrl ?? null,
  sourceUrl: overrides.sourceUrl ?? 'https://visitacaguas.net/eventos',
  publishedAt: overrides.publishedAt ?? null,
  rawDate: overrides.rawDate ?? null,
})

const basePlace = (overrides: Partial<GastronomiaPlace>): GastronomiaPlace => ({
  id: overrides.id ?? 'place',
  title: overrides.title ?? 'Lugar',
  category: overrides.category ?? 'General',
  categories: overrides.categories ?? [overrides.category ?? 'General'],
  summary: overrides.summary ?? 'Resumen',
  description: overrides.description ?? 'Descripcion',
  imageUrl: overrides.imageUrl ?? null,
  sourceUrl: overrides.sourceUrl ?? null,
})

describe('sortUpcomingEvents', () => {
  test('orders dated events first, then undated alphabetically', () => {
    const events = sortUpcomingEvents([
      baseEvent({ id: '3', title: 'Zeta', publishedAt: null }),
      baseEvent({
        id: '2',
        title: 'Bomba',
        publishedAt: '2026-03-22T00:00:00.000Z',
      }),
      baseEvent({
        id: '1',
        title: 'Artesania',
        publishedAt: '2026-03-20T00:00:00.000Z',
      }),
      baseEvent({ id: '4', title: 'Cine', publishedAt: null }),
    ])

    expect(events.map((event) => event.id)).toEqual(['1', '2', '4', '3'])
  })
})

describe('pickFeaturedPlaces', () => {
  test('prioritizes category diversity before filling leftovers', () => {
    const places = pickFeaturedPlaces(
      [
        basePlace({ id: '1', title: 'Cafe Uno', category: 'Cafe' }),
        basePlace({ id: '2', title: 'Cafe Dos', category: 'Cafe' }),
        basePlace({ id: '3', title: 'Pizza', category: 'Pizzeria' }),
        basePlace({ id: '4', title: 'Brunch', category: 'Brunch' }),
      ],
      3
    )

    expect(places.map((place) => place.id)).toEqual(['1', '3', '4'])
  })
})

describe('buildDiscoveryFeed', () => {
  test('keeps upcoming events and excludes stale dated entries', () => {
    const now = new Date('2026-03-19T06:00:00.000Z')
    const feed = buildDiscoveryFeed(
      [
        baseEvent({
          id: 'old',
          title: 'Ayer',
          publishedAt: '2026-03-17T00:00:00.000Z',
        }),
        baseEvent({
          id: 'today',
          title: 'Hoy',
          publishedAt: '2026-03-19T12:00:00.000Z',
          imageUrl: 'https://img.test/today.jpg',
        }),
        baseEvent({
          id: 'future',
          title: 'Mañana',
          publishedAt: '2026-03-20T00:00:00.000Z',
        }),
        baseEvent({ id: 'undated', title: 'Sin fecha', publishedAt: null }),
      ],
      [
        basePlace({
          id: 'cafe',
          title: 'Cafe del Turabo',
          category: 'Cafe',
          imageUrl: 'https://img.test/cafe.jpg',
          sourceUrl: 'https://visitacaguas.net/cafe',
        }),
        basePlace({
          id: 'pizza',
          title: 'La Pizza Criolla',
          category: 'Pizzeria',
          sourceUrl: 'https://visitacaguas.net/pizza',
        }),
      ],
      now
    )

    expect(feed.generatedAt).toBe('2026-03-19T06:00:00.000Z')
    expect(feed.data.map((item) => item.id)).toEqual([
      'evt-today',
      'gst-cafe',
      'evt-future',
      'gst-pizza',
      'evt-undated',
    ])
    expect(feed.summary.types).toEqual([
      { type: 'evento', count: 3 },
      { type: 'gastronomia', count: 2 },
    ])
    expect(feed.summary.categories).toEqual(['Cafe', 'General', 'Pizzeria'])
    expect(feed.summary.withImageCount).toBe(2)
    expect(feed.summary.sourceDomains).toEqual(['visitacaguas.net'])
    expect(feed.summary.dateRange).toEqual({
      start: '2026-03-19T12:00:00.000Z',
      end: '2026-03-20T00:00:00.000Z',
    })
    expect(feed.summary.alerts).toEqual([
      {
        id: 'discovery-day-2026-03-19',
        dedupeKey: 'discovery:day:2026-03-19',
        scope: 'day',
        severity: 'warning',
        title: 'Plan para hoy en Caguas',
        message:
          '1 evento visible para 19 mar, con foco en General. Súmale 2 paradas para comer del mismo feed.',
        date: '2026-03-19',
        count: 3,
        eventCount: 1,
        foodCount: 2,
        categories: ['General'],
      },
      {
        id: 'discovery-mix-visible',
        dedupeKey: 'discovery:mix:3:2:general|cafe|pizzeria',
        scope: 'mix',
        severity: 'warning',
        title: 'Plan redondo visible',
        message:
          '3 eventos y 2 lugares para comer en el mismo subset. Buen punto de partida para armar una salida con General, Cafe y 1 más.',
        date: null,
        count: 5,
        eventCount: 3,
        foodCount: 2,
        categories: ['General', 'Cafe', 'Pizzeria'],
      },
    ])
  })
})

describe('filterDiscoveryFeed', () => {
  const feed = buildDiscoveryFeed(
    [
      baseEvent({
        id: 'bomba',
        title: 'Noche de Bomba',
        category: 'Música',
        venue: 'Plaza Palmer',
        publishedAt: '2026-03-19T12:00:00.000Z',
      }),
      baseEvent({
        id: 'cine',
        title: 'Cine al Aire Libre',
        category: 'Cine',
        venue: 'Jardín Botánico',
        publishedAt: '2026-03-20T00:00:00.000Z',
        imageUrl: 'https://img.test/cine.jpg',
      }),
    ],
    [
      basePlace({
        id: 'cafe',
        title: 'Cafe del Turabo',
        category: 'Cafe',
        summary: 'Cafe local en el casco urbano.',
        sourceUrl: 'https://visitacaguas.net/cafe',
      }),
      basePlace({
        id: 'pizza',
        title: 'La Pizza Criolla',
        category: 'Pizzeria',
        summary: 'Pizza artesanal.',
        sourceUrl: 'https://visitacaguas.net/pizza',
      }),
    ],
    new Date('2026-03-19T06:00:00.000Z')
  )

  test('filters by type and limit', () => {
    const filtered = filterDiscoveryFeed(feed, {
      types: ['gastronomia'],
      limit: 1,
    })

    expect(filtered.count).toBe(1)
    expect(filtered.data.map((item) => item.id)).toEqual(['gst-cafe'])
    expect(filtered.summary.types).toEqual([{ type: 'gastronomia', count: 1 }])
    expect(filtered.summary.categories).toEqual(['Cafe'])
    expect(filtered.summary.alerts).toEqual([
      {
        id: 'discovery-food-visible',
        dedupeKey: 'discovery:food:1:cafe',
        scope: 'food',
        severity: 'info',
        title: 'Ruta gastronómica visible',
        message:
          '1 parada para comer activa en este momento, con foco en Cafe.',
        date: null,
        count: 1,
        eventCount: 0,
        foodCount: 1,
        categories: ['Cafe'],
      },
    ])
  })

  test('filters by free-text query across discovery fields', () => {
    const filtered = filterDiscoveryFeed(feed, { query: 'jardín' })

    expect(filtered.data.map((item) => item.id)).toEqual(['evt-cine'])
    expect(filtered.summary.dateRange).toEqual({
      start: '2026-03-20T00:00:00.000Z',
      end: '2026-03-20T00:00:00.000Z',
    })
  })

  test('filters by category using normalized matching and rebuilds visible summary', () => {
    const filtered = filterDiscoveryFeed(feed, {
      categories: ['música', 'cafe'],
    })

    expect(filtered.data.map((item) => item.id)).toEqual([
      'evt-bomba',
      'gst-cafe',
    ])
    expect(filtered.summary.types).toEqual([
      { type: 'evento', count: 1 },
      { type: 'gastronomia', count: 1 },
    ])
    expect(filtered.summary.withImageCount).toBe(0)
    expect(filtered.summary.sourceDomains).toEqual(['visitacaguas.net'])
    expect(filtered.summary.alerts).toEqual([
      {
        id: 'discovery-day-2026-03-19',
        dedupeKey: 'discovery:day:2026-03-19',
        scope: 'day',
        severity: 'warning',
        title: 'Plan para hoy en Caguas',
        message:
          '1 evento visible para 19 mar, con foco en Música y Plaza Palmer. Súmale 1 parada para comer del mismo feed.',
        date: '2026-03-19',
        count: 2,
        eventCount: 1,
        foodCount: 1,
        categories: ['Música', 'Plaza Palmer'],
      },
      {
        id: 'discovery-mix-visible',
        dedupeKey: 'discovery:mix:1:1:música|cafe',
        scope: 'mix',
        severity: 'info',
        title: 'Plan redondo visible',
        message:
          '1 evento y 1 lugar para comer en el mismo subset. Buen punto de partida para armar una salida con Música y Cafe.',
        date: null,
        count: 2,
        eventCount: 1,
        foodCount: 1,
        categories: ['Música', 'Cafe'],
      },
    ])
  })

  test('filters events by inclusive date window while keeping evergreen places visible', () => {
    const filtered = filterDiscoveryFeed(feed, {
      from: '2026-03-20',
      to: '2026-03-20',
    })

    expect(filtered.data.map((item) => item.id)).toEqual([
      'gst-cafe',
      'evt-cine',
      'gst-pizza',
    ])
    expect(filtered.summary.types).toEqual([
      { type: 'evento', count: 1 },
      { type: 'gastronomia', count: 2 },
    ])
    expect(filtered.summary.dateRange).toEqual({
      start: '2026-03-20T00:00:00.000Z',
      end: '2026-03-20T00:00:00.000Z',
    })
  })
})
