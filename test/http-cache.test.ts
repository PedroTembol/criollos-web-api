import { describe, expect, test } from 'bun:test'

import {
  createWeakEtag,
  isConditionalRequestFresh,
} from '../server/utils/httpCache'

describe('createWeakEtag', () => {
  test('is stable for the same payload and changes when the payload changes', () => {
    const payload = {
      status: 'success',
      count: 2,
      data: [{ id: 1 }, { id: 2 }],
    }

    const first = createWeakEtag(payload)
    const second = createWeakEtag(payload)
    const changed = createWeakEtag({ ...payload, count: 3 })

    expect(first).toBe(second)
    expect(first).not.toBe(changed)
    expect(first.startsWith('W/"')).toBe(true)
  })
})

describe('isConditionalRequestFresh', () => {
  test('returns true when If-None-Match matches the payload etag', () => {
    const etag = createWeakEtag({ hello: 'turabo' })

    expect(isConditionalRequestFresh({ 'if-none-match': etag }, etag)).toBe(
      true
    )
    expect(
      isConditionalRequestFresh({ 'if-none-match': `"other", ${etag}` }, etag)
    ).toBe(true)
    expect(isConditionalRequestFresh({ 'if-none-match': '*' }, etag)).toBe(true)
  })

  test('returns true when If-Modified-Since is newer than the payload timestamp', () => {
    expect(
      isConditionalRequestFresh(
        {
          'if-modified-since': 'Fri, 04 Apr 2026 06:00:00 GMT',
        },
        'W/"abc"',
        'Fri, 04 Apr 2026 05:59:00 GMT'
      )
    ).toBe(true)
  })

  test('returns false when validators do not match', () => {
    expect(
      isConditionalRequestFresh({ 'if-none-match': 'W/"other"' }, 'W/"abc"')
    ).toBe(false)
    expect(
      isConditionalRequestFresh(
        {
          'if-modified-since': 'Fri, 04 Apr 2026 05:00:00 GMT',
        },
        'W/"abc"',
        'Fri, 04 Apr 2026 06:00:00 GMT'
      )
    ).toBe(false)
  })
})
