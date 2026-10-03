import {
  createError,
  getRequestHeader,
  getRequestWebStream,
  setResponseHeader,
  type H3Event,
} from 'h3'

export const BETA_BODY_MAX_BYTES = 1024
export const BETA_BODY_TIMEOUT_MS = 10_000
export const BETA_ATTEMPT_LIMIT = 5
export const BETA_ATTEMPT_WINDOW_MS = 10 * 60_000
export const BETA_ATTEMPT_MAX_CLIENTS = 1000

function invalidBody() {
  return createError({
    statusCode: 400,
    statusMessage: 'Invalid beta request body',
  })
}

/** Read without buffering an unbounded/chunked request via readBody(). */
export async function readBetaRequestBody(
  event: H3Event,
  options: { timeoutMs?: number } = {}
): Promise<unknown> {
  const contentType = getRequestHeader(event, 'content-type')
    ?.split(';')[0]
    ?.trim()
    .toLowerCase()
  if (contentType !== 'application/json') {
    throw createError({
      statusCode: 415,
      statusMessage: 'Beta requests must use application/json',
    })
  }
  const declaredLength = getRequestHeader(event, 'content-length')
  if (declaredLength !== undefined) {
    if (!/^\d+$/.test(declaredLength.trim())) throw invalidBody()
    if (Number(declaredLength) > BETA_BODY_MAX_BYTES) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Beta request body is too large',
      })
    }
  }

  const request = event.node.req
  const bridgeEvents = ['data', 'end', 'error'] as const
  const usesNodeBridge =
    !event.web?.request?.body &&
    !event._requestBody &&
    typeof request.listeners === 'function'
  const originalListeners = usesNodeBridge
    ? new Map(
        bridgeEvents.map((name) => [name, new Set(request.listeners(name))])
      )
    : null
  let bridgeListeners = new Map<string, ReturnType<typeof request.listeners>>()
  const captureBridge = () => {
    if (!originalListeners) return
    bridgeListeners = new Map(
      bridgeEvents.map((name) => [
        name,
        request
          .listeners(name)
          .filter((listener) => !originalListeners.get(name)!.has(listener)),
      ])
    )
  }
  const detachBridge = () => {
    for (const [name, listeners] of bridgeListeners)
      for (const listener of listeners) request.removeListener(name, listener)
  }
  let stream: ReturnType<typeof getRequestWebStream>
  try {
    stream = getRequestWebStream(event)
    captureBridge()
  } catch {
    captureBridge()
    detachBridge()
    throw invalidBody()
  }
  if (!stream) throw invalidBody()
  let reader: ReadableStreamDefaultReader
  try {
    reader = stream.getReader()
  } catch {
    throw invalidBody()
  }
  const timeoutMs = Math.min(
    options.timeoutMs ?? BETA_BODY_TIMEOUT_MS,
    BETA_BODY_TIMEOUT_MS
  )
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    detachBridge()
    reader.releaseLock()
    throw new RangeError('The beta body timeout must be positive')
  }
  const bytes = new Uint8Array(BETA_BODY_MAX_BYTES)
  let size = 0
  let interrupted = false
  const oversized = createError({
    statusCode: 413,
    statusMessage: 'Beta request body is too large',
  })
  const timedOut = createError({
    statusCode: 408,
    statusMessage: 'Beta request body timed out',
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      interrupted = true
      reject(timedOut)
    }, timeoutMs)
  })
  const read = async () => {
    while (!interrupted) {
      const { done, value } = await reader.read()
      if (interrupted) return
      if (done) break
      const chunk =
        typeof value === 'string'
          ? new TextEncoder().encode(value)
          : value instanceof Uint8Array
            ? value
            : null
      if (!chunk) throw invalidBody()
      if (size + chunk.byteLength > BETA_BODY_MAX_BYTES) {
        throw oversized
      }
      bytes.set(chunk, size)
      size += chunk.byteLength
    }
    if (!size) throw invalidBody()
    try {
      return JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          bytes.subarray(0, size)
        )
      )
    } catch {
      throw invalidBody()
    }
  }
  try {
    return await Promise.race([read(), deadline])
  } catch (error) {
    interrupted = true
    if (usesNodeBridge) {
      // H3's Node bridge does not detach its enqueue listeners on cancellation.
      // Stop those listeners before closing the stream; keep the response alive.
      request.pause()
      detachBridge()
      if (request.listenerCount('error') === 0) request.once('error', () => {})
    }
    // A slow/malicious underlying cancel hook must not delay the error response.
    void reader.cancel().catch(() => {})
    if (error === oversized || error === timedOut) throw error
    throw invalidBody()
  } finally {
    clearTimeout(timer)
    detachBridge()
    reader.releaseLock()
  }
}

export type BetaAttemptResult = { allowed: boolean; retryAfterSeconds: number }

/** Best-effort per-isolate limit; no IP is logged or written to durable storage. */
export function createBetaAttemptGuard(options: { maxClients?: number } = {}) {
  const maxClients = options.maxClients ?? BETA_ATTEMPT_MAX_CLIENTS
  if (
    !Number.isInteger(maxClients) ||
    maxClients < 1 ||
    maxClients > BETA_ATTEMPT_MAX_CLIENTS
  ) {
    throw new RangeError('Beta attempt capacity must be between 1 and 1000')
  }
  const clients = new Map<string, { attempts: number; resetAt: number }>()
  return {
    attempt(client: string, now = Date.now()): BetaAttemptResult {
      if (!Number.isFinite(now))
        throw new RangeError('Invalid beta attempt time')
      for (const [key, bucket] of clients)
        if (now >= bucket.resetAt) clients.delete(key)
      // The route supplies a trusted address. Bound key length as well as count;
      // unavailable addresses share one conservative anonymous bucket.
      const key = client.trim().slice(0, 128) || 'unknown'
      let bucket = clients.get(key)
      if (!bucket) {
        if (clients.size >= maxClients) {
          const earliestExpiry = Math.min(
            ...[...clients.values()].map((item) => item.resetAt)
          )
          return {
            allowed: false,
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((earliestExpiry - now) / 1000)
            ),
          }
        }
        bucket = { attempts: 0, resetAt: now + BETA_ATTEMPT_WINDOW_MS }
        clients.set(key, bucket)
      }
      if (bucket.attempts >= BETA_ATTEMPT_LIMIT) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((bucket.resetAt - now) / 1000)
          ),
        }
      }
      bucket.attempts++
      return { allowed: true, retryAfterSeconds: 0 }
    },
  }
}

export const betaAttemptGuard = createBetaAttemptGuard()

/** Call before parsing/validation so unsuccessful attempts also consume quota. */
export function enforceBetaAttemptLimit(event: H3Event, client: string) {
  const result = betaAttemptGuard.attempt(client)
  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', result.retryAfterSeconds)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many beta registration attempts',
      data: { retryAfterSeconds: result.retryAfterSeconds },
    })
  }
}
