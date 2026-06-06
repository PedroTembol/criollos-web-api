export interface EventsActiveFilter {
  key: 'category' | 'q' | 'from' | 'to'
  label: string
  value: string
}

export function getStableEventCategories(categories: string[] = []): string[] {
  return [
    ...new Set(categories.map((category) => category.trim()).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'es'))
}

export function getActiveEventFilters(filters: {
  selectedCategory?: string | null
  searchQuery?: string | null
  from?: string | null
  to?: string | null
}): EventsActiveFilter[] {
  const activeFilters: EventsActiveFilter[] = []
  const selectedCategory = filters.selectedCategory?.trim() || ''
  const searchQuery = filters.searchQuery?.trim() || ''
  const from = filters.from?.trim() || ''
  const to = filters.to?.trim() || ''

  if (selectedCategory) {
    activeFilters.push({
      key: 'category',
      label: 'Categoría',
      value: selectedCategory,
    })
  }

  if (searchQuery) {
    activeFilters.push({ key: 'q', label: 'Búsqueda', value: searchQuery })
  }

  if (from) {
    activeFilters.push({ key: 'from', label: 'Desde', value: from })
  }

  if (to) {
    activeFilters.push({ key: 'to', label: 'Hasta', value: to })
  }

  return activeFilters
}
