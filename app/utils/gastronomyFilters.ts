export interface GastronomyCategoryOption {
  category: string
  count: number
}

export interface GastronomyActiveFilter {
  key: string
  label: string
  value: string
}

export function normalizeGastronomyQueryList(
  value: string | string[] | undefined | null
): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []

  return [
    ...new Set(
      raw
        .flatMap((entry) => entry.split(','))
        .map((entry) => entry.trim())
        .filter(Boolean)
    ),
  ]
}

export function getStableGastronomyCategories(
  categories: string[] = []
): string[] {
  return [
    ...new Set(categories.map((category) => category.trim()).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, 'es'))
}

export function getGastronomyCategoryOptions(
  categoryBreakdown: GastronomyCategoryOption[] = [],
  fallbackCategories: string[] = []
): GastronomyCategoryOption[] {
  const normalizedBreakdown = categoryBreakdown
    .filter((entry) => entry?.category?.trim())
    .map((entry) => ({
      category: entry.category.trim(),
      count: Math.max(0, Math.trunc(entry.count || 0)),
    }))

  if (normalizedBreakdown.length) {
    return normalizedBreakdown
  }

  return getStableGastronomyCategories(fallbackCategories).map((category) => ({
    category,
    count: 0,
  }))
}

export function getActiveGastronomyFilters(filters: {
  selectedCategories?: string[] | null
  searchQuery?: string | null
}): GastronomyActiveFilter[] {
  const activeFilters: GastronomyActiveFilter[] = []
  const selectedCategories =
    filters.selectedCategories?.map((value) => value.trim()).filter(Boolean) ||
    []
  const searchQuery = filters.searchQuery?.trim() || ''

  selectedCategories.forEach((category) => {
    activeFilters.push({
      key: `category:${category}`,
      label: 'Categoría',
      value: category,
    })
  })

  if (searchQuery) {
    activeFilters.push({ key: 'q', label: 'Búsqueda', value: searchQuery })
  }

  return activeFilters
}
