import { describe, it, expect } from 'vitest'

const apiKey =
  '118884a9d701e5b0ab4f44322568a3c548fb3efb9f22b1b64f8c446224224c2b'
const baseUrl = 'https://criollos.app'

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRateLimitRetry(
  path: string,
  headers?: HeadersInit,
  attempts = 3
): Promise<Response> {
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, { headers })
    lastResponse = response

    if (response.status !== 429) {
      return response
    }

    const retryAfterHeader = response.headers.get('retry-after')
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN
    const waitMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : 1000 * (attempt + 1)

    if (attempt < attempts - 1) {
      await sleep(waitMs)
    }
  }

  return lastResponse as Response
}

function expectSuccessOrRateLimited(response: Response) {
  expect([200, 429]).toContain(response.status)
}

describe('Criollos API Endpoints (Live Check)', () => {
  it('GET /api/v1/bootstrap should return data or an explicit rate limit', async () => {
    const response = await fetchWithRateLimitRetry('/api/v1/bootstrap', {
      'x-api-key': apiKey,
    })

    expectSuccessOrRateLimited(response)

    if (response.status === 200) {
      const data = await response.json()
      expect(data.routes).toBeDefined()
    }
  })

  it('GET /api/v1/bootstrap should return 403 with invalid API Key', async () => {
    const response = await fetchWithRateLimitRetry('/api/v1/bootstrap', {
      'x-api-key': 'invalid-key',
    })

    expect(response.status).toBe(403)
  })

  it('GET /api/v1/eventos should return success', async () => {
    const response = await fetchWithRateLimitRetry('/api/v1/eventos', {
      'x-api-key': apiKey,
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.status).toBe('success')
  })
})
