import * as cheerio from 'cheerio'

export interface Evento {
  id: string
  title: string
  category: string
  categories: string[]
  summary: string
  description: string
  venue: string | null
  imageUrl: string | null
  imageAlt: string | null
  sourceUrl: string
  publishedAt: string | null
  rawDate: string | null
  lat?: number | null
  lng?: number | null
  markerId?: number | null
}

export interface GastronomiaPlace {
  id: string
  title: string
  category: string
  categories: string[]
  summary: string
  description: string
  imageUrl: string | null
  imageAlt: string | null
  sourceUrl: string | null
  lat?: number | null
  lng?: number | null
  markerId?: number | null
}

function normalizeText(value?: string | null): string {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function extractVenue(description: string): string | null {
  const match = description.match(/(?:📍\s*)?Lugar:\s*([^\n]+)/i)
  return match ? normalizeText(match[1]) : null
}

function toAbsoluteUrl(url?: string | null): string | null {
  const normalized = normalizeText(url)
  if (!normalized) return null
  try {
    return new URL(normalized, 'https://visitacaguas.net').toString()
  } catch {
    return null
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toIsoDate(rawDate: string): string | null {
  const normalized = normalizeText(rawDate)
  if (!normalized) return null

  const match = normalized.match(
    /(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i
  )
  if (!match) return null

  const months: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  }

  const day = Number(match[1])
  const monthKey = match[2]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const year = Number(match[3])
  const month = months[monthKey]

  if (!Number.isInteger(day) || month == null || !Number.isInteger(year)) {
    return null
  }

  return new Date(Date.UTC(year, month, day)).toISOString()
}

function extractTitle(card: cheerio.Cheerio<any>) {
  return (
    normalizeText(card.find('p.font-bold').first().text()) ||
    normalizeText(card.find('h1, h2, h3').first().text()) ||
    normalizeText(card.find('[data-event-title]').first().text())
  )
}

function extractCategoryText(card: cheerio.Cheerio<any>) {
  return (
    normalizeText(
      card.find('p.uppercase.tracking-wide.text-xs').first().text()
    ) || normalizeText(card.find('[data-event-category]').first().text())
  )
}

function extractRawDate(card: cheerio.Cheerio<any>) {
  return (
    normalizeText(
      card.find('p.lowercase.tracking-wide.text-xs').first().text()
    ) ||
    normalizeText(card.find('time').first().text()) ||
    normalizeText(card.find('[data-event-date]').first().text()) ||
    null
  )
}

function extractDescription(card: cheerio.Cheerio<any>) {
  return (
    normalizeText(card.find('p.mt-3').first().text()) ||
    normalizeText(card.find('[data-event-description]').first().text()) ||
    normalizeText(card.find('p').slice(2).text())
  )
}

function buildEvento(
  index: number,
  title: string,
  categoryText: string,
  rawDate: string | null,
  description: string,
  imageUrl: string | null,
  imageAlt: string | null
): Evento {
  const categories = categoryText
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean)

  return {
    id: `${index + 1}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    title,
    category: categories[0] ?? 'General',
    categories,
    summary: description.split(/(?<=[.!?])\s+/)[0] || description,
    description,
    venue: extractVenue(description),
    imageUrl,
    imageAlt: imageAlt || title,
    sourceUrl: 'https://visitacaguas.net/eventos',
    publishedAt: rawDate ? toIsoDate(rawDate) : null,
    rawDate,
  }
}

function extractSourceUrl(card: cheerio.Cheerio<any>) {
  const link =
    card.find('a[href*="/gastronomia/"]').first().attr('href') ||
    card.find('a[href*="/donde-comer/"]').first().attr('href')
  return toAbsoluteUrl(link)
}

function buildGastronomiaPlace(
  title: string,
  categoryText: string,
  description: string,
  imageUrl: string | null,
  imageAlt: string | null,
  sourceUrl: string | null
): GastronomiaPlace {
  const categories = categoryText
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean)

  return {
    id: slugify(title),
    title,
    category: categories[0] ?? 'General',
    categories,
    summary: description.split(/(?<=[.!?])\s+/)[0] || description,
    description,
    imageUrl,
    imageAlt: imageAlt || title,
    sourceUrl,
  }
}

export function parseEventosFromHtml(html: string): Evento[] {
  const $ = cheerio.load(html)
  const eventos: Evento[] = []
  const seen = new Set<string>()
  const cards = $(
    'div.hidden.mt-6.bg-white.shadow-lg.relative.md\\:flex.overflow-hidden, article[data-event-card], [data-event-card]'
  )

  cards.each((index, element) => {
    const card = $(element)
    const title = extractTitle(card)
    const categoryText = extractCategoryText(card)
    const rawDate = extractRawDate(card)
    const description = extractDescription(card)
    const img = card.find('img').first()
    const imageUrl = toAbsoluteUrl(img.attr('src'))
    const imageAlt = normalizeText(img.attr('alt'))

    if (!title || seen.has(title)) {
      return
    }

    eventos.push(
      buildEvento(
        index,
        title,
        categoryText,
        rawDate,
        description,
        imageUrl,
        imageAlt
      )
    )
    seen.add(title)
  })

  return eventos
}

export function parseGastronomiaFromHtml(html: string): GastronomiaPlace[] {
  const $ = cheerio.load(html)
  const places: GastronomiaPlace[] = []
  const seen = new Set<string>()

  // Selector base usado en visitacaguas.net para las tarjetas de lugares
  const cards = $(
    'div.bg-white.shadow-lg.relative.md\\:flex.overflow-hidden, div.bg-white.shadow-md.rounded-lg, [data-place-card]'
  )

  cards.each((_, element) => {
    const card = $(element)
    const title = extractTitle(card)
    if (!title || seen.has(title)) return

    const categoryText = extractCategoryText(card)
    const description = extractDescription(card)
    const img = card.find('img').first()
    const imageUrl = toAbsoluteUrl(img.attr('src'))
    const imageAlt = normalizeText(img.attr('alt'))
    const sourceUrl = extractSourceUrl(card)

    places.push(
      buildGastronomiaPlace(
        title,
        categoryText,
        description,
        imageUrl,
        imageAlt,
        sourceUrl
      )
    )
    seen.add(title)
  })

  return places
}

export async function scrapeEventos(): Promise<Evento[]> {
  try {
    const html = await $fetch<string>('https://visitacaguas.net/eventos')
    return parseEventosFromHtml(html)
  } catch (error) {
    console.error('Error scraping eventos:', error)
    return []
  }
}

export async function scrapeGastronomia(): Promise<GastronomiaPlace[]> {
  try {
    const html = await $fetch<string>('https://visitacaguas.net/donde-comer')
    return parseGastronomiaFromHtml(html)
  } catch (error) {
    console.error('Error scraping gastronomía:', error)
    return []
  }
}

export const __testables = {
  extractVenue,
  normalizeText,
  slugify,
  toAbsoluteUrl,
  toIsoDate,
}
