import { describe, expect, it } from 'vitest'
import {
  filterDiscoveryFeed,
  type DiscoveryFeed,
  type DiscoveryFeedItem,
} from '../server/utils/discovery'

const mockItem = (
  overrides: Partial<DiscoveryFeedItem> = {}
): DiscoveryFeedItem => ({
  type: 'evento',
  id: '1',
  title: 'Test',
  subtitle: 'Sub',
  description: 'Desc',
  imageUrl: null,
  imageAlt: null,
  link: null,
  category: 'Test',
  lat: 18.2341,
  lng: -66.0485,
  ...overrides,
})

const mockFeed: DiscoveryFeed = {
  generatedAt: new Date().toISOString(),
  count: 3,
  summary: {
    types: [],
    categories: [],
    dateRange: { start: null, end: null },
    withImageCount: 0,
    sourceDomains: [],
    alerts: [],
  },
  data: [
    mockItem({ id: 'near', lat: 18.2341, lng: -66.0485 }), // Center
    mockItem({ id: 'far', lat: 18.3, lng: -66.1 }), // ~10km away
    mockItem({ id: 'no-coords', lat: null, lng: null }),
  ],
}

describe('Discovery Proximity Filtering', () => {
  it('filters by proximity when lat/lng are provided', () => {
    const filters = {
      lat: 18.2341,
      lng: -66.0485,
      radiusMeters: 500,
    }
    const filtered = filterDiscoveryFeed(mockFeed, filters)

    expect(filtered.count).toBe(1)
    expect(filtered.data[0].id).toBe('near')
  })

  it('includes far items if radius is large enough', () => {
    const filters = {
      lat: 18.2341,
      lng: -66.0485,
      radiusMeters: 20000, // 20km
    }
    const filtered = filterDiscoveryFeed(mockFeed, filters)

    expect(filtered.data.some((i) => i.id === 'near')).toBe(true)
    expect(filtered.data.some((i) => i.id === 'far')).toBe(true)
    expect(filtered.data.some((i) => i.id === 'no-coords')).toBe(false)
  })

  it('uses default radius of 1km if not specified', () => {
    const filters = {
      lat: 18.2341,
      lng: -66.0485,
    }
    const filtered = filterDiscoveryFeed(mockFeed, filters)

    expect(filtered.data.some((i) => i.id === 'near')).toBe(true)
    expect(filtered.data.some((i) => i.id === 'far')).toBe(false)
  })
})
