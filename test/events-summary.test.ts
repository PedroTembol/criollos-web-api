import { describe, expect, test } from 'bun:test'

import {
  formatEventCategoryCoverage,
  formatEventsDateRange,
  formatUpcomingEventCoverage,
  getEventsAlertCards,
  getEventsSummaryCards,
  getFeaturedEventPlanCards,
} from '../app/utils/eventsSummary'
import {
  getActiveEventFilters,
  getStableEventCategories,
} from '../app/utils/eventsFilters'

describe('formatEventsDateRange', () => {
  test('summarizes the visible date window', () => {
    expect(
      formatEventsDateRange({
        dateRange: {
          start: '2026-04-10T00:00:00.000Z',
          end: '2026-04-18T00:00:00.000Z',
        },
      })
    ).toBe('10 abr al 18 abr')
  })

  test('returns a fallback when no dates are visible', () => {
    expect(
      formatEventsDateRange({ dateRange: { start: null, end: null } })
    ).toBe('Sin agenda fechada visible')
  })
})

describe('event summary formatters', () => {
  test('summarizes upcoming events and category coverage', () => {
    expect(formatUpcomingEventCoverage({ upcomingCount: 2 })).toBe(
      '2 eventos próximos'
    )
    expect(
      formatEventCategoryCoverage({ categories: ['Música', 'Familia', 'Arte'] })
    ).toBe('3 categorías activas')
  })
})

describe('getEventsSummaryCards', () => {
  test('builds editorial cards from visible event summary metadata', () => {
    expect(
      getEventsSummaryCards(
        {
          categories: ['Música', 'Familia', 'Arte'],
          upcomingCount: 2,
          dateRange: {
            start: '2026-04-10T00:00:00.000Z',
            end: '2026-04-18T00:00:00.000Z',
          },
        },
        3
      )
    ).toEqual([
      {
        id: 'agenda',
        label: 'Agenda visible',
        value: '10 abr al 18 abr',
        hint: '3 eventos visibles en este subset.',
      },
      {
        id: 'upcoming',
        label: 'Pulso de agenda',
        value: '2 eventos próximos',
        hint: 'Categorías activas: Música, Familia, Arte',
      },
      {
        id: 'categories',
        label: 'Cobertura temática',
        value: '3 categorías activas',
        hint: 'Agenda repartida entre Música, Familia, Arte.',
      },
    ])
  })
})

describe('getEventsAlertCards', () => {
  test('formats api alerts into editorial cards for the landing', () => {
    expect(
      getEventsAlertCards({
        alerts: [
          {
            id: 'events-day-2026-04-10',
            scope: 'day',
            severity: 'warning',
            title: 'Agenda activa hoy',
            message:
              '1 evento confirmado para 10 abr. Destacan Familia y Música.',
            date: '2026-04-10',
            count: 1,
            categories: ['Familia', 'Música'],
            venue: 'Plaza Palmer',
          },
        ],
      })
    ).toEqual([
      {
        id: 'events-day-2026-04-10',
        eyebrow: 'Atención rápida',
        title: 'Agenda activa hoy',
        body: '1 evento confirmado para 10 abr. Destacan Familia y Música.',
        meta: '1 evento · Familia, Música · Plaza Palmer · 10 abr',
        severity: 'warning',
      },
    ])
  })
})

describe('getFeaturedEventPlanCards', () => {
  test('allows api-provided featured plans to travel in summary metadata', () => {
    const plan = {
      id: 'event-plan-2026-05-10',
      eyebrow: 'Próximo plan sugerido',
      title: '10 may: Noche de bomba en la plaza',
      body: '2 eventos visibles para ese día.',
      meta: 'Plaza Palmer · Música',
      eventIds: ['evento-musica'],
      primaryEventId: 'evento-musica',
      primaryEventTitle: 'Noche de bomba en la plaza',
      primaryEventHref: 'https://visitacaguas.net/evento-musica',
      categoryLabels: ['Música'],
    }

    expect({ featuredPlans: [plan] }.featuredPlans).toEqual([plan])
  })

  test('builds actionable plan cards from upcoming visible events grouped by day', () => {
    expect(
      getFeaturedEventPlanCards(
        [
          {
            id: 'evento-musica',
            title: 'Noche de bomba en la plaza',
            category: 'Música',
            categories: ['Música', 'Familia'],
            description: 'Actividad cultural',
            venue: 'Plaza Palmer',
            sourceUrl: 'https://visitacaguas.net/evento-musica',
            publishedAt: '2026-05-10T00:00:00.000Z',
            rawDate: '10 de mayo de 2026',
          },
          {
            id: 'evento-arte',
            title: 'Taller de arte criollo',
            category: 'Arte',
            categories: ['Arte'],
            description: 'Taller familiar',
            venue: 'Museo de Caguas',
            sourceUrl: 'https://visitacaguas.net/evento-arte',
            publishedAt: '2026-05-10T00:00:00.000Z',
            rawDate: '10 de mayo de 2026',
          },
        ],
        new Date('2026-05-06T12:00:00.000Z')
      )
    ).toEqual([
      {
        id: 'event-plan-2026-05-10',
        eyebrow: 'Próximo plan sugerido',
        title: '10 may: Noche de bomba en la plaza',
        body: '2 eventos visibles para ese día. Enfócate en Arte, Familia y 1 más y verifica detalles antes de salir.',
        meta: 'Plaza Palmer + Museo de Caguas · Arte, Familia y 1 más',
        eventIds: ['evento-musica', 'evento-arte'],
        primaryEventId: 'evento-musica',
        primaryEventTitle: 'Noche de bomba en la plaza',
        primaryEventHref: 'https://visitacaguas.net/evento-musica',
        categoryLabels: ['Arte', 'Familia', 'Música'],
      },
    ])
  })

  test('ignores past or undated events for featured plans', () => {
    expect(
      getFeaturedEventPlanCards(
        [
          {
            id: 'past',
            title: 'Pasado',
            category: 'Arte',
            publishedAt: '2026-05-01T00:00:00.000Z',
          },
          {
            id: 'undated',
            title: 'Sin fecha',
            category: 'Arte',
            publishedAt: null,
          },
        ],
        new Date('2026-05-06T12:00:00.000Z')
      )
    ).toEqual([])
  })
})

describe('event filter helpers', () => {
  test('keeps category options stable and sorted', () => {
    expect(
      getStableEventCategories(['Música', 'Arte', ' Música ', 'Familia'])
    ).toEqual(['Arte', 'Familia', 'Música'])
  })

  test('exposes active filters for removable chips', () => {
    expect(
      getActiveEventFilters({
        selectedCategory: 'Música',
        searchQuery: 'plaza',
        from: '2026-04-10',
        to: '2026-04-18',
      })
    ).toEqual([
      { key: 'category', label: 'Categoría', value: 'Música' },
      { key: 'q', label: 'Búsqueda', value: 'plaza' },
      { key: 'from', label: 'Desde', value: '2026-04-10' },
      { key: 'to', label: 'Hasta', value: '2026-04-18' },
    ])
  })
})
