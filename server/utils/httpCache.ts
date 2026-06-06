export interface ConditionalCacheOptions {
  maxAgeSeconds: number
  payload: unknown
  lastModified?: string | Date | null
}

function normalizeLastModified(value?: string | Date | null): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toUTCString()
}

export function createWeakEtag(payload: unknown): string {
  const str = JSON.stringify(payload)
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const val = (hash >>> 0).toString(36) + str.length.toString(36)
  return `W/\"${val}\"`
}

export function isConditionalRequestFresh(
  headers: Record<string, string | undefined>,
  etag: string,
  lastModified?: string | null
): boolean {
  const ifNoneMatch = headers['if-none-match']
  if (ifNoneMatch) {
    const candidates = ifNoneMatch.split(',').map((entry) => entry.trim())
    if (candidates.includes('*') || candidates.includes(etag)) {
      return true
    }
  }

  if (lastModified && headers['if-modified-since']) {
    const modifiedSince = Date.parse(headers['if-modified-since'])
    const lastModifiedAt = Date.parse(lastModified)
    if (
      !Number.isNaN(modifiedSince) &&
      !Number.isNaN(lastModifiedAt) &&
      modifiedSince >= lastModifiedAt
    ) {
      return true
    }
  }

  return false
}

export function applyConditionalCache(
  event: H3Event,
  options: ConditionalCacheOptions
): boolean {
  const etag = createWeakEtag(options.payload)
  const lastModified = normalizeLastModified(options.lastModified)

  setResponseHeader(
    event,
    'Cache-Control',
    `public, max-age=${options.maxAgeSeconds}`
  )
  setResponseHeader(event, 'ETag', etag)
  if (lastModified) {
    setResponseHeader(event, 'Last-Modified', lastModified)
  }

  const isFresh = isConditionalRequestFresh(
    {
      'if-none-match': getRequestHeader(event, 'if-none-match') || undefined,
      'if-modified-since':
        getRequestHeader(event, 'if-modified-since') || undefined,
    },
    etag,
    lastModified
  )

  if (isFresh) {
    setResponseStatus(event, 304)
    return true
  }

  return false
}
