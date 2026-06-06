import type { H3Event } from 'h3'
import type { BootstrapResponse } from './bootstrap'
import { applyConditionalCache } from './httpCache'

export type RoutesCatalogResponse = {
  routes: BootstrapResponse['routes']
  fetchedAt: string
}

export type StopsCatalogResponse = {
  stops: BootstrapResponse['stops']
  fetchedAt: string
}

export function buildRoutesCatalogResponse(
  data: BootstrapResponse
): RoutesCatalogResponse {
  return {
    routes: data.routes,
    fetchedAt: data.fetchedAt,
  }
}

export function buildStopsCatalogResponse(
  data: BootstrapResponse
): StopsCatalogResponse {
  return {
    stops: data.stops,
    fetchedAt: data.fetchedAt,
  }
}

export function applyCatalogConditionalCache(
  event: H3Event,
  payload: unknown,
  maxAgeSeconds: number,
  fetchedAt?: string | null
): boolean {
  return applyConditionalCache(event, {
    maxAgeSeconds,
    payload,
    lastModified: fetchedAt,
  })
}
