import { describe, expect, test } from 'bun:test'
import { resolveVenue } from '../server/utils/venueResolver'
import type { BootstrapData } from '../server/utils/normalize'

const mockBootstrap: BootstrapData = {
  assets: [],
  routes: [],
  routePoints: [],
  stops: [],
  config: {},
  markers: [
    {
      id: 100,
      groupId: 1,
      description: 'Plaza Santiago R. Palmer',
      lat: 18.234,
      lng: -66.034,
    },
    {
      id: 101,
      groupId: 1,
      description: 'Centro de Bellas Artes',
      lat: 18.235,
      lng: -66.035,
    },
    {
      id: 102,
      groupId: 1,
      description: 'Teatro Arcelay',
      lat: 18.236,
      lng: -66.036,
    },
    {
      id: 103,
      groupId: 1,
      description: 'Jardín Botánico y Cultural',
      lat: 18.25,
      lng: -66.04,
    },
  ],
}

describe('Venue Resolver', () => {
  test('resolves exact match', () => {
    const result = resolveVenue('Teatro Arcelay', mockBootstrap)
    expect(result.markerId).toBe(102)
    expect(result.matchConfidence).toBe(1.0)
  })

  test('resolves alias match (Plaza de Recreo)', () => {
    const result = resolveVenue('Evento en la Plaza de Recreo', mockBootstrap)
    expect(result.markerId).toBe(100)
    expect(result.matchConfidence).toBe(0.9)
  })

  test('resolves fuzzy match (Bellas Artes)', () => {
    const result = resolveVenue('Bellas Artes de Caguas', mockBootstrap)
    expect(result.markerId).toBe(101)
    expect(result.matchConfidence).toBeGreaterThan(0.5)
  })

  test('resolves Jardín Botánico with alias', () => {
    const result = resolveVenue('Visitando el Jardin Botanico', mockBootstrap)
    expect(result.markerId).toBe(103)
    expect(result.matchConfidence).toBe(0.9)
  })

  test('returns null for unknown venue', () => {
    const result = resolveVenue('Un lugar misterioso en la Luna', mockBootstrap)
    expect(result.markerId).toBeNull()
    expect(result.lat).toBeNull()
  })

  test('handles null input', () => {
    const result = resolveVenue(null, mockBootstrap)
    expect(result.markerId).toBeNull()
  })
})
