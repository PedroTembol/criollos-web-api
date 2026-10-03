import { describe, it, expect } from 'vitest'

// Live checks are opt-in and never part of test, test:local or CI.
const enabled = process.env.CRIOLLOS_LIVE_TESTS === '1'
const baseUrl = process.env.CRIOLLOS_TEST_BASE_URL
const apiKey = process.env.CRIOLLOS_TEST_API_KEY

async function get(path: string, authenticated = false): Promise<Response> {
  if (!baseUrl) throw new Error('Set CRIOLLOS_TEST_BASE_URL for live checks')
  const url = new URL(path, baseUrl)
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (authenticated && apiKey) headers['x-api-key'] = apiKey
  return fetch(url, { headers, signal: AbortSignal.timeout(10000) })
}

function expectJson(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/json')
}

describe.skipIf(!enabled)(
  'Criollos API endpoints (opt-in live GET only)',
  () => {
    it('health returns dependency status', async () => {
      const response = await get('/api/v1/health')
      expectJson(response)
      const data = await response.json()
      expect(['healthy', 'degraded', 'offline']).toContain(data.status)
      expect(data.dependencies).toBeDefined()
    })

    it('bootstrap returns the public transport catalog', async () => {
      const response = await get('/api/v1/bootstrap')
      expectJson(response)
      const data = await response.json()
      expect(Array.isArray(data.routes)).toBe(true)
      expect(Array.isArray(data.stops)).toBe(true)
    })

    it('eventos returns JSON and its feed envelope', async () => {
      const response = await get('/api/v1/eventos?limit=3')
      expectJson(response)
      const data = await response.json()
      expect(data.status).toBe('success')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it.skipIf(!apiKey)(
      'routes accepts the explicitly supplied test key',
      async () => {
        const response = await get('/api/v1/routes', true)
        expectJson(response)
      }
    )
  }
)
