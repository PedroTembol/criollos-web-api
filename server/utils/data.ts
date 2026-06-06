import { getCachedJson, setCachedJson, withCacheLock } from './cache'
import {
  scrapeEventos,
  scrapeGastronomia,
  type Evento,
  type GastronomiaPlace,
} from './scraper'
import { getBootstrapData } from './bootstrap'
import { resolveVenue } from './venueResolver'

const CACHE_KEY_EVENTOS = 'eventos:visitacaguas'
const CACHE_KEY_GASTRONOMIA = 'gastronomia:visitacaguas'
const CACHE_TTL_SECONDS = 60 * 60

export async function getCachedEventos(): Promise<Evento[]> {
  const cached = await getCachedJson<Evento[]>(CACHE_KEY_EVENTOS)
  if (cached) {
    return cached
  }

  return withCacheLock(CACHE_KEY_EVENTOS, async () => {
    const fromCache = await getCachedJson<Evento[]>(CACHE_KEY_EVENTOS)
    if (fromCache) return fromCache

    const scraped = await scrapeEventos()
    if (scraped.length > 0) {
      try {
        const bootstrap = await getBootstrapData()
        const enriched = scraped.map((event) => {
          const resolved = resolveVenue(event.venue || event.title, bootstrap)
          return {
            ...event,
            lat: resolved.lat,
            lng: resolved.lng,
            markerId: resolved.markerId,
          }
        })
        await setCachedJson(CACHE_KEY_EVENTOS, enriched, CACHE_TTL_SECONDS)
        return enriched
      } catch (error) {
        console.error('Error enriching eventos with geo data:', error)
        await setCachedJson(CACHE_KEY_EVENTOS, scraped, CACHE_TTL_SECONDS)
      }
    }
    return scraped
  })
}

export async function getCachedGastronomia(): Promise<GastronomiaPlace[]> {
  const cached = await getCachedJson<GastronomiaPlace[]>(CACHE_KEY_GASTRONOMIA)
  if (cached) {
    return cached
  }

  return withCacheLock(CACHE_KEY_GASTRONOMIA, async () => {
    const fromCache = await getCachedJson<GastronomiaPlace[]>(
      CACHE_KEY_GASTRONOMIA
    )
    if (fromCache) return fromCache

    const scraped = await scrapeGastronomia()
    if (scraped.length > 0) {
      try {
        const bootstrap = await getBootstrapData()
        const enriched = scraped.map((place) => {
          const resolved = resolveVenue(place.title, bootstrap)
          return {
            ...place,
            lat: resolved.lat,
            lng: resolved.lng,
            markerId: resolved.markerId,
          }
        })
        await setCachedJson(CACHE_KEY_GASTRONOMIA, enriched, CACHE_TTL_SECONDS)
        return enriched
      } catch (error) {
        console.error('Error enriching gastronomia with geo data:', error)
        await setCachedJson(CACHE_KEY_GASTRONOMIA, scraped, CACHE_TTL_SECONDS)
      }
    }
    return scraped
  })
}
