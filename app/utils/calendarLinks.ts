export function buildCalendarDownloadUrl(
  basePath: string,
  query: Record<string, string | undefined>
) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (!value) continue
    search.set(key, value)
  }

  const searchString = search.toString()
  return searchString ? `${basePath}?${searchString}` : basePath
}

function toGoogleCalendarDate(
  value: string | null | undefined
): { start: string; end: string } | null {
  if (!value) return null

  const startDate = new Date(value)
  if (Number.isNaN(startDate.getTime())) return null

  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
  const format = (date: Date) =>
    date.toISOString().slice(0, 10).replace(/-/g, '')

  return {
    start: format(startDate),
    end: format(endDate),
  }
}

export function buildGoogleCalendarUrl(event: {
  title: string
  description?: string | null
  venue?: string | null
  sourceUrl?: string | null
  publishedAt?: string | null
}) {
  const dateRange = toGoogleCalendarDate(event.publishedAt)
  if (!dateRange) return null

  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', event.title)
  url.searchParams.set('dates', `${dateRange.start}/${dateRange.end}`)

  const details = [
    event.description?.trim() || null,
    event.sourceUrl ? `Más info: ${event.sourceUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  if (details) {
    url.searchParams.set('details', details)
  }

  if (event.venue) {
    url.searchParams.set('location', event.venue)
  }

  return url.toString()
}
