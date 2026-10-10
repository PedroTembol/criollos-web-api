// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'
import { transformWithEsbuild } from 'vite'
import * as Vue from 'vue'
import * as Icons from 'lucide-vue-next'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import * as transportHelpers from '../app/utils/transportLinks'

// Compile the actual page with its own template. Only Nuxt's data/router
// boundaries are supplied here; all selection, aging and retry logic is real.
let createPage: (...args: any[]) => Vue.Component
beforeAll(async () => {
  const source = readFileSync('app/pages/transporte.vue', 'utf8')
  const { descriptor } = parse(source, { filename: 'transporte.vue' })
  const script = compileScript(descriptor, {
    id: 'transport-page-test',
    inlineTemplate: true,
  })
  const { code } = await transformWithEsbuild(script.content, 'transporte.ts', {
    loader: 'ts',
  })
  const executable = code
    .replace(
      /import\s*\{([^}]+)\}\s*from\s*["']lucide-vue-next["'];?/g,
      (_, names: string) =>
        `const {${names.replace(/\s+as\s+/g, ':')}} = icons;`
    )
    .replace(
      /import\s*\{([^}]+)\}\s*from\s*["']vue["'];?/g,
      (_, names: string) => `const {${names.replace(/\s+as\s+/g, ':')}} = vue;`
    )
    .replace(
      /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/utils\/transportLinks["'];?/g,
      (_, names: string) => `const {${names}} = helpers;`
    )
    .replace(/export default/, 'return')
  createPage = new Function(
    'vue',
    'icons',
    'helpers',
    'useRoute',
    'useRouter',
    'useHead',
    'useFetch',
    `const { computed, shallowRef, watch, ref, onMounted, onBeforeUnmount } = vue;\n${executable}`
  ) as typeof createPage
})

const catalog = {
  assets: [{ id: 23, description: 'Unidad 23' }],
  markers: [
    { id: 123, description: 'Plaza Palmer', lat: 18.235, lng: -66.032 },
  ],
  routes: [
    {
      id: 7,
      description: 'Ruta Centro',
      directionStartName: 'Terminal',
      directionEndName: 'Plaza',
    },
    { id: 9, description: 'Ruta Norte' },
  ],
  stops: [
    {
      id: 2,
      markerId: 123,
      routeId: 7,
      direction: 0,
      order: 2,
      lat: 18_235_000,
      lng: -66_032_000,
    },
  ],
  fetchedAt: '2026-10-05T13:00:00Z',
}
const tracking = {
  vehicles: [
    {
      assetId: 23,
      label: 'Unidad 23',
      routeId: 7,
      when: '2026-10-05T13:00:00Z',
      lat: 18.235,
      lng: -66.032,
      nextStop: { name: 'Plaza Palmer' },
    },
  ],
  fetchedAt: '2026-10-05T13:00:00Z',
}
type MockRequest = {
  data: Vue.Ref<any>
  pending: Vue.Ref<boolean>
  error: Vue.Ref<any>
  refresh: ReturnType<typeof vi.fn>
}
function request(data: unknown, pending = false): MockRequest {
  return {
    data: Vue.ref(data),
    pending: Vue.ref(pending),
    error: Vue.ref(null),
    refresh: vi.fn(async () => {}),
  }
}
const wrappers: VueWrapper[] = []
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function page(
  options: {
    query?: Record<string, unknown>
    catalog?: MockRequest
    tracking?: MockRequest
  } = {}
) {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-10-05T13:01:00Z'))
  const currentRoute = Vue.reactive({ query: options.query ?? {} })
  const router = {
    push: vi.fn(async (target: { query: Record<string, unknown> }) => {
      currentRoute.query = target.query
    }),
  }
  const catalogRequest = options.catalog ?? request(catalog)
  const trackingRequest = options.tracking ?? request(tracking)
  const useFetch = vi.fn((url: string) =>
    url.endsWith('bootstrap') ? catalogRequest : trackingRequest
  )
  const component = createPage(
    Vue,
    Icons,
    transportHelpers,
    () => currentRoute,
    () => router,
    () => {},
    useFetch
  )
  const Link = Vue.defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () =>
        Vue.h(
          'a',
          {
            href:
              typeof props.to === 'string'
                ? props.to
                : `${props.to.path}?${new URLSearchParams(props.to.query)}`,
          },
          slots.default?.()
        )
    },
  })
  const host = Vue.defineComponent({
    setup: () => () =>
      Vue.h(Vue.Suspense, null, { default: () => Vue.h(component) }),
  })
  const wrapper = mount(host, { global: { components: { NuxtLink: Link } } })
  wrappers.push(wrapper)
  await flushPromises()
  return {
    wrapper,
    currentRoute,
    router,
    catalogRequest,
    trackingRequest,
    useFetch,
  }
}

describe('transport page interactions', () => {
  test('renders a searched stop, safe map links and ordered route context', async () => {
    const { wrapper, useFetch } = await page({ query: { stopId: '123' } })
    expect(useFetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/bootstrap',
      '/api/v1/tracking',
    ])
    expect(wrapper.find('#selected-stop-title').text()).toBe('Plaza Palmer')
    expect(wrapper.find('#route-details-title').text()).toBe('Ruta Centro')
    const maps = wrapper
      .findAll('a')
      .filter((link) =>
        link.attributes('href')?.startsWith('https://www.google.com/maps/')
      )
    expect(maps.length).toBeGreaterThan(0)
    expect(
      new URL(maps[0]!.attributes('href')!).searchParams.get('query')
    ).toBe('18.235,-66.032')
    expect(wrapper.text()).toContain('no representa una hora de llegada')
  })
  test('changes route and follows restored query state when navigating back', async () => {
    const { wrapper, router, currentRoute } = await page({
      query: { routeId: '7', stopId: '123' },
    })
    await wrapper.find('select').setValue('9')
    expect(router.push).toHaveBeenCalledWith({
      path: '/transporte',
      query: { routeId: '9' },
    })
    expect(wrapper.find('#route-details-title').text()).toBe('Ruta Norte')
    currentRoute.query = { routeId: '7', stopId: '123' }
    await Vue.nextTick()
    expect(wrapper.find('#selected-stop-title').text()).toBe('Plaza Palmer')
    expect(wrapper.find('#route-details-title').text()).toBe('Ruta Centro')
  })
  test('makes invalid and unknown selections legible', async () => {
    const invalid = await page({ query: { routeId: 'NaN' } })
    expect(invalid.wrapper.text()).toContain('identificador inválido')
    const missing = await page({ query: { routeId: '999' } })
    expect(missing.wrapper.text()).toContain(
      'selección de ruta no está en el catálogo'
    )
    expect(missing.wrapper.find('#route-details-title').text()).toBe(
      'Consulta un recorrido'
    )
  })
  test('shows initial loading and empty telemetry without declaring an outage', async () => {
    const catalogRequest = request(null, true)
    const trackingRequest = request(null, true)
    const { wrapper } = await page({
      catalog: catalogRequest,
      tracking: trackingRequest,
    })
    expect(wrapper.text()).toContain('Cargando rutas y paradas')
    expect(wrapper.text()).toContain('Consultando señales')
    catalogRequest.data.value = catalog
    trackingRequest.data.value = { ...tracking, vehicles: [] }
    catalogRequest.pending.value = false
    trackingRequest.pending.value = false
    await Vue.nextTick()
    expect(wrapper.text()).toContain('No recibimos señales para esta ruta')
    expect(wrapper.text()).toContain('no confirma una interrupción')
  })
  test('retains previous data after failure, labels it honestly, and retries once on a double tap', async () => {
    const { wrapper, catalogRequest, trackingRequest } = await page()
    catalogRequest.data.value = null
    catalogRequest.error.value = new Error('offline')
    trackingRequest.data.value = null
    trackingRequest.error.value = new Error('offline')
    await Vue.nextTick()
    expect(wrapper.text()).toContain('últimas rutas cargadas')
    expect(wrapper.text()).toContain('Última señal guardada')
    expect(wrapper.find('#route-details-title').text()).toBe('Ruta Centro')
    let finish!: () => void
    catalogRequest.refresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    const button = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Actualizar información')!
    await button.trigger('click')
    await button.trigger('click')
    expect(catalogRequest.refresh).toHaveBeenCalledTimes(1)
    expect(trackingRequest.refresh).toHaveBeenCalledTimes(1)
    expect(button.attributes('disabled')).toBeDefined()
    catalogRequest.data.value = catalog
    catalogRequest.error.value = null
    trackingRequest.data.value = tracking
    trackingRequest.error.value = null
    finish()
    await flushPromises()
    expect(wrapper.text()).not.toContain('No pudimos actualizar')
    expect(wrapper.text()).toContain('Señal reciente')
  })
  test('ages a previously recent signal and stops timers when leaving the page', async () => {
    const { wrapper, trackingRequest } = await page()
    expect(wrapper.text()).toContain('Señal reciente')
    await vi.advanceTimersByTimeAsync(120_000)
    await Vue.nextTick()
    expect(wrapper.text()).toContain('Señal anterior')
    wrapper.unmount()
    const count = trackingRequest.refresh.mock.calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(trackingRequest.refresh.mock.calls.length).toBe(count)
  })
  test('pauses signal polling in a hidden tab', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('hidden')
    const { trackingRequest } = await page()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(trackingRequest.refresh).not.toHaveBeenCalled()
    visibility.mockReturnValue('visible')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(trackingRequest.refresh).toHaveBeenCalledTimes(1)
  })
})
