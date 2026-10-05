import type { Position } from './normalize'

export type TelemetryContract = {
  state: 'available' | 'empty' | 'incompatible'
  receivedRows: number | null
  rejectedRows: number
}

function integer(value: unknown, minimum = 0): value is number {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
  )
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function optionalText(value: unknown): boolean {
  return value == null || typeof value === 'string'
}

function coordinates(trail: string) {
  const first = trail.split('*')[0].split(',')
  const [lat, lng] = first.map((value) =>
    value.trim() === '' ? NaN : Number(value)
  )
  if (
    first.length !== 2 ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return { lat: null, lng: null }
  }
  return { lat, lng }
}

export function decodePositions(raw: unknown): {
  positions: Position[]
  telemetry: TelemetryContract
} {
  if (!Array.isArray(raw)) {
    return {
      positions: [],
      telemetry: { state: 'incompatible', receivedRows: null, rejectedRows: 0 },
    }
  }
  const positions: Position[] = []
  let rejectedRows = 0
  for (const row of raw) {
    if (
      !Array.isArray(row) ||
      row.length < 12 ||
      !integer(row[0], 1) ||
      !integer(row[1]) ||
      !optionalText(row[2]) ||
      !finite(row[3]) ||
      !finite(row[4]) ||
      !optionalText(row[5]) ||
      !integer(row[6]) ||
      !optionalText(row[7]) ||
      !optionalText(row[8]) ||
      !integer(row[9]) ||
      !integer(row[10]) ||
      !integer(row[11])
    ) {
      rejectedRows += 1
      continue
    }
    const [
      assetId,
      driverId,
      when,
      speed,
      inputX,
      trail,
      status,
      msg,
      extendedDescription,
      routeId,
      routePointNextId,
      routePointPrevId,
    ] = row
    const normalizedTrail = trail ?? ''
    positions.push({
      assetId,
      driverId,
      when: when ?? '',
      speed,
      inputX,
      trail: normalizedTrail,
      status,
      msg: msg ?? '',
      extendedDescription: extendedDescription ?? '',
      routeId,
      routePointNextId,
      routePointPrevId,
      ...coordinates(normalizedTrail),
    })
  }
  return {
    positions,
    telemetry: {
      state: rejectedRows
        ? 'incompatible'
        : positions.length
          ? 'available'
          : 'empty',
      receivedRows: raw.length,
      rejectedRows,
    },
  }
}
