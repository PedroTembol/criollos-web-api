export const publicApiRoutes = [
  '/bootstrap',
  '/routes',
  '/stops',
  '/vehicles/positions',
  '/vehicles/nearby',
  '/tracking',
  '/eta',
  '/eventos',
  '/gastronomia',
  '/discovery',
  '/recommendations',
  '/search',
  '/proactive-recommendations',
  '/notifications',
  '/feedback',
  '/health',
] as const

export function isPublicApiRoute(url: string): boolean {
  if (!url) {
    return false
  }

  if (url.startsWith('/api/v1')) {
    return true
  }

  return publicApiRoutes.some((route) => {
    return (
      url === route ||
      url.startsWith(route + '/') ||
      url.startsWith(route + '?')
    )
  })
}
