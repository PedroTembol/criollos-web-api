type CacheEntry = {
  value: unknown
  expiresAt: number
}

type InflightMap = Map<string, Promise<unknown>>
type MemoryCache = Map<string, CacheEntry>

function getMemoryCache(): MemoryCache {
  const globalKey = '__memoryCache'
  const globalAny = globalThis as typeof globalThis & { [key: string]: MemoryCache }
  if (!globalAny[globalKey]) {
    globalAny[globalKey] = new Map()
  }
  return globalAny[globalKey]
}

function getInflight(): InflightMap {
  const globalKey = '__inflightCache'
  const globalAny = globalThis as typeof globalThis & { [key: string]: InflightMap }
  if (!globalAny[globalKey]) {
    globalAny[globalKey] = new Map()
  }
  return globalAny[globalKey]
}

function getCacheRequest(key: string) {
  return new Request(`https://cache.local/${encodeURIComponent(key)}`)
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const memoryCache = getMemoryCache()
  const entry = memoryCache.get(key)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value as T
  }

  const cache = globalThis.caches?.default
  if (!cache) {
    return null
  }

  const response = await cache.match(getCacheRequest(key))
  if (!response) {
    return null
  }

  return (await response.json()) as T
}

export async function setCachedJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000
  getMemoryCache().set(key, { value, expiresAt })

  const cache = globalThis.caches?.default
  if (!cache) {
    return
  }

  const response = new Response(JSON.stringify(value), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttlSeconds}`
    }
  })

  await cache.put(getCacheRequest(key), response)
}

export async function withCacheLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const inflight = getInflight()
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) {
    return existing
  }

  const promise = fn().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}
