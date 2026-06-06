import { describe, expect, test } from 'bun:test'

import {
  getActiveDiscoveryFilters,
  getStableAvailableCategories,
} from '../app/utils/discoveryFilters'

describe('getStableAvailableCategories', () => {
  const items = [
    { type: 'evento', category: 'Música' },
    { type: 'evento', category: 'Arte' },
    { type: 'gastronomia', category: 'Café' },
    { type: 'gastronomia', category: 'Brunch' },
    { type: 'gastronomia', category: 'Café' },
  ]

  test('keeps categories available from the base feed even if filtered results later become empty', () => {
    expect(getStableAvailableCategories(items, '')).toEqual([
      'Arte',
      'Brunch',
      'Café',
      'Música',
    ])
  })

  test('limits categories by selected type without depending on search/category filters', () => {
    expect(getStableAvailableCategories(items, 'gastronomia')).toEqual([
      'Brunch',
      'Café',
    ])
    expect(getStableAvailableCategories(items, 'evento')).toEqual([
      'Arte',
      'Música',
    ])
  })
})

describe('getActiveDiscoveryFilters', () => {
  const typeOptions = [
    { value: '', label: 'Todo' },
    { value: 'evento', label: 'Eventos' },
    { value: 'gastronomia', label: 'Gastronomía' },
  ]

  test('returns human-readable chips for active filters only', () => {
    expect(
      getActiveDiscoveryFilters(
        {
          selectedType: 'gastronomia',
          selectedCategory: 'Café',
          searchQuery: 'plaza',
          from: '2026-04-18',
          to: '2026-04-20',
        },
        typeOptions
      )
    ).toEqual([
      { key: 'type', label: 'Tipo', value: 'Gastronomía' },
      { key: 'category', label: 'Categoría', value: 'Café' },
      { key: 'q', label: 'Búsqueda', value: 'plaza' },
      { key: 'from', label: 'Desde', value: '18 abr 2026' },
      { key: 'to', label: 'Hasta', value: '20 abr 2026' },
    ])
  })

  test('omits empty values', () => {
    expect(
      getActiveDiscoveryFilters(
        {
          selectedType: '',
          selectedCategory: '  ',
          searchQuery: null,
        },
        typeOptions
      )
    ).toEqual([])
  })
})
