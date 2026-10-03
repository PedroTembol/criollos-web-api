import type { FeedSnapshot } from './data'
import type { BootstrapResponse } from './bootstrap'

export type FeedState = 'fresh' | 'stale' | 'partial' | 'unavailable'
export type FeedMetadata = Omit<FeedSnapshot<unknown>, 'data'> & {
  state: FeedState
  itemCount: number
}
export type CombinedFeedMetadata = {
  state: FeedState
  fetchedAt: string | null
  lastSuccessAt: string | null
  lastAttemptAt: string | null
  stale: boolean
  staleReason: string | null
  complete: boolean
  itemCount: number
  sources: Record<string, FeedMetadata>
}

export function getFeedMetadata<T>(snapshot: FeedSnapshot<T>): FeedMetadata {
  const { data, ...metadata } = snapshot
  const state: FeedState = !metadata.lastSuccessAt
    ? data.length
      ? 'partial'
      : 'unavailable'
    : metadata.stale || !metadata.complete
      ? 'stale'
      : 'fresh'
  return { ...metadata, state, itemCount: data.length }
}

export function unavailableFeedMetadata(sourceUrl: string): FeedMetadata {
  return {
    sourceUrl,
    fetchedAt: null,
    lastSuccessAt: null,
    lastAttemptAt: new Date().toISOString(),
    stale: true,
    staleReason: 'Source unavailable',
    complete: false,
    pagesFetched: 0,
    pagesDiscovered: 0,
    state: 'unavailable',
    itemCount: 0,
  }
}

function newest(values: Array<string | null>): string | null {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) || null
  )
}

/** Source clocks remain separate from the time a derived response is generated. */
export function combineFeedMetadata(
  sources: Record<string, FeedMetadata>
): CombinedFeedMetadata {
  const values = Object.values(sources)
  const complete =
    values.length > 0 && values.every((source) => source.complete)
  const stale = values.some((source) => source.stale || !source.complete)
  const anyAvailable = values.some((source) => source.state !== 'unavailable')
  const state: FeedState = !anyAvailable
    ? 'unavailable'
    : values.every((source) => source.state === 'fresh')
      ? 'fresh'
      : values.some(
            (source) =>
              source.state === 'partial' || source.state === 'unavailable'
          )
        ? 'partial'
        : 'stale'
  return {
    state,
    fetchedAt: newest(values.map((source) => source.fetchedAt)),
    lastSuccessAt:
      values.length && values.every((source) => source.lastSuccessAt)
        ? values.map((source) => source.lastSuccessAt!).sort()[0]!
        : null,
    lastAttemptAt: newest(values.map((source) => source.lastAttemptAt)),
    stale,
    staleReason:
      Object.entries(sources)
        .filter(([, source]) => source.staleReason)
        .map(([name, source]) => `${name}: ${source.staleReason}`)
        .join('; ') || null,
    complete,
    itemCount: values.reduce((sum, source) => sum + source.itemCount, 0),
    sources,
  }
}

export function getTransportFeedMetadata(
  bootstrap: BootstrapResponse | null
): FeedMetadata {
  if (!bootstrap) return unavailableFeedMetadata('transport')
  return {
    sourceUrl: 'transport',
    fetchedAt: bootstrap.fetchedAt,
    lastSuccessAt: bootstrap.fetchedAt,
    lastAttemptAt: bootstrap.fetchedAt,
    stale: Boolean(bootstrap.stale),
    staleReason: bootstrap.stale
      ? 'Serving last-known-good transport data'
      : null,
    complete: true,
    pagesFetched: 1,
    pagesDiscovered: 1,
    state: bootstrap.stale ? 'stale' : 'fresh',
    itemCount: bootstrap.positions.length,
  }
}

export function feedCacheMaxAge(
  metadata: Pick<FeedMetadata, 'stale' | 'complete' | 'state'>,
  freshSeconds: number
): number {
  return metadata.stale || !metadata.complete || metadata.state !== 'fresh'
    ? 60
    : freshSeconds
}
