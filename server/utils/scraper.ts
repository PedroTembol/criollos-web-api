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

export interface ScrapeResult<T> {
  data: T[]
  sourceUrl: string
  fetchedAt: string | null
  complete: boolean
  error: string | null
  pagesFetched: number
  pagesDiscovered: number
}

type FetchHtml = (url: string, timeoutMs: number) => Promise<string>

const GASTRONOMIA_SOURCE = 'https://visitacaguas.net/'
const EVENTOS_SOURCE = 'https://visitacaguas.net/eventos'
const PAGE_TIMEOUT_MS = 5000
const SCRAPE_TIMEOUT_MS = 20000
const MAX_GASTRONOMIA_PAGES = 40
const PAGE_CONCURRENCY = 3

const fetchHtml: FetchHtml = (url, timeoutMs) =>
  $fetch<string>(url, {
    timeout: timeoutMs,
    retry: 0,
    responseType: 'text',
    headers: { Accept: 'text/html' },
  })

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

  const date = new Date(Date.UTC(year, month, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date.toISOString()
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

/** Follow only source-linked pages in the same unfiltered directory. */
export function parseGastronomiaPageLinks(html: string): string[] {
  const $ = cheerio.load(html)
  const pages = new Map<number, string>()
  $('a[href]').each((_, element) => {
    try {
      const url = new URL($(element).attr('href') || '', GASTRONOMIA_SOURCE)
      const page = Number(url.searchParams.get('page'))
      if (
        url.origin !== new URL(GASTRONOMIA_SOURCE).origin ||
        url.pathname !== '/' ||
        !Number.isSafeInteger(page) ||
        page < 2 ||
        [...url.searchParams.keys()].some((key) => key !== 'page')
      ) {
        return
      }
      pages.set(page, `${GASTRONOMIA_SOURCE}?page=${page}`)
    } catch {
      // A malformed source link is not a request target.
    }
  })
  return [...pages.entries()].sort(([a], [b]) => a - b).map(([, url]) => url)
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

export async function scrapeEventosFeed(
  fetcher: FetchHtml = fetchHtml
): Promise<ScrapeResult<Evento>> {
  try {
    const html = await fetcher(EVENTOS_SOURCE, PAGE_TIMEOUT_MS)
    const data = parseEventosFromHtml(html)
    const complete = data.length > 0
    return {
      data,
      sourceUrl: EVENTOS_SOURCE,
      fetchedAt: complete ? new Date().toISOString() : null,
      complete,
      error: complete ? null : 'No event cards recognized in source',
      pagesFetched: 1,
      pagesDiscovered: 1,
    }
  } catch {
    return {
      data: [],
      sourceUrl: EVENTOS_SOURCE,
      fetchedAt: null,
      complete: false,
      error: 'Event source unavailable',
      pagesFetched: 0,
      pagesDiscovered: 1,
    }
  }
}

export async function scrapeGastronomiaFeed(
  fetcher: FetchHtml = fetchHtml,
  options: { maxPages?: number; timeoutMs?: number } = {}
): Promise<ScrapeResult<GastronomiaPlace>> {
  const maxPages = Math.min(
    MAX_GASTRONOMIA_PAGES,
    Math.max(1, Math.trunc(options.maxPages || MAX_GASTRONOMIA_PAGES))
  )
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.max(1, Math.min(SCRAPE_TIMEOUT_MS, options.timeoutMs!))
    : SCRAPE_TIMEOUT_MS
  const deadline = Date.now() + timeoutMs
  const pending = [GASTRONOMIA_SOURCE]
  const discovered = new Set(pending)
  const attempted = new Set<string>()
  const pages = new Map<string, GastronomiaPlace[]>()
  let failed = false

  while (pending.length && attempted.size < maxPages && Date.now() < deadline) {
    const batch = pending.splice(
      0,
      Math.min(PAGE_CONCURRENCY, maxPages - attempted.size)
    )
    await Promise.all(
      batch.map(async (url) => {
        attempted.add(url)
        try {
          const html = await fetcher(
            url,
            Math.max(1, Math.min(PAGE_TIMEOUT_MS, deadline - Date.now()))
          )
          const data = parseGastronomiaFromHtml(html)
          if (!data.length) {
            failed = true
            return
          }
          pages.set(url, data)
          for (const next of parseGastronomiaPageLinks(html)) {
            if (!discovered.has(next)) {
              discovered.add(next)
              pending.push(next)
            }
          }
        } catch {
          failed = true
        }
      })
    )
  }

  // Deterministic page order and stable IDs also dedupe desktop/mobile cards.
  const places = new Map<string, GastronomiaPlace>()
  const orderedPages = [...pages.entries()].sort(([a], [b]) => {
    const pageA = Number(new URL(a).searchParams.get('page') || 1)
    const pageB = Number(new URL(b).searchParams.get('page') || 1)
    return pageA - pageB
  })
  for (const [, data] of orderedPages) {
    for (const place of data) {
      if (!places.has(place.id)) places.set(place.id, place)
    }
  }

  const complete = !failed && !pending.length && pages.size > 0
  return {
    data: [...places.values()],
    sourceUrl: GASTRONOMIA_SOURCE,
    fetchedAt: pages.size ? new Date().toISOString() : null,
    complete,
    error: complete
      ? null
      : pages.size
        ? `Gastronomy pagination incomplete (${pages.size}/${discovered.size} pages)`
        : 'Gastronomy source unavailable or no place cards recognized',
    pagesFetched: pages.size,
    pagesDiscovered: discovered.size,
  }
}

// Array getters remain compatible with existing catalog consumers.
export async function scrapeEventos(): Promise<Evento[]> {
  return (await scrapeEventosFeed()).data
}

export async function scrapeGastronomia(): Promise<GastronomiaPlace[]> {
  return (await scrapeGastronomiaFeed()).data
}

export const __testables = {
  extractVenue,
  normalizeText,
  slugify,
  toAbsoluteUrl,
  toIsoDate,
}
