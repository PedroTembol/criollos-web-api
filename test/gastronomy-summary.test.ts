import { describe, expect, test } from 'bun:test'

import {
  formatGastronomyCategoryCoverage,
  formatGastronomySourceCoverage,
  getGastronomyAlertCards,
  getGastronomyCategorySpotlightCards,
  getGastronomyFeaturedPlaceCards,
  getGastronomySuggestedRouteCards,
  getGastronomySummaryCards,
} from '../app/utils/gastronomySummary'
import {
  getActiveGastronomyFilters,
  getStableGastronomyCategories,
} from '../app/utils/gastronomyFilters'

describe('formatGastronomyCategoryCoverage', () => {
  test('turns visible categories into human-readable coverage', () => {
    expect(
      formatGastronomyCategoryCoverage({
        categories: ['Brunch', 'Criolla', 'Café'],
      })
    ).toBe('3 categorías activas')
  })

  test('returns a fallback when there are no visible categories', () => {
    expect(formatGastronomyCategoryCoverage({ categories: [] })).toBe(
      'Sin categorías visibles'
    )
  })
})

describe('formatGastronomySourceCoverage', () => {
  test('summarizes visible source domains', () => {
    expect(
      formatGastronomySourceCoverage({
        sourceDomains: ['visitacaguas.net', 'turismo.pr.gov'],
      })
    ).toBe('2 fuentes visibles')
  })
})

describe('getGastronomySummaryCards', () => {
  test('builds editorial cards directly from visible gastronomy summary metadata', () => {
    expect(
      getGastronomySummaryCards(
        {
          categories: ['Brunch', 'Criolla', 'Café'],
          withImageCount: 2,
          sourceDomains: ['visitacaguas.net'],
        },
        3
      )
    ).toEqual([
      {
        id: 'mix',
        label: 'Sabores visibles',
        value: '3 categorías activas',
        hint: 'Categorías activas: Brunch, Criolla, Café',
      },
      {
        id: 'coverage',
        label: 'Cobertura visual',
        value: '2 tarjetas con imagen',
        hint: '3 lugares visibles en este subset.',
      },
      {
        id: 'sources',
        label: 'Fuentes',
        value: '1 fuente visible',
        hint: 'Dominios: visitacaguas.net',
      },
    ])
  })
})

describe('getGastronomyFeaturedPlaceCards', () => {
  test('formats api featured places into decisive landing cards', () => {
    expect(
      getGastronomyFeaturedPlaceCards({
        featuredPlaces: [
          {
            id: 'gastronomia-featured-cafe',
            title: 'Cafe del Turabo',
            category: 'Cafetería',
            categories: ['Cafetería', 'Brunch'],
            summary: 'Cafe local en el casco urbano.',
            imageUrl: 'https://visitacaguas.net/storage/cafe.jpg',
            sourceUrl: 'https://visitacaguas.net/donde-comer/cafe-del-turabo',
            reason:
              'tiene foto para decidir rápido · incluye enlace a detalles · cubre Cafetería y Brunch',
            actionLabel: 'Ver detalles',
            actionHref: 'https://visitacaguas.net/donde-comer/cafe-del-turabo',
          },
        ],
      })
    ).toEqual([
      {
        id: 'gastronomia-featured-cafe',
        title: 'Cafe del Turabo',
        category: 'Cafetería',
        body: 'Cafe local en el casco urbano.',
        meta: 'Cafetería · Cafetería, Brunch · foto visible',
        imageUrl: 'https://visitacaguas.net/storage/cafe.jpg',
        actionLabel: 'Ver detalles',
        actionHref: 'https://visitacaguas.net/donde-comer/cafe-del-turabo',
        external: true,
      },
    ])
  })
})

describe('getGastronomyCategorySpotlightCards', () => {
  test('formats api category spotlights into accessible landing cards', () => {
    expect(
      getGastronomyCategorySpotlightCards({
        categorySpotlights: [
          {
            id: 'gastronomia-spotlight-brunch',
            category: 'Brunch',
            title: 'Foco Brunch',
            description:
              '2 lugares visibles en Brunch; 1 foto visible. Lugar líder: Cafe del Turabo.',
            count: 2,
            withImageCount: 1,
            leadingPlaceId: 'cafe',
            leadingPlaceTitle: 'Cafe del Turabo',
            leadingPlaceSummary: 'Cafe local en el casco urbano.',
            leadingPlaceImageUrl: 'https://visitacaguas.net/storage/cafe.jpg',
            categories: ['Brunch', 'Cafetería'],
            actionLabel: 'Ver Brunch',
            actionHref: '/gastronomia?category=Brunch',
          },
        ],
      })
    ).toEqual([
      {
        id: 'gastronomia-spotlight-brunch',
        title: 'Foco Brunch',
        category: 'Brunch',
        body: '2 lugares visibles en Brunch; 1 foto visible. Lugar líder: Cafe del Turabo. Cafe del Turabo: Cafe local en el casco urbano.',
        meta: '2 lugares visibles · 1 foto visible · Brunch, Cafetería',
        imageUrl: 'https://visitacaguas.net/storage/cafe.jpg',
        actionLabel: 'Ver Brunch',
        actionHref: '/gastronomia?category=Brunch',
      },
    ])
  })
})

describe('getGastronomySuggestedRouteCards', () => {
  test('formats api suggested routes into actionable landing cards', () => {
    expect(
      getGastronomySuggestedRouteCards({
        suggestedRoutes: [
          {
            id: 'gastronomia-route-cafe-brunch',
            title: 'Ruta de café y brunch',
            description: 'Empieza suave por cafés y brunch visibles.',
            categories: ['Brunch', 'Cafetería'],
            placeIds: ['cafe', 'bakery'],
            placeTitles: ['Cafe del Turabo', 'Bakery Plaza'],
            count: 2,
            withImageCount: 1,
            actionLabel: 'Filtrar café y brunch',
            actionHref: '/gastronomia?category=Brunch%2CCafeter%C3%ADa',
          },
        ],
      })
    ).toEqual([
      {
        id: 'gastronomia-route-cafe-brunch',
        title: 'Ruta de café y brunch',
        body: 'Empieza suave por cafés y brunch visibles. Incluye: Cafe del Turabo, Bakery Plaza.',
        meta: '2 lugares · Brunch, Cafetería · 1 foto visible',
        actionLabel: 'Filtrar café y brunch',
        actionHref: '/gastronomia?category=Brunch%2CCafeter%C3%ADa',
      },
    ])
  })
})

describe('getGastronomyAlertCards', () => {
  test('formats api alerts into editorial cards for the landing', () => {
    expect(
      getGastronomyAlertCards({
        alerts: [
          {
            id: 'gastronomia-category-brunch',
            scope: 'category',
            severity: 'warning',
            title: 'Ruta de café y brunch visible',
            message:
              '3 lugares visibles con foco en Brunch, Cafetería y 1 más dentro del subset actual.',
            count: 4,
            categories: ['Brunch', 'Cafetería', 'Postres'],
            withImageCount: 2,
          },
        ],
      })
    ).toEqual([
      {
        id: 'gastronomia-category-brunch',
        eyebrow: 'Atención rápida',
        title: 'Ruta de café y brunch visible',
        body: '3 lugares visibles con foco en Brunch, Cafetería y 1 más dentro del subset actual.',
        meta: '4 lugares · Brunch, Cafetería, Postres · 2 fotos visibles',
        severity: 'warning',
      },
    ])
  })
})

describe('gastronomy filter helpers', () => {
  test('keeps category options stable and sorted', () => {
    expect(
      getStableGastronomyCategories(['Criolla', 'Brunch', 'Criolla', ' Café '])
    ).toEqual(['Brunch', 'Café', 'Criolla'])
  })

  test('exposes active filters for removable chips', () => {
    expect(
      getActiveGastronomyFilters({
        selectedCategories: ['Criolla'],
        searchQuery: 'lechón',
      })
    ).toEqual([
      { key: 'category:Criolla', label: 'Categoría', value: 'Criolla' },
      { key: 'q', label: 'Búsqueda', value: 'lechón' },
    ])
  })
})
