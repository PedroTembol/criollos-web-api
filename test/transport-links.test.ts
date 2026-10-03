import { describe, expect, test } from 'bun:test'
import type { BootstrapData, RoutePoint } from '../server/utils/normalize'
import type { TrackingVehicleSnapshot } from '../server/utils/tracking'
import {
  normalizeTransportCoordinates,
  orderedTransportStops,
  parseTransportId,
  parseTransportSelection,
  resolveTransportSelection,
  searchResultDestination,
  transportMapLink,
  transportVehicleSignal,
} from '../app/utils/transportLinks'

const point = (
  id: number,
  routeId: number,
  markerId: number,
  order: number,
  direction = 0
): RoutePoint => ({
  id,
  routeId,
  markerId,
  order,
  direction,
  lat: 18_235_000,
  lng: -66_032_000,
  type: 'stop',
  distance: 0,
  angle: 0,
  seconds: 0,
})
const catalog: BootstrapData = {
  assets: [{ id: 23, groupId: 1, description: 'Unidad 23' }],
  markers: [
    {
      id: 123,
      groupId: 1,
      description: 'Plaza Palmer',
      lat: 18.235,
      lng: -66.032,
    },
  ],
  routes: [7, 9].map((id) => ({
    id,
    clientId: 151,
    description: `Ruta ${id}`,
    lineColor: '#0038A8',
    assetColorCode: '',
    directionStartName: 'Terminal',
    directionEndName: 'Plaza',
    svgFillColor1: '',
    svgFillColor2: '',
    isOpen: true,
    departureTimes: '',
  })),
  routePoints: [],
  stops: [
    point(5, 9, 123, 4),
    point(3, 9, 124, 2),
    point(4, 9, 125, 2),
    point(8, 9, 123, 0, 1),
  ],
  config: {},
  positions: [],
}
const vehicle = {
  assetId: 23,
  routeId: 9,
  when: '2026-10-05T13:00:00Z',
} as TrackingVehicleSnapshot

describe('search destinations', () => {
  test('opens routes, marker stops and vehicles from real search identifiers', () => {
    expect(searchResultDestination({ type: 'route', id: 'route-7' })).toBe(
      '/transporte?routeId=7'
    )
    expect(searchResultDestination({ type: 'stop', id: 'stop-123' })).toBe(
      '/transporte?stopId=123'
    )
    expect(searchResultDestination({ type: 'stop', id: 's-nearby-123' })).toBe(
      '/transporte?stopId=123'
    )
    expect(
      searchResultDestination({ type: 'vehicle', id: 'v-nearby-23' })
    ).toBe('/transporte?assetId=23')
  })
  test('prefers valid numeric metadata and handles unavailable IDs without NaN links', () => {
    expect(
      searchResultDestination({
        type: 'stop',
        id: 'stop-123',
        metadata: { stopId: '124' },
      })
    ).toBe('/transporte?stopId=124')
    expect(
      searchResultDestination({ type: 'stop', metadata: { markerId: 123 } })
    ).toBe('/transporte?stopId=123')
    expect(
      searchResultDestination({
        type: 'vehicle',
        id: 'route-23',
        metadata: { assetId: NaN },
      })
    ).toBe('/transporte')
    expect(searchResultDestination({ type: 'route', id: 'route-7junk' })).toBe(
      '/transporte'
    )
  })
  test('preserves and encodes feed queries without accepting an external redirect', () => {
    const target = searchResultDestination(
      { type: 'evento', title: 'Otro evento' },
      'Música & baile/Plaza'
    )
    expect(new URL(target, 'https://criollos.app').searchParams.get('q')).toBe(
      'Música & baile/Plaza'
    )
    expect(target.startsWith('/eventos?')).toBe(true)
    expect(
      searchResultDestination({ type: 'gastronomia', title: 'Café criollo' })
    ).toBe('/gastronomia?q=Caf%C3%A9+criollo')
    expect(searchResultDestination({ type: 'https://evil.example' })).toBe(
      '/discovery'
    )
    expect(searchResultDestination({ type: 'constructor' })).toBe('/discovery')
  })
})

describe('transport selection', () => {
  test('rejects malformed, ambiguous and unsafe numeric query IDs', () => {
    for (const value of [
      0,
      -1,
      NaN,
      Infinity,
      2.5,
      'NaN',
      '1e3',
      '0x12',
      '',
      ['7', '9'],
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(parseTransportId(value)).toBeNull()
    }
    expect(parseTransportId(['123'])).toBe(123)
    expect(parseTransportSelection({ routeId: 'NaN' }).invalid).toBe(true)
    expect(parseTransportSelection({}).invalid).toBe(false)
  })
  test('resolves a searched marker and the route that serves it', () => {
    const context = resolveTransportSelection(
      catalog,
      [],
      parseTransportSelection({ stopId: '123' })
    )
    expect(context.route?.id).toBe(9)
    expect(context.stop?.description).toBe('Plaza Palmer')
    expect(context.servingRouteIds).toEqual([9])
    expect(context.missing).toEqual([])
  })
  test('selects the reported vehicle route while retaining catalog vehicles without signals', () => {
    const withSignal = resolveTransportSelection(
      catalog,
      [vehicle],
      parseTransportSelection({ assetId: '23' })
    )
    expect(withSignal.route?.id).toBe(9)
    expect(withSignal.vehicle).toBe(vehicle)
    const noSignal = resolveTransportSelection(
      catalog,
      [],
      parseTransportSelection({ assetId: '23' })
    )
    expect(noSignal.asset?.description).toBe('Unidad 23')
    expect(noSignal.vehicle).toBeNull()
    expect(noSignal.missing).toEqual([])
  })
  test('reports unknown selections instead of silently selecting a different requested route', () => {
    const context = resolveTransportSelection(
      catalog,
      [],
      parseTransportSelection({ routeId: '999', stopId: '888', assetId: '777' })
    )
    expect(context.route).toBeNull()
    expect(context.missing).toEqual(['ruta', 'parada', 'vehículo'])
  })
})

describe('stops and map coordinates', () => {
  test('orders both directions with deterministic ties and preserves selected marker IDs', () => {
    const groups = orderedTransportStops(catalog, 9)
    expect(groups.map((group) => group.label)).toEqual([
      'Terminal → Plaza',
      'Plaza → Terminal',
    ])
    expect(groups[0]?.stops.map((stop) => stop.routePointId)).toEqual([3, 4, 5])
    expect(groups[1]?.stops[0]?.markerId).toBe(123)
  })
  test('handles markers in degrees and legacy points in microdegrees', () => {
    expect(normalizeTransportCoordinates(18.235, -66.032)).toEqual({
      lat: 18.235,
      lng: -66.032,
    })
    expect(normalizeTransportCoordinates(18_235_000, -66_032_000)).toEqual({
      lat: 18.235,
      lng: -66.032,
    })
    const stops = orderedTransportStops(catalog, 9)[0]!.stops
    expect(stops[0]?.coordinates).toEqual({ lat: 18.235, lng: -66.032 })
    expect(stops[2]?.name).toBe('Plaza Palmer')
    const map = new URL(stops[0]!.mapLink!)
    expect(map.origin).toBe('https://www.google.com')
    expect(map.searchParams.get('query')).toBe('18.235,-66.032')
  })
  test('does not publish misleading map links for malformed or missing coordinates', () => {
    for (const [lat, lng] of [
      [null, -66],
      [91, -66],
      [18, 181],
      [NaN, -66],
      [91_000_000, -66_000_000],
    ]) {
      expect(transportMapLink(lat, lng)).toBeNull()
    }
    const invalid = {
      ...catalog,
      stops: [{ ...point(1, 9, 999, 1), lat: NaN }],
    }
    expect(orderedTransportStops(invalid, 9)[0]?.stops[0]?.mapLink).toBeNull()
    expect(orderedTransportStops(invalid, 9)[0]?.stops[0]?.name).toBe(
      'Parada 999'
    )
  })
})

describe('telemetry ages', () => {
  test('ages vehicle timestamps independently of a refreshed response', () => {
    expect(
      transportVehicleSignal(vehicle, Date.parse('2026-10-05T13:01:00Z')).state
    ).toBe('live')
    expect(
      transportVehicleSignal(vehicle, Date.parse('2026-10-05T13:03:00Z'))
    ).toEqual({ state: 'stale', label: 'Señal anterior', ageSeconds: 180 })
  })
  test('keeps invalid and implausibly future timestamps unconfirmed', () => {
    expect(transportVehicleSignal({ when: '' }, Date.now()).state).toBe(
      'unknown'
    )
    expect(
      transportVehicleSignal(vehicle, Date.parse('2026-10-05T12:00:00Z')).state
    ).toBe('unknown')
  })
})
