import { describe, expect, test } from 'bun:test'

import { filterEventosFeed } from '../server/utils/eventos'
import type { Evento } from '../server/utils/scraper'

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

describe('filterEventosFeed', () => {
  const feed = [
    baseEvent({
      id: 'bomba',
      title: 'Noche de Bomba',
      category: 'Música',
      categories: ['Música', 'Familia'],
      venue: 'Plaza Palmer',
      publishedAt: '2026-04-10T00:00:00.000Z',
      rawDate: '10 de abril de 2026',
    }),
    baseEvent({
      id: 'cine',
      title: 'Cine al Aire Libre',
      category: 'Cine',
      categories: ['Cine'],
      venue: 'Jardín Botánico',
      publishedAt: '2026-04-12T00:00:00.000Z',
      rawDate: '12 de abril de 2026',
    }),
    baseEvent({
      id: 'expo',
      title: 'Expo Artesanal',
      category: 'Artesanía',
      categories: ['Artesanía'],
      venue: 'Paseo Gautier Benítez',
      publishedAt: '2026-04-18T00:00:00.000Z',
      rawDate: '18 de abril de 2026',
    }),
  ]

  test('filters by category, free-text query, and limit', () => {
    const filtered = filterEventosFeed(
      feed,
      {
        categories: ['música', 'cine'],
        query: 'plaza',
        limit: 5,
      },
      new Date('2026-04-09T12:00:00.000Z')
    )

    expect(filtered.count).toBe(1)
    expect(filtered.data.map((event) => event.id)).toEqual(['bomba'])
    expect(filtered.summary.categories).toEqual(['Familia', 'Música'])
  })

  test('filters by inclusive date range and exposes date metadata', () => {
    const filtered = filterEventosFeed(
      feed,
      {
        from: '2026-04-12',
        to: '2026-04-18',
      },
      new Date('2026-04-09T12:00:00.000Z')
    )

    expect(filtered.data.map((event) => event.id)).toEqual(['cine', 'expo'])
    expect(filtered.summary.dateRange).toEqual({
      start: '2026-04-12T00:00:00.000Z',
      end: '2026-04-18T00:00:00.000Z',
    })
  })

  test('caps limit and counts upcoming entries from the visible subset', () => {
    const filtered = filterEventosFeed(
      feed,
      { limit: 1 },
      new Date('2026-04-10T12:00:00.000Z')
    )

    expect(filtered.count).toBe(1)
    expect(filtered.data.map((event) => event.id)).toEqual(['bomba'])
    expect(filtered.summary.upcomingCount).toBe(1)
    expect(filtered.summary.featuredPlans).toEqual([
      {
        id: 'event-plan-2026-04-10',
        eyebrow: 'Próximo plan sugerido',
        title: '10 abr: Noche de Bomba',
        body: '1 evento visible para ese día. Enfócate en Familia y Música y verifica detalles antes de salir.',
        meta: 'Plaza Palmer · Familia y Música',
        eventIds: ['bomba'],
        primaryEventId: 'bomba',
        primaryEventTitle: 'Noche de Bomba',
        primaryEventHref: 'https://visitacaguas.net/eventos',
        categoryLabels: ['Familia', 'Música'],
      },
    ])
  })

  test('builds editorial alerts for the next visible day and the weekend pulse', () => {
    const filtered = filterEventosFeed(
      [
        baseEvent({
          id: 'hoy',
          title: 'Serenata en la plaza',
          category: 'Música',
          categories: ['Música', 'Familia'],
          venue: 'Plaza Palmer',
          publishedAt: '2026-04-10T00:00:00.000Z',
        }),
        baseEvent({
          id: 'sabado-1',
          title: 'Mercado cultural',
          category: 'Artesanía',
          categories: ['Artesanía'],
          venue: 'Paseo Gautier Benítez',
          publishedAt: '2026-04-11T00:00:00.000Z',
        }),
        baseEvent({
          id: 'sabado-2',
          title: 'Taller familiar',
          category: 'Familia',
          categories: ['Familia'],
          venue: 'Casa del Trovador',
          publishedAt: '2026-04-11T00:00:00.000Z',
        }),
        baseEvent({
          id: 'sabado-3',
          title: 'Bomba nocturna',
          category: 'Música',
          categories: ['Música'],
          venue: 'Plaza Palmer',
          publishedAt: '2026-04-11T00:00:00.000Z',
        }),
      ],
      {},
      new Date('2026-04-10T05:00:00.000Z')
    )

    expect(filtered.summary.featuredPlans.map((plan) => plan.id)).toEqual([
      'event-plan-2026-04-10',
      'event-plan-2026-04-11',
    ])

    expect(filtered.summary.alerts).toEqual([
      {
        id: 'events-day-2026-04-10',
        dedupeKey: 'eventos:day:2026-04-10',
        scope: 'day',
        severity: 'warning',
        title: 'Agenda activa hoy',
        message: '1 evento confirmado para 10 abr. Destacan Familia y Música.',
        date: '2026-04-10',
        count: 1,
        categories: ['Familia', 'Música'],
        venue: 'Plaza Palmer',
      },
      {
        id: 'events-weekend-2026-04-11',
        dedupeKey: 'eventos:weekend:2026-04-11',
        scope: 'weekend',
        severity: 'warning',
        title: 'Fin de semana activo',
        message:
          '3 eventos listos para el weekend el 11 abr, con foco en Artesanía, Familia y 1 más.',
        date: '2026-04-11',
        count: 3,
        categories: ['Artesanía', 'Familia', 'Música'],
        venue: 'Paseo Gautier Benítez',
      },
    ])
  })
})
