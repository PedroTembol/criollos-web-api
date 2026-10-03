import { sha256 } from './secureHash'

const publicReads = new Set([
  '/bootstrap',
  '/routes',
  '/stops',
  '/vehicles/positions',
  '/vehicles/nearby',
  '/stops/nearby',
  '/tracking',
  '/eta',
  '/eventos',
  '/gastronomia',
  '/discovery',
  '/search',
  '/health',
  '/notifications',
  '/assistant',
  '/recommendations',
  '/proactive-recommendations',
  '/eventos/calendar',
  '/calendars/eventos.ics',
])

export function isPublicReadRequest(method: string, url: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false
  const pathname = url.split('?')[0].replace(/^\/api\/v1(?=\/|$)/, '')
  return (
    publicReads.has(pathname) || /^\/routes\/[1-9]\d*\/stops$/.test(pathname)
  )
}

export function isPublicBetaSignupRequest(
  method: string,
  url: string
): boolean {
  return method === 'POST' && url.split('?')[0] === '/api/v1/beta'
}

export async function matchesApiKey(
  candidate: string,
  keys: string[]
): Promise<boolean> {
  const digest = await sha256(candidate)
  let matches = false
  for (const key of keys) {
    const expected = await sha256(key)
    let difference = 0
    for (let index = 0; index < digest.length; index++)
      difference |= digest[index] ^ expected[index]
    matches = difference === 0 || matches
  }
  return matches
}
