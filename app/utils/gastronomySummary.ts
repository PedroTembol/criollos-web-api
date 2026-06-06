export interface GastronomyFeedAlert {
  id: string
  scope: 'category' | 'combo' | 'visual'
  severity: 'info' | 'warning'
  title: string
  message: string
  count?: number | null
  categories?: string[] | null
  withImageCount?: number | null
}

export interface GastronomyFeaturedPlace {
  id: string
  title: string
  category: string
  categories?: string[] | null
  summary?: string | null
  imageUrl?: string | null
  sourceUrl?: string | null
  reason: string
  actionLabel: string
  actionHref: string
}

export interface GastronomySuggestedRoute {
  id: string
  title: string
  description: string
  categories?: string[] | null
  placeIds?: string[] | null
  placeTitles?: string[] | null
  count?: number | null
  withImageCount?: number | null
  actionLabel: string
  actionHref: string
}

export interface GastronomyCategorySpotlight {
  id: string
  category: string
  title: string
  description: string
  count?: number | null
  withImageCount?: number | null
  leadingPlaceId?: string | null
  leadingPlaceTitle: string
  leadingPlaceSummary?: string | null
  leadingPlaceImageUrl?: string | null
  categories?: string[] | null
  actionLabel: string
  actionHref: string
}

export interface GastronomyFeedSummary {
  categories?: string[] | null
  categoryBreakdown?: Array<{
    category?: string | null
    count?: number | null
  }> | null
  withImageCount?: number | null
  sourceDomains?: string[] | null
  featuredPlaces?: GastronomyFeaturedPlace[] | null
  suggestedRoutes?: GastronomySuggestedRoute[] | null
  categorySpotlights?: GastronomyCategorySpotlight[] | null
  alerts?: GastronomyFeedAlert[] | null
}

interface GastronomySummaryCard {
  id: string
  label: string
  value: string
  hint: string
}

export interface GastronomyAlertCard {
  id: string
  eyebrow: string
  title: string
  body: string
  meta: string
  severity: 'info' | 'warning'
}

export interface GastronomyFeaturedPlaceCard {
  id: string
  title: string
  category: string
  body: string
  meta: string
  imageUrl?: string | null
  actionLabel: string
  actionHref: string
  external: boolean
}

export interface GastronomySuggestedRouteCard {
  id: string
  title: string
  body: string
  meta: string
  actionLabel: string
  actionHref: string
}

export interface GastronomyCategorySpotlightCard {
  id: string
  title: string
  category: string
  body: string
  meta: string
  imageUrl?: string | null
  actionLabel: string
  actionHref: string
}

function formatCount(value: number, singular: string, plural: string): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

export function formatGastronomyCategoryCoverage(
  summary?: GastronomyFeedSummary | null
): string {
  const categories = summary?.categories?.filter(Boolean) || []

  if (!categories.length) {
    return 'Sin categorías visibles'
  }

  return formatCount(
    categories.length,
    'categoría activa',
    'categorías activas'
  )
}

export function formatGastronomySourceCoverage(
  summary?: GastronomyFeedSummary | null
): string {
  const domains = summary?.sourceDomains?.filter(Boolean) || []

  if (!domains.length) {
    return 'Sin fuentes visibles'
  }

  return formatCount(domains.length, 'fuente visible', 'fuentes visibles')
}

function formatLeadingCategories(
  summary?: GastronomyFeedSummary | null
): string {
  const leadingCategories = (summary?.categoryBreakdown || [])
    .filter((entry) => entry?.category)
    .slice(0, 3)
    .map((entry) => `${entry.category} (${entry.count || 0})`)

  if (!leadingCategories.length) {
    return 'Sin cobertura categorizada visible.'
  }

  return `Cobertura dominante: ${leadingCategories.join(', ')}${(summary?.categoryBreakdown?.length || 0) > 3 ? '…' : ''}`
}

export function getGastronomySummaryCards(
  summary?: GastronomyFeedSummary | null,
  count = 0
): GastronomySummaryCard[] {
  const categories = summary?.categories?.filter(Boolean) || []
  const sourceDomains = summary?.sourceDomains?.filter(Boolean) || []
  const withImageCount = Math.max(0, summary?.withImageCount || 0)
  const categoryBreakdown =
    summary?.categoryBreakdown?.filter((entry) => entry?.category) || []

  return [
    {
      id: 'mix',
      label: 'Sabores visibles',
      value: formatGastronomyCategoryCoverage(summary),
      hint: categoryBreakdown.length
        ? formatLeadingCategories(summary)
        : categories.length
          ? `Categorías activas: ${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '…' : ''}`
          : 'Ajusta los filtros para volver a poblar la vitrina gastronómica.',
    },
    {
      id: 'coverage',
      label: 'Cobertura visual',
      value: formatCount(
        withImageCount,
        'tarjeta con imagen',
        'tarjetas con imagen'
      ),
      hint:
        count > 0
          ? `${formatCount(count, 'lugar visible', 'lugares visibles')} en este subset.`
          : 'No hay lugares visibles con los filtros actuales.',
    },
    {
      id: 'sources',
      label: 'Fuentes',
      value: formatGastronomySourceCoverage(summary),
      hint: sourceDomains.length
        ? `Dominios: ${sourceDomains.join(', ')}`
        : 'Sin dominios de origen visibles en este subset.',
    },
  ]
}

export function getGastronomyFeaturedPlaceCards(
  summary?: GastronomyFeedSummary | null
): GastronomyFeaturedPlaceCard[] {
  const places = summary?.featuredPlaces?.filter(Boolean) || []

  return places.map((place) => {
    const categories = place.categories?.filter(Boolean) || []
    const metaParts = [
      place.category,
      categories.length > 1 ? categories.slice(0, 3).join(', ') : null,
      place.imageUrl ? 'foto visible' : null,
    ].filter(Boolean)

    return {
      id: place.id,
      title: place.title,
      category: place.category,
      body: place.summary || place.reason,
      meta: metaParts.join(' · '),
      imageUrl: place.imageUrl,
      actionLabel: place.actionLabel,
      actionHref: place.actionHref,
      external: /^https?:\/\//i.test(place.actionHref),
    }
  })
}

export function getGastronomyCategorySpotlightCards(
  summary?: GastronomyFeedSummary | null
): GastronomyCategorySpotlightCard[] {
  const spotlights = summary?.categorySpotlights?.filter(Boolean) || []

  return spotlights.map((spotlight) => {
    const categories = spotlight.categories?.filter(Boolean) || []
    const metaParts = [
      spotlight.count != null
        ? formatCount(spotlight.count, 'lugar visible', 'lugares visibles')
        : null,
      spotlight.withImageCount != null
        ? formatCount(
            spotlight.withImageCount,
            'foto visible',
            'fotos visibles'
          )
        : null,
      categories.length ? categories.slice(0, 3).join(', ') : null,
    ].filter(Boolean)

    return {
      id: spotlight.id,
      title: spotlight.title,
      category: spotlight.category,
      body: spotlight.leadingPlaceSummary
        ? `${spotlight.description} ${spotlight.leadingPlaceTitle}: ${spotlight.leadingPlaceSummary}`
        : spotlight.description,
      meta: metaParts.join(' · '),
      imageUrl: spotlight.leadingPlaceImageUrl,
      actionLabel: spotlight.actionLabel,
      actionHref: spotlight.actionHref,
    }
  })
}

export function getGastronomySuggestedRouteCards(
  summary?: GastronomyFeedSummary | null
): GastronomySuggestedRouteCard[] {
  const routes = summary?.suggestedRoutes?.filter(Boolean) || []

  return routes.map((route) => {
    const categories = route.categories?.filter(Boolean) || []
    const titles = route.placeTitles?.filter(Boolean) || []
    const metaParts = [
      route.count != null ? formatCount(route.count, 'lugar', 'lugares') : null,
      categories.length ? categories.slice(0, 3).join(', ') : null,
      route.withImageCount != null
        ? formatCount(route.withImageCount, 'foto visible', 'fotos visibles')
        : null,
    ].filter(Boolean)

    return {
      id: route.id,
      title: route.title,
      body: titles.length
        ? `${route.description} Incluye: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '…' : ''}.`
        : route.description,
      meta: metaParts.join(' · '),
      actionLabel: route.actionLabel,
      actionHref: route.actionHref,
    }
  })
}

export function getGastronomyAlertCards(
  summary?: GastronomyFeedSummary | null
): GastronomyAlertCard[] {
  const alerts = summary?.alerts?.filter(Boolean) || []

  return alerts.map((alert) => {
    const categories = alert.categories?.filter(Boolean) || []
    const metaParts = [
      alert.count != null ? formatCount(alert.count, 'lugar', 'lugares') : null,
      categories.length ? categories.slice(0, 3).join(', ') : null,
      alert.withImageCount != null
        ? formatCount(alert.withImageCount, 'foto visible', 'fotos visibles')
        : null,
    ].filter(Boolean)

    return {
      id: alert.id,
      eyebrow:
        alert.severity === 'warning' ? 'Atención rápida' : 'Aviso editorial',
      title: alert.title,
      body: alert.message,
      meta: metaParts.join(' · '),
      severity: alert.severity,
    }
  })
}
