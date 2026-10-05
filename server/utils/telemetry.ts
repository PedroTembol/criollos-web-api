// Provider timestamps must name their timezone; never guess a local timezone.
export function parseTelemetryTimestamp(value: unknown): number | null {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(
      value
    )
  ) {
    return null
  }
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function getTelemetryAgeSeconds(
  value: unknown,
  now = Date.now()
): number | null {
  const timestamp = parseTelemetryTimestamp(value)
  if (timestamp === null || !Number.isFinite(now) || timestamp > now)
    return null
  // Round up so 120.001 seconds cannot be mislabeled as a recent signal.
  return Math.ceil((now - timestamp) / 1000)
}

export const RECENT_TELEMETRY_SECONDS = 120
