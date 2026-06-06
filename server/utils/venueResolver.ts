import type { BootstrapData, Marker } from './normalize'

export interface ResolvedVenue {
  lat: number | null
  lng: number | null
  markerId: number | null
  matchConfidence: number
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Map of common keywords or synonyms for Caguas venues
const VENUE_ALIASES: Record<string, string> = {
  'bellas artes': 'Centro de Bellas Artes',
  'centro bellas artes': 'Centro de Bellas Artes',
  'plaza de recreo': 'Plaza Santiago R. Palmer',
  'plaza palmer': 'Plaza Santiago R. Palmer',
  'plaza santiago r palmer': 'Plaza Santiago R. Palmer',
  'jardin botanico': 'Jardín Botánico y Cultural William Miranda Marín',
  'teatro arcelay': 'Teatro Arcelay',
  'museo de arte': 'Museo de Arte de Caguas',
  'museo caguas': 'Museo de Arte de Caguas',
  'paseo de las artes': 'Paseo de las Artes',
  'plaza de la identidad': 'Plaza de la Identidad',
}

export function resolveVenue(
  venueName: string | null,
  data: BootstrapData
): ResolvedVenue {
  if (!venueName) {
    return { lat: null, lng: null, markerId: null, matchConfidence: 0 }
  }

  const normalizedInput = normalize(venueName)

  // 1. Exact normalized match in Markers (Priority)
  for (const marker of data.markers) {
    if (normalize(marker.description) === normalizedInput) {
      return {
        lat: marker.lat,
        lng: marker.lng,
        markerId: marker.id,
        matchConfidence: 1.0,
      }
    }
  }

  // 2. Direct Alias Match
  for (const [alias, canonical] of Object.entries(VENUE_ALIASES)) {
    if (normalizedInput.includes(alias)) {
      const normalizedCanonical = normalize(canonical)
      const match = data.markers.find((m) => {
        const normalizedMarker = normalize(m.description)
        return (
          normalizedMarker.includes(normalizedCanonical) ||
          normalizedCanonical.includes(normalizedMarker)
        )
      })
      if (match && match.lat && match.lng) {
        return {
          lat: match.lat,
          lng: match.lng,
          markerId: match.id,
          matchConfidence: 0.9,
        }
      }
    }
  }

  // 3. Fuzzy/Partial Match in Markers
  let bestMatch: Marker | null = null
  let maxScore = 0

  for (const marker of data.markers) {
    const normalizedMarker = normalize(marker.description)

    // Contains match
    if (
      normalizedMarker.includes(normalizedInput) ||
      normalizedInput.includes(normalizedMarker)
    ) {
      const score =
        Math.min(normalizedMarker.length, normalizedInput.length) /
        Math.max(normalizedMarker.length, normalizedInput.length)
      if (score > maxScore) {
        maxScore = score
        bestMatch = marker
      }
    }
  }

  if (bestMatch && maxScore > 0.3 && bestMatch.lat && bestMatch.lng) {
    return {
      lat: bestMatch.lat,
      lng: bestMatch.lng,
      markerId: bestMatch.id,
      matchConfidence: maxScore,
    }
  }

  return { lat: null, lng: null, markerId: null, matchConfidence: 0 }
}
