import type { SearchResult } from './search'

export type AssistantIntent =
  | 'nearby'
  | 'trolley'
  | 'events'
  | 'food'
  | 'search'

export interface AssistantAction {
  label: string
  href: string
  type: 'map' | 'details' | 'search'
}

export interface AssistantEvidence {
  type: SearchResult['type']
  id: string
  title: string
  subtitle: string
  metadata?: Record<string, any>
}

export interface AssistantResponse {
  intent: AssistantIntent
  answer: string
  actions: AssistantAction[]
  evidence: AssistantEvidence[]
  needsLocation: boolean
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function detectAssistantIntent(question: string): AssistantIntent {
  const value = normalize(question)

  if (
    /\b(cerca|cercano|cercana|alrededor|donde estoy|mi ubicacion)\b/.test(value)
  ) {
    return 'nearby'
  }
  if (
    /\b(trolley|trolleys|ruta|rutas|parada|paradas|guagua|transport)\b/.test(
      value
    )
  ) {
    return 'trolley'
  }
  if (
    /\b(evento|eventos|actividad|actividades|agenda|festival|concierto|musica)\b/.test(
      value
    )
  ) {
    return 'events'
  }
  if (
    /\b(comer|comida|restaurante|restaurantes|cafe|cafeteria|gastronomia|antojo)\b/.test(
      value
    )
  ) {
    return 'food'
  }
  return 'search'
}

export function extractAssistantSearchQuery(question: string): string {
  return normalize(question)
    .replace(/[¿?¡!.,]/g, ' ')
    .replace(
      /\b(que|cual|cuales|hay|dime|quiero|busco|buscar|ver|puedo|donde|esta|estan|hoy|ahora|mismo|en|el|la|los|las|un|una|de|del|por|para|cerca|cercano|cercana|mi|ubicacion|evento|eventos|actividad|actividades|agenda|comer|comida|restaurante|restaurantes|gastronomia|trolley|trolleys|ruta|rutas|parada|paradas)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function actionFor(result: SearchResult): AssistantAction {
  if (result.type === 'stop') {
    return {
      label: 'Ver parada en el mapa',
      href: `/#map?stopId=${result.metadata?.stopId ?? ''}`,
      type: 'map',
    }
  }
  if (result.type === 'vehicle') {
    return {
      label: 'Ver trolley en el mapa',
      href: `/#map?assetId=${result.metadata?.assetId ?? ''}`,
      type: 'map',
    }
  }
  if (result.type === 'route') {
    return {
      label: 'Ver ruta',
      href: `/#map?routeId=${result.metadata?.routeId ?? ''}`,
      type: 'map',
    }
  }
  return {
    label: 'Ver detalles',
    href: result.link || '/',
    type: 'details',
  }
}

const intentLabels: Record<AssistantIntent, string> = {
  nearby: 'cerca de ti',
  trolley: 'de trolley',
  events: 'de eventos',
  food: 'para comer',
  search: 'para tu búsqueda',
}

export function buildAssistantResponse(
  question: string,
  results: SearchResult[],
  options: { hasLocation?: boolean; limit?: number } = {}
): AssistantResponse {
  const intent = detectAssistantIntent(question)
  const limit = Math.min(Math.max(options.limit ?? 3, 1), 5)
  const selected = results.slice(0, limit)
  const needsLocation = intent === 'nearby' && !options.hasLocation

  let answer: string
  if (needsLocation) {
    answer =
      'Compárteme tu ubicación para recomendarte paradas, trolleys y planes cercanos.'
  } else if (!selected.length) {
    answer = `No encontré resultados ${intentLabels[intent]}. Prueba con un lugar, ruta o categoría más específica.`
  } else {
    const titles = selected.map((result) => result.title).join(', ')
    answer = `Encontré ${selected.length} opción${selected.length === 1 ? '' : 'es'} ${intentLabels[intent]}: ${titles}.`
  }

  return {
    intent,
    answer,
    actions: selected.map(actionFor),
    evidence: selected.map((result) => ({
      type: result.type,
      id: result.id,
      title: result.title,
      subtitle: result.subtitle,
      metadata: result.metadata,
    })),
    needsLocation,
  }
}
