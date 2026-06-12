import { describe, expect, test } from 'bun:test'
import {
  buildAssistantResponse,
  detectAssistantIntent,
  extractAssistantSearchQuery,
} from '../server/utils/assistant'
import type { SearchResult } from '../server/utils/search'

const stop: SearchResult = {
  type: 'stop',
  id: 'stop-42',
  title: 'Plaza Palmer',
  subtitle: 'Parada de trolley',
  metadata: { stopId: 42, distanceMeters: 180 },
}

describe('Criollos assistant', () => {
  test('detects the supported natural-language intents', () => {
    expect(detectAssistantIntent('¿Qué eventos hay este fin de semana?')).toBe(
      'events'
    )
    expect(detectAssistantIntent('¿Dónde puedo comer café?')).toBe('food')
    expect(detectAssistantIntent('Enséñame una parada de trolley')).toBe(
      'trolley'
    )
    expect(detectAssistantIntent('¿Qué tengo cerca de mi ubicación?')).toBe(
      'nearby'
    )
  })

  test('extracts useful search terms without question filler', () => {
    expect(
      extractAssistantSearchQuery('¿Qué eventos hay en Bellas Artes?')
    ).toBe('bellas artes')
  })

  test('returns concise evidence and reusable actions', () => {
    const response = buildAssistantResponse(
      '¿Qué parada tengo cerca?',
      [stop],
      {
        hasLocation: true,
      }
    )

    expect(response.intent).toBe('nearby')
    expect(response.needsLocation).toBe(false)
    expect(response.evidence[0]?.title).toBe('Plaza Palmer')
    expect(response.actions[0]).toEqual({
      label: 'Ver parada en el mapa',
      href: '/#map?stopId=42',
      type: 'map',
    })
  })

  test('asks for location when a nearby question lacks coordinates', () => {
    const response = buildAssistantResponse('¿Qué hay cerca de mí?', [])
    expect(response.needsLocation).toBe(true)
    expect(response.answer).toContain('ubicación')
  })
})
