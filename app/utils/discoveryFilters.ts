export interface DiscoveryCategoryItem {
  type?: string | null
  category?: string | null
}

export interface DiscoveryTypeOption {
  value: string
  label: string
}

export interface DiscoveryActiveFilter {
  key: 'type' | 'category' | 'q' | 'from' | 'to'
  label: string
  value: string
}

export function getStableAvailableCategories(
  items: DiscoveryCategoryItem[] = [],
  selectedType = ''
): string[] {
  const categories = new Set<string>()
  const normalizedType = selectedType.trim().toLowerCase()

  for (const item of items) {
    const category = item?.category?.trim()
    const itemType = item?.type?.trim().toLowerCase() || ''

    if (!category) continue
    if (normalizedType && itemType !== normalizedType) continue

    categories.add(category)
  }

  return Array.from(categories).sort((left, right) =>
    left.localeCompare(right, 'es')
  )
}

function formatFilterDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('es-PR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00.000Z`))
  } catch {
    return value
  }
}

export function getActiveDiscoveryFilters(
  filters: {
    selectedType?: string | null
    selectedCategory?: string | null
    searchQuery?: string | null
    from?: string | null
    to?: string | null
  },
  typeOptions: DiscoveryTypeOption[] = []
): DiscoveryActiveFilter[] {
  const activeFilters: DiscoveryActiveFilter[] = []
  const selectedType = filters.selectedType?.trim() || ''
  const selectedCategory = filters.selectedCategory?.trim() || ''
  const searchQuery = filters.searchQuery?.trim() || ''
  const from = filters.from?.trim() || ''
  const to = filters.to?.trim() || ''

  if (selectedType) {
    const typeLabel =
      typeOptions.find((option) => option.value === selectedType)?.label ||
      selectedType
    activeFilters.push({ key: 'type', label: 'Tipo', value: typeLabel })
  }

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
    activeFilters.push({
      key: 'from',
      label: 'Desde',
      value: formatFilterDate(from),
    })
  }

  if (to) {
    activeFilters.push({
      key: 'to',
      label: 'Hasta',
      value: formatFilterDate(to),
    })
  }

  return activeFilters
}
