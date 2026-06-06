import { describe, expect, test } from 'bun:test'

import { filterGastronomiaFeed } from '../server/utils/gastronomia'
import type { GastronomiaPlace } from '../server/utils/scraper'

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

describe('filterGastronomiaFeed', () => {
  const feed = [
    basePlace({
      id: 'cafe',
      title: 'Cafe del Turabo',
      category: 'Cafetería',
      categories: ['Cafetería', 'Brunch'],
      summary: 'Cafe local en el casco urbano.',
      imageUrl: 'https://visitacaguas.net/storage/cafe.jpg',
      sourceUrl: 'https://visitacaguas.net/donde-comer/cafe-del-turabo',
    }),
    basePlace({
      id: 'pizza',
      title: 'La Pizza Criolla',
      category: 'Pizzería',
      categories: ['Pizzería'],
      summary: 'Pizza artesanal para compartir.',
      imageUrl: null,
      sourceUrl: 'https://visitacaguas.net/donde-comer/la-pizza-criolla',
    }),
    basePlace({
      id: 'bar',
      title: 'Piña Sunset Bar',
      category: 'Barras',
      categories: ['Barras', 'Cocteles'],
      description: 'Coctelería tropical y música en vivo.',
      imageUrl: 'https://visitacaguas.net/storage/bar.jpg',
      sourceUrl: 'https://visitacaguas.net/gastronomia/pina-sunset-bar',
    }),
  ]

  test('filters by category and query while exposing summary metadata for visible subset', () => {
    const filtered = filterGastronomiaFeed(feed, {
      categories: ['barras', 'cafetería'],
      query: 'tropical',
    })

    expect(filtered.count).toBe(1)
    expect(filtered.data.map((place) => place.id)).toEqual(['bar'])
    expect(filtered.summary).toEqual({
      categories: ['Barras', 'Cocteles'],
      categoryBreakdown: [
        { category: 'Barras', count: 1 },
        { category: 'Cocteles', count: 1 },
      ],
      withImageCount: 1,
      sourceDomains: ['visitacaguas.net'],
      featuredPlaces: [
        {
          id: 'gastronomia-featured-bar',
          title: 'Piña Sunset Bar',
          category: 'Barras',
          categories: ['Barras', 'Cocteles'],
          summary: 'Resumen',
          imageUrl: 'https://visitacaguas.net/storage/bar.jpg',
          sourceUrl: 'https://visitacaguas.net/gastronomia/pina-sunset-bar',
          reason:
            'tiene foto para decidir rápido · incluye enlace a detalles · cubre Barras y Cocteles',
          actionLabel: 'Ver detalles',
          actionHref: 'https://visitacaguas.net/gastronomia/pina-sunset-bar',
        },
      ],
      suggestedRoutes: [
        {
          id: 'gastronomia-route-noche-caguena',
          title: 'Noche cagueña',
          description:
            'Señala barras, cocteles y spots de salida para armar una vuelta nocturna sin leer toda la vitrina.',
          categories: ['Barras', 'Cocteles'],
          placeIds: ['bar'],
          placeTitles: ['Piña Sunset Bar'],
          count: 1,
          withImageCount: 1,
          actionLabel: 'Filtrar spots de noche',
          actionHref: '/gastronomia?category=Barras%2CCocteles',
        },
      ],
      categorySpotlights: [
        {
          id: 'gastronomia-spotlight-barras',
          category: 'Barras',
          title: 'Foco Barras',
          description:
            '1 lugar visible en Barras; 1 con foto. Lugar líder: Piña Sunset Bar.',
          count: 1,
          withImageCount: 1,
          leadingPlaceId: 'bar',
          leadingPlaceTitle: 'Piña Sunset Bar',
          leadingPlaceSummary: 'Resumen',
          leadingPlaceImageUrl: 'https://visitacaguas.net/storage/bar.jpg',
          categories: ['Barras', 'Cocteles'],
          actionLabel: 'Ver Barras',
          actionHref: '/gastronomia?category=Barras',
        },
        {
          id: 'gastronomia-spotlight-cocteles',
          category: 'Cocteles',
          title: 'Foco Cocteles',
          description:
            '1 lugar visible en Cocteles; 1 con foto. Lugar líder: Piña Sunset Bar.',
          count: 1,
          withImageCount: 1,
          leadingPlaceId: 'bar',
          leadingPlaceTitle: 'Piña Sunset Bar',
          leadingPlaceSummary: 'Resumen',
          leadingPlaceImageUrl: 'https://visitacaguas.net/storage/bar.jpg',
          categories: ['Barras', 'Cocteles'],
          actionLabel: 'Ver Cocteles',
          actionHref: '/gastronomia?category=Cocteles',
        },
      ],
      alerts: [
        {
          id: 'gastronomia-category-barras',
          dedupeKey: 'gastronomia:category:barras',
          scope: 'category',
          severity: 'info',
          title: 'Paradas para salir hoy',
          message:
            '1 lugar visible con foco en Barras y Cocteles dentro del subset actual.',
          count: 1,
          categories: ['Barras', 'Cocteles'],
          withImageCount: 1,
        },
      ],
    })
  })

  test('caps limit and derives categories from the limited visible subset only', () => {
    const filtered = filterGastronomiaFeed(feed, { limit: 2 })

    expect(filtered.count).toBe(2)
    expect(filtered.data.map((place) => place.id)).toEqual(['cafe', 'pizza'])
    expect(filtered.summary).toEqual({
      categories: ['Brunch', 'Cafetería', 'Pizzería'],
      categoryBreakdown: [
        { category: 'Brunch', count: 1 },
        { category: 'Cafetería', count: 1 },
        { category: 'Pizzería', count: 1 },
      ],
      withImageCount: 1,
      sourceDomains: ['visitacaguas.net'],
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
        {
          id: 'gastronomia-featured-pizza',
          title: 'La Pizza Criolla',
          category: 'Pizzería',
          categories: ['Pizzería'],
          summary: 'Pizza artesanal para compartir.',
          imageUrl: null,
          sourceUrl: 'https://visitacaguas.net/donde-comer/la-pizza-criolla',
          reason: 'incluye enlace a detalles · representa Pizzería',
          actionLabel: 'Ver detalles',
          actionHref: 'https://visitacaguas.net/donde-comer/la-pizza-criolla',
        },
      ],
      suggestedRoutes: [
        {
          id: 'gastronomia-route-cafe-brunch',
          title: 'Ruta de café y brunch',
          description:
            'Empieza suave por cafés, brunch y postres visibles antes de seguir explorando el casco urbano.',
          categories: ['Brunch', 'Cafetería'],
          placeIds: ['cafe'],
          placeTitles: ['Cafe del Turabo'],
          count: 1,
          withImageCount: 1,
          actionLabel: 'Filtrar café y brunch',
          actionHref: '/gastronomia?category=Brunch%2CCafeter%C3%ADa',
        },
        {
          id: 'gastronomia-route-casual-rapido',
          title: 'Casual y rápido',
          description:
            'Opciones fáciles para comer algo sin mucha planificación: pizza, burgers, antojos y paradas casuales.',
          categories: ['Pizzería'],
          placeIds: ['pizza'],
          placeTitles: ['La Pizza Criolla'],
          count: 1,
          withImageCount: 0,
          actionLabel: 'Filtrar casual rápido',
          actionHref: '/gastronomia?category=Pizzer%C3%ADa',
        },
      ],
      categorySpotlights: [
        {
          id: 'gastronomia-spotlight-brunch',
          category: 'Brunch',
          title: 'Foco Brunch',
          description:
            '1 lugar visible en Brunch; 1 con foto. Lugar líder: Cafe del Turabo.',
          count: 1,
          withImageCount: 1,
          leadingPlaceId: 'cafe',
          leadingPlaceTitle: 'Cafe del Turabo',
          leadingPlaceSummary: 'Cafe local en el casco urbano.',
          leadingPlaceImageUrl: 'https://visitacaguas.net/storage/cafe.jpg',
          categories: ['Brunch', 'Cafetería'],
          actionLabel: 'Ver Brunch',
          actionHref: '/gastronomia?category=Brunch',
        },
        {
          id: 'gastronomia-spotlight-cafeteria',
          category: 'Cafetería',
          title: 'Foco Cafetería',
          description:
            '1 lugar visible en Cafetería; 1 con foto. Lugar líder: Cafe del Turabo.',
          count: 1,
          withImageCount: 1,
          leadingPlaceId: 'cafe',
          leadingPlaceTitle: 'Cafe del Turabo',
          leadingPlaceSummary: 'Cafe local en el casco urbano.',
          leadingPlaceImageUrl: 'https://visitacaguas.net/storage/cafe.jpg',
          categories: ['Brunch', 'Cafetería'],
          actionLabel: 'Ver Cafetería',
          actionHref: '/gastronomia?category=Cafeter%C3%ADa',
        },
        {
          id: 'gastronomia-spotlight-pizzeria',
          category: 'Pizzería',
          title: 'Foco Pizzería',
          description:
            '1 lugar visible en Pizzería; sin fotos visibles. Lugar líder: La Pizza Criolla.',
          count: 1,
          withImageCount: 0,
          leadingPlaceId: 'pizza',
          leadingPlaceTitle: 'La Pizza Criolla',
          leadingPlaceSummary: 'Pizza artesanal para compartir.',
          leadingPlaceImageUrl: null,
          categories: ['Pizzería'],
          actionLabel: 'Ver Pizzería',
          actionHref: '/gastronomia?category=Pizzer%C3%ADa',
        },
      ],
      alerts: [
        {
          id: 'gastronomia-category-brunch',
          dedupeKey: 'gastronomia:category:brunch',
          scope: 'category',
          severity: 'info',
          title: 'Ruta de café y brunch visible',
          message:
            '1 lugar visible con foco en Brunch, Cafetería y 1 más dentro del subset actual.',
          count: 2,
          categories: ['Brunch', 'Cafetería', 'Pizzería'],
          withImageCount: 1,
        },
      ],
    })
  })

  test('counts repeated categories across the visible subset for coverage chips', () => {
    const filtered = filterGastronomiaFeed([
      ...feed,
      basePlace({
        id: 'coffee-lab',
        title: 'Coffee Lab',
        category: 'Cafetería',
        categories: ['Cafetería', 'Postres'],
      }),
    ])

    expect(filtered.summary.categoryBreakdown).toEqual([
      { category: 'Cafetería', count: 2 },
      { category: 'Barras', count: 1 },
      { category: 'Brunch', count: 1 },
      { category: 'Cocteles', count: 1 },
      { category: 'Pizzería', count: 1 },
      { category: 'Postres', count: 1 },
    ])
    expect(filtered.summary.suggestedRoutes).toEqual([
      {
        id: 'gastronomia-route-cafe-brunch',
        title: 'Ruta de café y brunch',
        description:
          'Empieza suave por cafés, brunch y postres visibles antes de seguir explorando el casco urbano.',
        categories: ['Brunch', 'Cafetería', 'Postres'],
        placeIds: ['cafe', 'coffee-lab'],
        placeTitles: ['Cafe del Turabo', 'Coffee Lab'],
        count: 2,
        withImageCount: 1,
        actionLabel: 'Filtrar café y brunch',
        actionHref: '/gastronomia?category=Brunch%2CCafeter%C3%ADa%2CPostres',
      },
      {
        id: 'gastronomia-route-noche-caguena',
        title: 'Noche cagueña',
        description:
          'Señala barras, cocteles y spots de salida para armar una vuelta nocturna sin leer toda la vitrina.',
        categories: ['Barras', 'Cocteles'],
        placeIds: ['bar'],
        placeTitles: ['Piña Sunset Bar'],
        count: 1,
        withImageCount: 1,
        actionLabel: 'Filtrar spots de noche',
        actionHref: '/gastronomia?category=Barras%2CCocteles',
      },
      {
        id: 'gastronomia-route-casual-rapido',
        title: 'Casual y rápido',
        description:
          'Opciones fáciles para comer algo sin mucha planificación: pizza, burgers, antojos y paradas casuales.',
        categories: ['Pizzería'],
        placeIds: ['pizza'],
        placeTitles: ['La Pizza Criolla'],
        count: 1,
        withImageCount: 0,
        actionLabel: 'Filtrar casual rápido',
        actionHref: '/gastronomia?category=Pizzer%C3%ADa',
      },
    ])
    expect(filtered.summary.alerts).toEqual([
      {
        id: 'gastronomia-combo-visible',
        dedupeKey: 'gastronomia:combo:4:cafeteria|barras|brunch',
        scope: 'combo',
        severity: 'warning',
        title: 'Variedad para armar ruta',
        message:
          '4 paradas gastronómicas activas repartidas entre Cafetería, Barras y 1 más. Buen punto de partida para explorar Caguas por sabor y mood.',
        count: 4,
        categories: ['Cafetería', 'Barras', 'Brunch'],
        withImageCount: 2,
      },
      {
        id: 'gastronomia-category-cafeteria',
        dedupeKey: 'gastronomia:category:cafeteria',
        scope: 'category',
        severity: 'info',
        title: 'Ruta de café y brunch visible',
        message:
          '2 lugares visibles con foco en Cafetería, Barras y 1 más dentro del subset actual.',
        count: 4,
        categories: ['Cafetería', 'Barras', 'Brunch'],
        withImageCount: 2,
      },
      {
        id: 'gastronomia-visual-coverage',
        dedupeKey: 'gastronomia:visual:2:4',
        scope: 'visual',
        severity: 'info',
        title: 'Vitrina con buena cobertura visual',
        message:
          '2 tarjetas con imagen para decidir rápido qué probar antes de salir.',
        count: 4,
        categories: ['Cafetería', 'Barras', 'Brunch'],
        withImageCount: 2,
      },
    ])
  })
})
