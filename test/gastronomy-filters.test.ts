import { describe, expect, test } from 'bun:test'

import {
  getActiveGastronomyFilters,
  getGastronomyCategoryOptions,
  normalizeGastronomyQueryList,
} from '../app/utils/gastronomyFilters'
import { getGastronomySummaryCards } from '../app/utils/gastronomySummary'

describe('gastronomy filter helpers', () => {
  test('normalizes repeated and comma-separated category query params', () => {
    expect(
      normalizeGastronomyQueryList(['Cafetería, Brunch', 'Brunch', 'Postres'])
    ).toEqual(['Cafetería', 'Brunch', 'Postres'])
  })

  test('builds category options from category breakdown when available', () => {
    expect(
      getGastronomyCategoryOptions([
        { category: 'Cafetería', count: 3 },
        { category: 'Postres', count: 1 },
      ])
    ).toEqual([
      { category: 'Cafetería', count: 3 },
      { category: 'Postres', count: 1 },
    ])
  })

  test('exposes one removable active filter per selected category', () => {
    expect(
      getActiveGastronomyFilters({
        selectedCategories: ['Cafetería', 'Brunch'],
        searchQuery: 'criolla',
      })
    ).toEqual([
      { key: 'category:Cafetería', label: 'Categoría', value: 'Cafetería' },
      { key: 'category:Brunch', label: 'Categoría', value: 'Brunch' },
      { key: 'q', label: 'Búsqueda', value: 'criolla' },
    ])
  })
})

describe('gastronomy summary helpers', () => {
  test('includes leading category coverage in the editorial summary hint', () => {
    const cards = getGastronomySummaryCards(
      {
        categories: ['Cafetería', 'Brunch'],
        categoryBreakdown: [
          { category: 'Cafetería', count: 3 },
          { category: 'Brunch', count: 2 },
        ],
        withImageCount: 4,
        sourceDomains: ['visitacaguas.net'],
      },
      5
    )

    expect(cards[0]).toEqual({
      id: 'mix',
      label: 'Sabores visibles',
      value: '2 categorías activas',
      hint: 'Cobertura dominante: Cafetería (3), Brunch (2)',
    })
  })
})
