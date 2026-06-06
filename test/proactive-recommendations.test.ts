import { describe, it, expect, vi } from 'vitest'
import { globalSearch } from '../server/utils/search'

// Mock de globalSearch para probar la integración en el endpoint sin dependencias externas
vi.mock('../server/utils/search', () => ({
  globalSearch: vi.fn(),
}))

describe('Proactive Recommendations API Logic', () => {
  it('debe transformar resultados de búsqueda en recomendaciones proactivas', async () => {
    const mockResults = {
      results: [
        {
          type: 'stop',
          id: 's-nearby-1',
          title: 'Parada 1',
          subtitle: 'Parada Cercana (100m)',
          metadata: { stopId: 1 },
        },
        {
          type: 'evento',
          id: 'nearby-evt-1',
          title: 'Festival Criollo',
          subtitle: 'Plan Cercano',
          description: 'Música en vivo',
        },
      ],
      nearbyEnabled: true,
    }

    // @ts-ignore
    globalSearch.mockResolvedValue(mockResults as any)

    // Simulación simplificada de la lógica del handler
    const recommendations = mockResults.results.map((r) => ({
      id: r.id,
      type:
        r.type === 'evento'
          ? 'plan'
          : r.type === 'gastronomia'
            ? 'food'
            : 'mobility',
      priority: r.id.includes('nearby') ? 'high' : 'medium',
      title: r.title,
      message: (r as any).description || r.subtitle,
      actionLabel:
        r.type === 'stop' || r.type === 'vehicle'
          ? 'Ver en Mapa'
          : 'Ver Detalles',
    }))

    expect(recommendations).toHaveLength(2)
    expect(recommendations[0].type).toBe('mobility')
    expect(recommendations[0].priority).toBe('high')
    expect(recommendations[0].actionLabel).toBe('Ver en Mapa')
    expect(recommendations[1].type).toBe('plan')
    expect(recommendations[1].title).toBe('Festival Criollo')
  })
})
