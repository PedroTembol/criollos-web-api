export interface DiscoveryFeedAlert {
  id: string
  scope: 'day' | 'mix' | 'food'
  severity: 'info' | 'warning'
  title: string
  message: string
  date?: string | null
  count?: number | null
  eventCount?: number | null
  foodCount?: number | null
  categories?: string[] | null
}

export interface DiscoveryFeedSummary {
  types?: Array<{
    type?: string | null
    count?: number | null
  }> | null
  categories?: string[] | null
  dateRange?: {
    start?: string | null
    end?: string | null
  } | null
  withImageCount?: number | null
  sourceDomains?: string[] | null
  alerts?: DiscoveryFeedAlert[] | null
}

interface DiscoverySummaryCard {
  id: string
  label: string
  value: string
  hint: string
}

export interface DiscoveryAlertCard {
  id: string
  eyebrow: string
  title: string
  body: string
  meta: string
  severity: 'info' | 'warning'
}

function formatCount(value: number, singular: string, plural: string): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat('es-PR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function formatDiscoveryDateRange(
  summary?: DiscoveryFeedSummary | null
): string {
  const start = summary?.dateRange?.start
  const end = summary?.dateRange?.end

  if (!start || !end) {
    return 'Sin agenda fechada visible'
  }

  try {
    const startLabel = formatShortDate(start)
    const endLabel = formatShortDate(end)
    return start === end ? startLabel : `${startLabel} al ${endLabel}`
  } catch {
    return 'Sin agenda fechada visible'
  }
}

export function formatDiscoveryTypeBreakdown(
  summary?: DiscoveryFeedSummary | null
): string {
  const types = summary?.types || []

  if (!types.length) {
    return 'Sin resultados visibles'
  }

  return types
    .filter((entry) => (entry.count || 0) > 0)
    .map((entry) => {
      const type =
        entry.type === 'evento'
          ? 'evento'
          : entry.type === 'gastronomia'
            ? 'lugar'
            : 'item'
      const plural =
        entry.type === 'evento'
          ? 'eventos'
          : entry.type === 'gastronomia'
            ? 'lugares'
            : 'items'
      return formatCount(entry.count || 0, type, plural)
    })
    .join(' · ')
}

export function getDiscoverySummaryCards(
  summary?: DiscoveryFeedSummary | null,
  count = 0
): DiscoverySummaryCard[] {
  const categories = summary?.categories?.filter(Boolean) || []
  const withImageCount = Math.max(0, summary?.withImageCount || 0)
  const sourceDomains = summary?.sourceDomains?.filter(Boolean) || []

  return [
    {
      id: 'mix',
      label: 'Mix visible',
      value: formatDiscoveryTypeBreakdown(summary),
      hint:
        count > 0
          ? `${formatCount(count, 'resultado visible', 'resultados visibles')} en el feed actual.`
          : 'Ajusta los filtros para volver a poblar el feed.',
    },
    {
      id: 'agenda',
      label: 'Ventana editorial',
      value: formatDiscoveryDateRange(summary),
      hint: categories.length
        ? `Categorías activas: ${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '…' : ''}`
        : 'Todavía no hay categorías visibles con este filtro.',
    },
    {
      id: 'coverage',
      label: 'Cobertura visual',
      value: formatCount(
        withImageCount,
        'tarjeta con imagen',
        'tarjetas con imagen'
      ),
      hint: sourceDomains.length
        ? `Fuentes: ${sourceDomains.join(', ')}`
        : 'Sin dominios de origen visibles en este subset.',
    },
  ]
}

export function getDiscoveryAlertCards(
  summary?: DiscoveryFeedSummary | null
): DiscoveryAlertCard[] {
  const alerts = summary?.alerts?.filter(Boolean) || []

  return alerts.map((alert) => {
    const categories = alert.categories?.filter(Boolean) || []
    const metaParts = [
      alert.eventCount != null && alert.eventCount > 0
        ? formatCount(alert.eventCount, 'evento', 'eventos')
        : null,
      alert.foodCount != null && alert.foodCount > 0
        ? formatCount(alert.foodCount, 'lugar', 'lugares')
        : null,
      categories.length ? categories.slice(0, 3).join(', ') : null,
      alert.date ? formatShortDate(alert.date) : null,
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
