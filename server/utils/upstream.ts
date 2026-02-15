import { createError } from 'h3'
import { getAppConfig } from './config'

type QueryValue = string | number | undefined | null

function buildUrl(endpoint: string, params: Record<string, QueryValue>) {
  const config = getAppConfig()
  const url = new URL(endpoint, config.upstreamBaseUrl)

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    url.searchParams.set(key, String(value))
  })

  return url
}

export async function fetchUpstreamJson<T>(
  endpoint: string,
  params: Record<string, QueryValue>,
  timeoutMs = 15000
): Promise<T> {
  const config = getAppConfig()
  const url = buildUrl(endpoint, {
    ...params,
    DEVICEID: config.deviceId
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Upstream error for ${endpoint}`
      })
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export async function postUpstreamJson<T>(
  endpoint: string,
  body: Record<string, unknown>,
  timeoutMs = 15000
): Promise<T> {
  const config = getAppConfig()
  const url = buildUrl(endpoint, {})

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...body,
        DEVICEID: config.deviceId
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Upstream error for ${endpoint}`
      })
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}
