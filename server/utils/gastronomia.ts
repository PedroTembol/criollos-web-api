import type { GastronomiaPlace } from './scraper'

export type GastronomiaFeedFilters = {
  categories?: string[]
  query?: string | null
  limit?: number | null
}

export type GastronomiaSummaryAlertScope = 'category' | 'combo' | 'visual'
export type GastronomiaSummaryAlertSeverity = 'info' | 'warning'

export interface GastronomiaSummaryAlert {
  id: string
  dedupeKey: string
  scope: GastronomiaSummaryAlertScope
  severity: GastronomiaSummaryAlertSeverity
  title: string
  message: string
  count: number
  categories: string[]
  withImageCount: number
}

export interface GastronomiaFeaturedPlace {
  id: string
  title: string
  category: string
  categories: string[]
  summary: string
  imageUrl: string | null
  imageAlt: string | null
  sourceUrl: string | null
  reason: string
  actionLabel: string
  actionHref: string
}

export interface GastronomiaSuggestedRoute {
  id: string
  title: string
  description: string
  categories: string[]
  placeIds: string[]
  placeTitles: string[]
  count: number
  withImageCount: number
  actionLabel: string
  actionHref: string
}

export interface GastronomiaCategorySpotlight {
  id: string
  category: string
  title: string
  description: string
  count: number
  withImageCount: number
  leadingPlaceId: string
  leadingPlaceTitle: string
  leadingPlaceSummary: string
  leadingPlaceImageUrl: string | null
  leadingPlaceImageAlt: string | null
  categories: string[]
  actionLabel: string
  actionHref: string
}

export type GastronomiaFeedSummary = {
  categories: string[]
  categoryBreakdown: Array<{
    category: string
    count: number
  }>
  withImageCount: number
  sourceDomains: string[]
  featuredPlaces: GastronomiaFeaturedPlace[]
  suggestedRoutes: GastronomiaSuggestedRoute[]
  categorySpotlights: GastronomiaCategorySpotlight[]
  alerts: GastronomiaSummaryAlert[]
}

export type GastronomiaFeedResult = {
  count: number
  data: GastronomiaPlace[]
  summary: GastronomiaFeedSummary
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeList(values: string[]): string[] {
  return values.map((value) => normalizeValue(value)).filter(Boolean)
}

function formatCountLabel(
  value: number,
  singular: string,
  plural: string
): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function formatCategoryList(categories: string[]): string {
  if (!categories.length) {
    return 'sabores variados'
  }

  if (categories.length === 1) {
    return categories[0]
  }

  if (categories.length === 2) {
    return `${categories[0]} y ${categories[1]}`
  }

  return `${categories[0]}, ${categories[1]} y ${categories.length - 2} más`
}

function normalizeAlertKey(value: string): string {
  return normalizeValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getCategoryAlertTitle(category: string): string {
  const normalized = normalizeAlertKey(category)

  if (
    normalized.includes('brunch') ||
    normalized.includes('cafeter') ||
    normalized.includes('cafe')
  ) {
    return 'Ruta de café y brunch visible'
  }

  if (
    normalized.includes('barra') ||
    normalized.includes('coctel') ||
    normalized.includes('cerve')
  ) {
    return 'Paradas para salir hoy'
  }

  if (normalized.includes('crioll')) {
    return 'Sabor criollo visible'
  }

  return 'Antojo dominante visible'
}

function buildGastronomiaAlerts(
  summary: Omit<GastronomiaFeedSummary, 'alerts'>,
  count: number
): GastronomiaSummaryAlert[] {
  const alerts: GastronomiaSummaryAlert[] = []
  const topCategories = summary.categoryBreakdown
    .slice(0, 3)
    .map((entry) => entry.category)
  const primaryCategory = summary.categoryBreakdown[0]

  if (primaryCategory) {
    alerts.push({
      id: `gastronomia-category-${normalizeAlertKey(primaryCategory.category).replace(/[^a-z0-9]+/g, '-')}`,
      dedupeKey: `gastronomia:category:${normalizeAlertKey(primaryCategory.category)}`,
      scope: 'category',
      severity: primaryCategory.count >= 3 ? 'warning' : 'info',
      title: getCategoryAlertTitle(primaryCategory.category),
      message: `${formatCountLabel(primaryCategory.count, 'lugar visible', 'lugares visibles')} con foco en ${formatCategoryList(topCategories)} dentro del subset actual.`,
      count,
      categories: topCategories,
      withImageCount: summary.withImageCount,
    })
  }

  if (count >= 3 && summary.categoryBreakdown.length >= 2) {
    alerts.push({
      id: 'gastronomia-combo-visible',
      dedupeKey: `gastronomia:combo:${count}:${topCategories.map((category) => normalizeAlertKey(category)).join('|')}`,
      scope: 'combo',
      severity: count >= 4 ? 'warning' : 'info',
      title: 'Variedad para armar ruta',
      message: `${formatCountLabel(count, 'parada gastronómica activa', 'paradas gastronómicas activas')} repartidas entre ${formatCategoryList(topCategories)}. Buen punto de partida para explorar Caguas por sabor y mood.`,
      count,
      categories: topCategories,
      withImageCount: summary.withImageCount,
    })
  }

  if (summary.withImageCount >= 2) {
    alerts.push({
      id: 'gastronomia-visual-coverage',
      dedupeKey: `gastronomia:visual:${summary.withImageCount}:${count}`,
      scope: 'visual',
      severity: 'info',
      title: 'Vitrina con buena cobertura visual',
      message: `${formatCountLabel(summary.withImageCount, 'tarjeta con imagen', 'tarjetas con imagen')} para decidir rápido qué probar antes de salir.`,
      count,
      categories: topCategories,
      withImageCount: summary.withImageCount,
    })
  }

  const severityRank = { warning: 0, info: 1 }

  return alerts
    .sort((left, right) => {
      if (severityRank[left.severity] !== severityRank[right.severity]) {
        return severityRank[left.severity] - severityRank[right.severity]
      }

      return left.id.localeCompare(right.id, 'en')
    })
    .slice(0, 3)
}

type SuggestedRouteRecipe = {
  id: string
  title: string
  description: string
  actionLabel: string
  categoryMatches: string[]
}

const routeRecipes: SuggestedRouteRecipe[] = [
  {
    id: 'cafe-brunch',
    title: 'Ruta de café y brunch',
    description:
      'Empieza suave por cafés, brunch y postres visibles antes de seguir explorando el casco urbano.',
    actionLabel: 'Filtrar café y brunch',
    categoryMatches: ['cafe', 'cafeter', 'brunch', 'postre', 'panader'],
  },
  {
    id: 'sabor-criollo',
    title: 'Sabor criollo para compartir',
    description:
      'Agrupa paradas con comida criolla o platos fuertes para resolver almuerzo, cena o visita familiar.',
    actionLabel: 'Filtrar sabor criollo',
    categoryMatches: [
      'crioll',
      'puertorriq',
      'comida',
      'restaurant',
      'fritura',
    ],
  },
  {
    id: 'noche-caguena',
    title: 'Noche cagueña',
    description:
      'Señala barras, cocteles y spots de salida para armar una vuelta nocturna sin leer toda la vitrina.',
    actionLabel: 'Filtrar spots de noche',
    categoryMatches: ['barra', 'bar', 'coctel', 'cerve', 'pub'],
  },
  {
    id: 'casual-rapido',
    title: 'Casual y rápido',
    description:
      'Opciones fáciles para comer algo sin mucha planificación: pizza, burgers, antojos y paradas casuales.',
    actionLabel: 'Filtrar casual rápido',
    categoryMatches: [
      'pizza',
      'pizzer',
      'burger',
      'hamburg',
      'casual',
      'antoj',
    ],
  },
]

function slugify(value: string): string {
  return normalizeAlertKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function placeMatchesRecipe(
  place: GastronomiaPlace,
  recipe: SuggestedRouteRecipe
): boolean {
  const haystack = [place.category, ...place.categories]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return recipe.categoryMatches.some((match) => haystack.includes(match))
}

function buildSuggestedRoutes(
  data: GastronomiaPlace[]
): GastronomiaSuggestedRoute[] {
  const suggestions = routeRecipes
    .map((recipe) => {
      const places = data.filter((place) => placeMatchesRecipe(place, recipe))
      const categories = [
        ...new Set(
          places
            .flatMap((place) => [place.category, ...place.categories])
            .map((value) => value.trim())
            .filter(Boolean)
        ),
      ].sort((left, right) => left.localeCompare(right, 'es'))

      if (!places.length || !categories.length) {
        return null
      }

      return {
        id: `gastronomia-route-${recipe.id}`,
        title: recipe.title,
        description: recipe.description,
        categories: categories.slice(0, 5),
        placeIds: places.slice(0, 4).map((place) => place.id),
        placeTitles: places.slice(0, 4).map((place) => place.title),
        count: places.length,
        withImageCount: places.filter((place) => Boolean(place.imageUrl))
          .length,
        actionLabel: recipe.actionLabel,
        actionHref: `/gastronomia?category=${encodeURIComponent(categories.slice(0, 5).join(','))}`,
      }
    })
    .filter((suggestion): suggestion is GastronomiaSuggestedRoute =>
      Boolean(suggestion)
    )

  return suggestions
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      if (right.withImageCount !== left.withImageCount) {
        return right.withImageCount - left.withImageCount
      }

      return left.title.localeCompare(right.title, 'es')
    })
    .slice(0, 3)
}

function buildCategorySpotlights(
  data: GastronomiaPlace[]
): GastronomiaCategorySpotlight[] {
  const groups = new Map<
    string,
    {
      category: string
      places: GastronomiaPlace[]
      categories: Set<string>
      withImageCount: number
    }
  >()

  for (const place of data) {
    const categories = [
      ...new Set(
        [place.category, ...place.categories]
          .map((value) => value.trim())
          .filter(Boolean)
      ),
    ]

    for (const category of categories) {
      const key = normalizeAlertKey(category)
      const current = groups.get(key) || {
        category,
        places: [],
        categories: new Set<string>(),
        withImageCount: 0,
      }

      current.places.push(place)
      categories.forEach((value) => current.categories.add(value))
      if (place.imageUrl) {
        current.withImageCount += 1
      }
      groups.set(key, current)
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const [leadingPlace] = [...group.places].sort((left, right) => {
        const leftImageScore = left.imageUrl ? 1 : 0
        const rightImageScore = right.imageUrl ? 1 : 0
        if (rightImageScore !== leftImageScore) {
          return rightImageScore - leftImageScore
        }

        const leftSourceScore = left.sourceUrl ? 1 : 0
        const rightSourceScore = right.sourceUrl ? 1 : 0
        if (rightSourceScore !== leftSourceScore) {
          return rightSourceScore - leftSourceScore
        }

        return left.title.localeCompare(right.title, 'es')
      })
      const categories = Array.from(group.categories)
        .sort((left, right) => left.localeCompare(right, 'es'))
        .slice(0, 5)
      const countLabel = formatCountLabel(
        group.places.length,
        'lugar visible',
        'lugares visibles'
      )
      const visualLabel = group.withImageCount
        ? `${formatCountLabel(group.withImageCount, 'con foto', 'con foto')}`
        : 'sin fotos visibles'

      return {
        id: `gastronomia-spotlight-${slugify(group.category)}`,
        category: group.category,
        title: `Foco ${group.category}`,
        description: `${countLabel} en ${group.category}; ${visualLabel}. Lugar líder: ${leadingPlace.title}.`,
        count: group.places.length,
        withImageCount: group.withImageCount,
        leadingPlaceId: leadingPlace.id,
        leadingPlaceTitle: leadingPlace.title,
        leadingPlaceSummary: leadingPlace.summary || leadingPlace.description,
        leadingPlaceImageUrl: leadingPlace.imageUrl,
        leadingPlaceImageAlt: leadingPlace.imageAlt,
        categories,
        actionLabel: `Ver ${group.category}`,
        actionHref: `/gastronomia?category=${encodeURIComponent(group.category)}`,
      }
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      if (right.withImageCount !== left.withImageCount) {
        return right.withImageCount - left.withImageCount
      }

      return left.category.localeCompare(right.category, 'es')
    })
    .slice(0, 4)
}

function buildFeaturedPlaces(
  data: GastronomiaPlace[]
): GastronomiaFeaturedPlace[] {
  const usedPrimaryCategories = new Set<string>()

  return [...data]
    .sort((left, right) => {
      const leftImageScore = left.imageUrl ? 1 : 0
      const rightImageScore = right.imageUrl ? 1 : 0
      if (rightImageScore !== leftImageScore) {
        return rightImageScore - leftImageScore
      }

      const leftSourceScore = left.sourceUrl ? 1 : 0
      const rightSourceScore = right.sourceUrl ? 1 : 0
      if (rightSourceScore !== leftSourceScore) {
        return rightSourceScore - leftSourceScore
      }

      if (right.categories.length !== left.categories.length) {
        return right.categories.length - left.categories.length
      }

      return left.title.localeCompare(right.title, 'es')
    })
    .filter((place) => {
      const primaryCategory = place.category.trim()
      const key = normalizeAlertKey(primaryCategory)

      if (!primaryCategory || usedPrimaryCategories.has(key)) {
        return false
      }

      usedPrimaryCategories.add(key)
      return true
    })
    .slice(0, 4)
    .map((place) => {
      const categories = [
        ...new Set(
          [place.category, ...place.categories]
            .map((value) => value.trim())
            .filter(Boolean)
        ),
      ]
      const reasonParts = [
        place.imageUrl ? 'tiene foto para decidir rápido' : null,
        place.sourceUrl ? 'incluye enlace a detalles' : null,
        categories.length > 1
          ? `cubre ${formatCategoryList(categories.slice(0, 3))}`
          : `representa ${place.category}`,
      ].filter(Boolean)

      return {
        id: `gastronomia-featured-${slugify(place.id || place.title)}`,
        title: place.title,
        category: place.category,
        categories,
        summary: place.summary,
        imageUrl: place.imageUrl,
        imageAlt: place.imageAlt,
        sourceUrl: place.sourceUrl,
        reason: reasonParts.join(' · '),
        actionLabel: place.sourceUrl ? 'Ver detalles' : 'Ver en vitrina',
        actionHref:
          place.sourceUrl ||
          `/gastronomia?q=${encodeURIComponent(place.title)}`,
      }
    })
}

function buildSummary(data: GastronomiaPlace[]): GastronomiaFeedSummary {
  const categoryCounts = new Map<string, number>()

  data.forEach((item) => {
    const itemCategories = [
      ...new Set(
        [item.category, ...item.categories]
          .map((value) => value.trim())
          .filter(Boolean)
      ),
    ]

    itemCategories.forEach((value) => {
      categoryCounts.set(value, (categoryCounts.get(value) ?? 0) + 1)
    })
  })

  const categories = [
    ...new Set(
      data
        .flatMap((item) => [item.category, ...item.categories])
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ].sort((left, right) => left.localeCompare(right, 'es'))

  const sourceDomains = [
    ...new Set(
      data
        .map((item) => {
          if (!item.sourceUrl) {
            return null
          }

          try {
            return new URL(item.sourceUrl).hostname
          } catch {
            return null
          }
        })
        .filter((value): value is string => Boolean(value))
    ),
  ].sort((left, right) => left.localeCompare(right, 'en'))

  const summaryBase = {
    categories,
    categoryBreakdown: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count
        }

        return left.category.localeCompare(right.category, 'es')
      }),
    withImageCount: data.filter((item) => Boolean(item.imageUrl)).length,
    sourceDomains,
    featuredPlaces: buildFeaturedPlaces(data),
    suggestedRoutes: buildSuggestedRoutes(data),
    categorySpotlights: buildCategorySpotlights(data),
  }

  return {
    ...summaryBase,
    alerts: buildGastronomiaAlerts(summaryBase, data.length),
  }
}

export function filterGastronomiaFeed(
  places: GastronomiaPlace[],
  filters: GastronomiaFeedFilters = {}
): GastronomiaFeedResult {
  const categorySet = filters.categories?.length
    ? new Set(normalizeList(filters.categories))
    : null
  const normalizedQuery = filters.query?.trim().toLowerCase() || null
  const normalizedLimit =
    filters.limit != null
      ? Math.min(Math.max(1, Math.trunc(filters.limit)), 100)
      : null

  const filtered = places.filter((item) => {
    if (categorySet) {
      const itemCategories = normalizeList([item.category, ...item.categories])
      if (!itemCategories.some((category) => categorySet.has(category))) {
        return false
      }
    }

    if (normalizedQuery) {
      const haystack = [
        item.title,
        item.category,
        item.summary,
        item.description,
        ...item.categories,
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(normalizedQuery)) {
        return false
      }
    }

    return true
  })

  const data =
    normalizedLimit != null ? filtered.slice(0, normalizedLimit) : filtered

  return {
    count: data.length,
    data,
    summary: buildSummary(data),
  }
}
