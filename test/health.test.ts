import { describe, it, expect, vi } from 'vitest'
import { getGlobalHealth } from '../server/utils/health'

// Mock dependencies
vi.mock('../server/utils/bootstrap', () => ({
  getBootstrapData: vi.fn().mockResolvedValue({
    positions: [{}],
    fetchedAt: new Date().toISOString(),
  }),
}))

vi.mock('../server/utils/data', () => ({
  getCachedEventos: vi.fn().mockResolvedValue([{}, {}]),
  getCachedGastronomia: vi.fn().mockResolvedValue([{}]),
}))

describe('Health Service', () => {
  it('should report healthy when all dependencies are fine', async () => {
    const health = await getGlobalHealth()
    expect(health.status).toBe('healthy')
    expect(health.dependencies.transport.status).toBe('healthy')
    expect(health.dependencies.agenda.status).toBe('healthy')
    expect(health.dependencies.gastronomia.status).toBe('healthy')
  })

  it('should report offline if a dependency fails', async () => {
    const data = await import('../server/utils/data')
    vi.spyOn(data, 'getCachedEventos').mockRejectedValueOnce(
      new Error('Failed')
    )

    const health = await getGlobalHealth()
    expect(health.status).toBe('offline')
    expect(health.dependencies.agenda.status).toBe('offline')
  })
})
