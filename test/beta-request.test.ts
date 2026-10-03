import { describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import type { H3Event } from 'h3'
import {
  BETA_ATTEMPT_WINDOW_MS,
  BETA_BODY_MAX_BYTES,
  createBetaAttemptGuard,
  enforceBetaAttemptLimit,
  readBetaRequestBody,
} from '../server/utils/betaRequest'

const encoder = new TextEncoder()
function streamOf(chunks: Array<Uint8Array | string>, cancel?: () => void) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
    cancel,
  })
}
function eventOf(stream: ReadableStream, headers: Record<string, string> = {}) {
  const responseHeaders = new Map<string, string>()
  const event = {
    method: 'POST',
    _requestBody: stream,
    node: {
      req: {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
      },
      res: {
        setHeader: (key: string, value: string) =>
          responseHeaders.set(key.toLowerCase(), value),
      },
    },
  } as unknown as H3Event
  return { event, responseHeaders }
}

describe('bounded beta JSON body', () => {
  test('reads UTF-8 JSON split across chunks, including a multibyte boundary', async () => {
    const bytes = encoder.encode(
      JSON.stringify({ email: 'café@example.com', platform: 'ios' })
    )
    const accent = bytes.indexOf(0xc3)
    const stream = streamOf([
      bytes.subarray(0, accent + 1),
      bytes.subarray(accent + 1),
    ])
    const { event } = eventOf(stream, {
      'content-type': 'Application/JSON; charset=utf-8',
    })
    expect(await readBetaRequestBody(event)).toEqual({
      email: 'café@example.com',
      platform: 'ios',
    })
    expect(stream.locked).toBe(false)
  })
  test('accepts exactly 1024 bytes and rejects larger byte counts regardless of declared length', async () => {
    const exactly = JSON.stringify('a'.repeat(BETA_BODY_MAX_BYTES - 2))
    expect(
      await readBetaRequestBody(
        eventOf(streamOf([encoder.encode(exactly)])).event
      )
    ).toHaveLength(1022)
    for (const headers of [{}, { 'content-length': '4' }]) {
      const bytes = encoder.encode(JSON.stringify('é'.repeat(512)))
      await expect(
        readBetaRequestBody(
          eventOf(
            streamOf([bytes.subarray(0, 700), bytes.subarray(700)]),
            headers
          ).event
        )
      ).rejects.toMatchObject({ statusCode: 413 })
    }
  })
  test('rejects oversized declared bodies before consuming the stream', async () => {
    let reads = 0
    const stream = new ReadableStream(
      {
        pull() {
          reads++
        },
      },
      { highWaterMark: 0 }
    )
    await expect(
      readBetaRequestBody(eventOf(stream, { 'content-length': '1025' }).event)
    ).rejects.toMatchObject({ statusCode: 413 })
    expect(reads).toBe(0)
    expect(stream.locked).toBe(false)
  })
  test('requires JSON media type and rejects malformed headers, JSON, empty and invalid UTF-8', async () => {
    for (const contentType of [
      'text/plain',
      'application/x-www-form-urlencoded',
      '',
    ]) {
      await expect(
        readBetaRequestBody(
          eventOf(streamOf(['{}']), { 'content-type': contentType }).event
        )
      ).rejects.toMatchObject({ statusCode: 415 })
    }
    await expect(
      readBetaRequestBody(
        eventOf(streamOf(['{}']), { 'content-length': 'bad' }).event
      )
    ).rejects.toMatchObject({ statusCode: 400 })
    for (const chunks of [
      [],
      [encoder.encode('{')],
      [new Uint8Array([0x22, 0xc3, 0x28, 0x22])],
    ]) {
      await expect(
        readBetaRequestBody(eventOf(streamOf(chunks)).event)
      ).rejects.toMatchObject({ statusCode: 400 })
    }
  })
  test('cancels an oversized chunked stream without waiting for a slow cancel hook', async () => {
    let cancelled = false
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1025))
      },
      cancel() {
        cancelled = true
        return new Promise<void>(() => {})
      },
    })
    await expect(
      readBetaRequestBody(eventOf(stream).event)
    ).rejects.toMatchObject({ statusCode: 413 })
    expect(cancelled).toBe(true)
    expect(stream.locked).toBe(false)
  })
  test('bounds total body time and cancels a stalled stream', async () => {
    let cancelled = false
    const stream = new ReadableStream({
      cancel() {
        cancelled = true
      },
    })
    await expect(
      readBetaRequestBody(eventOf(stream).event, { timeoutMs: 5 })
    ).rejects.toMatchObject({ statusCode: 408 })
    expect(cancelled).toBe(true)
    expect(stream.locked).toBe(false)
  })
  test('normalizes stream failures without echoing request data', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.error(new Error('private@example.com fixture data'))
      },
    })
    try {
      await readBetaRequestBody(eventOf(stream).event)
      throw new Error('Expected a read failure')
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        statusMessage: 'Invalid beta request body',
      })
      expect(String(error)).not.toContain('private@example.com')
    }
  })
  test('detaches H3 Node bridge listeners before cancelling oversized request data', async () => {
    const request = Object.assign(new EventEmitter(), {
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      paused: false,
      pause() {
        this.paused = true
      },
    })
    const event = {
      method: 'POST',
      node: { req: request },
    } as unknown as H3Event
    const result = readBetaRequestBody(event)
    request.emit('data', new Uint8Array(1025))
    await expect(result).rejects.toMatchObject({ statusCode: 413 })
    expect(request.paused).toBe(true)
    expect(request.listenerCount('data')).toBe(0)
    expect(request.listenerCount('end')).toBe(0)
    expect(() => request.emit('data', new Uint8Array(1025))).not.toThrow()
    expect(() =>
      request.emit('error', new Error('fixture connection closed'))
    ).not.toThrow()
  })
})

describe('isolated in-memory beta attempt guard', () => {
  test('allows five attempts per address then returns retry time without extending the window', () => {
    const guard = createBetaAttemptGuard()
    for (let attempt = 0; attempt < 5; attempt++)
      expect(guard.attempt('192.0.2.1', attempt * 1000).allowed).toBe(true)
    expect(guard.attempt('192.0.2.1', 5500)).toEqual({
      allowed: false,
      retryAfterSeconds: 595,
    })
    expect(guard.attempt('192.0.2.1', 599_500)).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    })
    expect(guard.attempt('192.0.2.2', 5500).allowed).toBe(true)
    expect(guard.attempt('192.0.2.1', BETA_ATTEMPT_WINDOW_MS)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    })
  })
  test('bounds live client buckets without evicting a rate-limited address', () => {
    const guard = createBetaAttemptGuard({ maxClients: 2 })
    for (let attempt = 0; attempt < 5; attempt++) guard.attempt('192.0.2.1', 0)
    expect(guard.attempt('192.0.2.2', 1000).allowed).toBe(true)
    expect(guard.attempt('192.0.2.3', 2000)).toEqual({
      allowed: false,
      retryAfterSeconds: 598,
    })
    expect(guard.attempt('192.0.2.1', 3000).allowed).toBe(false)
    expect(guard.attempt('192.0.2.3', BETA_ATTEMPT_WINDOW_MS).allowed).toBe(
      true
    )
    expect(guard.attempt('192.0.2.2', BETA_ATTEMPT_WINDOW_MS).allowed).toBe(
      true
    )
  })
  test('default capacity never creates more than 1000 live buckets', () => {
    const guard = createBetaAttemptGuard()
    for (let index = 0; index < 1000; index++)
      expect(guard.attempt(`fixture-${index}`, 0).allowed).toBe(true)
    expect(guard.attempt('fixture-1001', 0).allowed).toBe(false)
    expect(guard.attempt('fixture-1001', BETA_ATTEMPT_WINDOW_MS).allowed).toBe(
      true
    )
    expect(() => createBetaAttemptGuard({ maxClients: 1001 })).toThrow()
  })
  test('unavailable addresses share a conservative bucket and HTTP rejection supplies Retry-After', () => {
    const guard = createBetaAttemptGuard()
    for (let attempt = 0; attempt < 5; attempt++) guard.attempt('', 0)
    expect(guard.attempt(' ', 0).allowed).toBe(false)
    const { event, responseHeaders } = eventOf(streamOf([]))
    for (let attempt = 0; attempt < 5; attempt++)
      enforceBetaAttemptLimit(event, '198.51.100.100-fixture')
    expect(() =>
      enforceBetaAttemptLimit(event, '198.51.100.100-fixture')
    ).toThrow()
    expect(Number(responseHeaders.get('retry-after'))).toBeGreaterThan(0)
    try {
      enforceBetaAttemptLimit(event, '198.51.100.100-fixture')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 429 })
    }
  })
})
