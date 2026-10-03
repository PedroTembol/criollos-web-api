<script setup lang="ts">
import type { BootstrapData } from '../../server/utils/normalize'
import type { TrackingSnapshot } from '../../server/utils/tracking'
import {
  orderedTransportStops,
  parseTransportId,
  parseTransportSelection,
  resolveTransportSelection,
  transportMapLink,
  transportVehicleSignal,
} from '../utils/transportLinks'

type Catalog = BootstrapData & { fetchedAt?: string; stale?: boolean }
type Tracking = TrackingSnapshot & { stale?: boolean }

useHead({ title: 'Rutas y paradas de Caguas | Criollos' })
const route = useRoute()
const router = useRouter()
const headers = { Accept: 'application/json' }
const [catalogRequest, trackingRequest] = await Promise.all([
  useFetch<Catalog>('/api/v1/bootstrap', {
    key: 'transport-page-catalog',
    headers,
    transform: (value) => {
      if (
        !value ||
        !['assets', 'markers', 'routes', 'stops'].every((key) =>
          Array.isArray(value[key as keyof Catalog])
        )
      ) {
        throw new Error(
          'El catálogo de transporte no tiene el formato esperado'
        )
      }
      return value
    },
  }),
  useFetch<Tracking>('/api/v1/tracking', {
    key: 'transport-page-tracking',
    headers,
    transform: (value) => {
      if (!value || !Array.isArray(value.vehicles))
        throw new Error('La respuesta de señales no tiene el formato esperado')
      return value
    },
  }),
])
const {
  data: catalog,
  error: catalogError,
  pending: catalogPending,
  refresh: refreshCatalog,
} = catalogRequest
const {
  data: tracking,
  error: trackingError,
  pending: trackingPending,
  refresh: refreshTracking,
} = trackingRequest
const lastCatalog = shallowRef<Catalog | null>(null)
const lastTracking = shallowRef<Tracking | null>(null)
watch(
  catalog,
  (value) => {
    if (value) lastCatalog.value = value
  },
  { immediate: true }
)
watch(
  tracking,
  (value) => {
    if (value) lastTracking.value = value
  },
  { immediate: true }
)
const displayCatalog = computed(() => catalog.value ?? lastCatalog.value)
const displayTracking = computed(() => tracking.value ?? lastTracking.value)
const refreshing = ref(false)
const busy = computed(
  () => refreshing.value || catalogPending.value || trackingPending.value
)
const now = ref(Date.now())
const selection = computed(() => parseTransportSelection(route.query))
const context = computed(() =>
  displayCatalog.value
    ? resolveTransportSelection(
        displayCatalog.value,
        displayTracking.value?.vehicles ?? [],
        selection.value
      )
    : null
)
const selectedRoute = computed(() => context.value?.route ?? null)
const stopGroups = computed(() =>
  displayCatalog.value && selectedRoute.value
    ? orderedTransportStops(displayCatalog.value, selectedRoute.value.id)
    : []
)
const servingRoutes = computed(
  () =>
    displayCatalog.value?.routes.filter((item) =>
      context.value?.servingRouteIds.includes(item.id)
    ) ?? []
)
const visibleVehicles = computed(() =>
  (displayTracking.value?.vehicles ?? []).filter((vehicle) =>
    selectedRoute.value ? vehicle.routeId === selectedRoute.value.id : true
  )
)
const catalogStale = computed(() =>
  Boolean(catalogError.value || displayCatalog.value?.stale)
)
const signalsStale = computed(() =>
  Boolean(trackingError.value || displayTracking.value?.stale)
)
const selectedStopMap = computed(() =>
  context.value?.stop
    ? transportMapLink(context.value.stop.lat, context.value.stop.lng)
    : null
)

function formatTimestamp(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return 'Fecha sin confirmar'
  return new Intl.DateTimeFormat('es-PR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Puerto_Rico',
  }).format(new Date(value))
}

function vehicleSignal(vehicle: TrackingSnapshot['vehicles'][number]) {
  const signal = transportVehicleSignal(vehicle, now.value)
  // Cached responses or a failed refresh cannot confirm current telemetry.
  return signalsStale.value && signal.state === 'live'
    ? { ...signal, state: 'stale', label: 'Última señal guardada' }
    : signal
}

async function retryTransport() {
  if (busy.value) return
  refreshing.value = true
  try {
    await Promise.allSettled([refreshCatalog(), refreshTracking()])
  } finally {
    now.value = Date.now()
    refreshing.value = false
  }
}

function chooseRoute(event: Event) {
  const id = parseTransportId((event.target as HTMLSelectElement).value)
  if (id !== null)
    router.push({ path: '/transporte', query: { routeId: String(id) } })
}

let signalTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let catalogTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  // Pause network work in hidden tabs; re-evaluate ages without relabeling
  // cached positions as recent just because a response was fetched again.
  signalTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && !busy.value)
      void refreshTracking()
  }, 30_000)
  catalogTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && !busy.value)
      void refreshCatalog()
  }, 300_000)
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 15_000)
})
onBeforeUnmount(() => {
  clearInterval(signalTimer)
  clearInterval(catalogTimer)
  clearInterval(clockTimer)
})
</script>

<template>
  <div class="min-h-screen bg-blue-50/30">
    <header class="bg-[#0038A8] px-6 py-6 text-white">
      <nav
        aria-label="Navegación principal"
        class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"
      >
        <NuxtLink to="/" class="text-xl font-black"
          >🍍 Criollos <span class="text-[#FFD700]">Transporte</span></NuxtLink
        >
        <div class="flex flex-wrap gap-4 text-sm font-bold">
          <NuxtLink to="/cerca">Paradas cerca de ti</NuxtLink>
          <NuxtLink to="/discovery">Explorar Caguas</NuxtLink>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-6 py-8">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-900">
            Rutas y paradas de Caguas
          </h1>
          <p class="mt-2 text-slate-600">
            Consulta el recorrido y las últimas señales disponibles antes de
            salir.
          </p>
        </div>
        <button
          :disabled="busy"
          class="rounded-xl bg-[#0038A8] px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          @click="retryTransport"
        >
          {{ busy ? 'Actualizando…' : 'Actualizar información' }}
        </button>
      </div>
      <aside
        class="mb-6 rounded-2xl border border-blue-200 bg-white p-4 text-sm text-slate-700"
      >
        <p>
          <strong>Horario regular publicado, hora de Puerto Rico:</strong>
          trolley lunes a viernes, 7 a. m.–6 p. m.; Transcriollo lunes a
          viernes, 6 a. m.–6 p. m.
        </p>
        <p class="mt-2">
          Puede cambiar en días especiales.
          <a
            href="https://caguas.gov.pr/movilidad/"
            target="_blank"
            rel="noopener noreferrer"
            class="font-bold text-[#0038A8] underline"
            >Ver horarios y avisos del municipio</a
          >
        </p>
      </aside>

      <p
        v-if="catalogPending && !displayCatalog"
        role="status"
        class="mb-6 rounded-xl bg-white p-5"
      >
        Cargando rutas y paradas…
      </p>
      <div
        v-if="catalogError"
        role="alert"
        class="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5"
      >
        <h2 class="font-bold">No pudimos actualizar el catálogo</h2>
        <p class="mt-1">
          {{
            displayCatalog
              ? 'Mostramos las últimas rutas cargadas; los detalles pueden haber cambiado.'
              : 'No podemos confirmar las rutas ahora. Intenta de nuevo.'
          }}
        </p>
        <button
          :disabled="busy"
          class="mt-3 font-bold text-[#0038A8] underline disabled:opacity-60"
          @click="retryTransport"
        >
          Reintentar catálogo
        </button>
      </div>

      <template v-if="displayCatalog">
        <p
          v-if="displayCatalog.stale"
          role="status"
          class="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          El catálogo es información anterior: la fuente no pudo actualizarse.
          Verifica los detalles con el municipio.
        </p>
        <div
          v-if="selection.invalid || context?.missing.length"
          role="alert"
          class="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5"
        >
          <h2 class="font-bold">No encontramos la selección solicitada</h2>
          <p class="mt-1">
            {{
              selection.invalid
                ? 'El enlace tiene un identificador inválido.'
                : `La selección de ${context?.missing.join(', ')} no está en el catálogo disponible.`
            }}
            Puedes elegir otra ruta abajo.
          </p>
          <NuxtLink
            to="/transporte"
            class="mt-3 inline-block font-bold text-[#0038A8] underline"
            >Ver todas las rutas</NuxtLink
          >
        </div>

        <section
          v-if="context?.stop"
          aria-labelledby="selected-stop-title"
          class="mb-6 rounded-2xl border border-blue-200 bg-white p-5"
        >
          <p class="text-sm font-bold text-[#0038A8]">
            Parada seleccionada · #{{ context.stop.id }}
          </p>
          <h2 id="selected-stop-title" class="mt-1 text-2xl font-black">
            {{ context.stop.description }}
          </h2>
          <div class="mt-4 flex flex-wrap gap-3">
            <NuxtLink
              v-for="servingRoute in servingRoutes"
              :key="servingRoute.id"
              :to="{
                path: '/transporte',
                query: {
                  routeId: String(servingRoute.id),
                  stopId: String(context.stop.id),
                },
              }"
              class="rounded-xl border border-blue-200 px-3 py-2 font-bold text-[#0038A8]"
              >{{
                servingRoute.description || `Ruta ${servingRoute.id}`
              }}</NuxtLink
            >
            <a
              v-if="selectedStopMap"
              :href="selectedStopMap"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-xl bg-blue-50 px-3 py-2 font-bold text-[#0038A8]"
              >Abrir parada en mapas</a
            >
          </div>
          <p v-if="!servingRoutes.length" class="mt-3 text-sm text-slate-600">
            El catálogo no indica una ruta para esta parada.
          </p>
          <p v-if="!selectedStopMap" class="mt-3 text-sm text-slate-600">
            La ubicación de esta parada no está confirmada.
          </p>
        </section>

        <section
          v-if="
            selection.assetId !== null && (context?.asset || context?.vehicle)
          "
          aria-labelledby="selected-vehicle-title"
          class="mb-6 rounded-2xl border border-blue-200 bg-white p-5"
        >
          <p class="text-sm font-bold text-[#0038A8]">
            Vehículo seleccionado · #{{ selection.assetId }}
          </p>
          <h2 id="selected-vehicle-title" class="mt-1 text-2xl font-black">
            {{ context?.asset?.description || context?.vehicle?.label }}
          </h2>
          <p v-if="!context?.vehicle" class="mt-3 text-slate-600">
            No recibimos una señal para este vehículo. Su ubicación y su ruta
            actual no están confirmadas.
          </p>
          <p v-else class="mt-3 text-slate-600">
            {{ vehicleSignal(context.vehicle).label }} · reportada
            {{ formatTimestamp(context.vehicle.when) }}.
          </p>
        </section>

        <section
          class="mb-6 rounded-2xl border border-blue-200 bg-white p-5"
          aria-labelledby="route-details-title"
        >
          <label for="transport-route" class="mb-2 block font-bold"
            >Elige una ruta</label
          >
          <select
            id="transport-route"
            :value="selectedRoute?.id ?? ''"
            class="w-full rounded-xl border border-slate-300 bg-white p-3"
            @change="chooseRoute"
          >
            <option disabled value="">Selecciona una ruta</option>
            <option
              v-for="item in displayCatalog.routes"
              :key="item.id"
              :value="item.id"
            >
              {{ item.description || `Ruta ${item.id}` }} · #{{ item.id }}
            </option>
          </select>
          <p v-if="!displayCatalog.routes.length" class="mt-4 text-slate-600">
            No recibimos rutas en el catálogo disponible.
          </p>
          <template v-if="selectedRoute">
            <h2 id="route-details-title" class="mt-5 text-2xl font-black">
              {{ selectedRoute.description || `Ruta ${selectedRoute.id}` }}
            </h2>
            <p
              v-if="
                selectedRoute.directionStartName ||
                selectedRoute.directionEndName
              "
              class="mt-2 text-slate-600"
            >
              {{ selectedRoute.directionStartName }} ↔
              {{ selectedRoute.directionEndName }}
            </p>
            <p class="mt-2 text-sm text-slate-500">
              Catálogo consultado: {{ formatTimestamp(displayCatalog.fetchedAt)
              }}{{ catalogStale ? ' · Información anterior' : '' }}. Las paradas
              siguen el orden del recorrido; no representan una hora de llegada.
            </p>
          </template>
        </section>

        <section
          v-if="selectedRoute"
          aria-labelledby="transport-stops-title"
          class="mb-6"
        >
          <h2 id="transport-stops-title" class="mb-4 text-2xl font-black">
            Paradas del recorrido
          </h2>
          <p
            v-if="!stopGroups.length"
            class="rounded-xl bg-white p-5 text-slate-600"
          >
            El catálogo no incluye paradas para esta ruta.
          </p>
          <div
            v-for="group in stopGroups"
            :key="group.direction"
            class="mb-5 rounded-2xl border border-blue-200 bg-white p-5"
          >
            <h3 class="mb-4 text-lg font-bold">{{ group.label }}</h3>
            <ol class="space-y-3">
              <li
                v-for="(stop, index) in group.stops"
                :key="stop.routePointId"
                class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                :class="
                  stop.markerId === selection.stopId
                    ? 'border-[#0038A8] bg-blue-50'
                    : 'border-slate-100'
                "
              >
                <NuxtLink
                  :to="{
                    path: '/transporte',
                    query: {
                      routeId: String(selectedRoute.id),
                      stopId: String(stop.markerId),
                    },
                  }"
                  class="font-bold text-[#0038A8]"
                  :aria-current="
                    stop.markerId === selection.stopId ? 'location' : undefined
                  "
                  >{{ index + 1 }}. {{ stop.name }}
                  <span
                    v-if="stop.markerId === selection.stopId"
                    class="text-sm font-normal"
                    >· seleccionada</span
                  ></NuxtLink
                >
                <a
                  v-if="stop.mapLink"
                  :href="stop.mapLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm font-bold text-[#0038A8] underline"
                  :aria-label="`Abrir ${stop.name} en mapas`"
                  >Ver en mapas</a
                >
                <span v-else class="text-sm text-slate-500"
                  >Ubicación sin confirmar</span
                >
              </li>
            </ol>
          </div>
        </section>
      </template>

      <section
        aria-labelledby="transport-signals-title"
        class="rounded-2xl border border-blue-200 bg-white p-5"
      >
        <h2 id="transport-signals-title" class="text-2xl font-black">
          Últimas señales{{ selectedRoute ? ' de esta ruta' : '' }}
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          Se consulta cada 30 segundos mientras esta página está visible. Una
          señal anterior no confirma la ubicación actual ni el servicio.
        </p>
        <p
          v-if="trackingPending && !displayTracking"
          role="status"
          class="mt-4"
        >
          Consultando señales…
        </p>
        <div
          v-if="trackingError"
          role="alert"
          class="mt-4 rounded-xl bg-amber-50 p-4"
        >
          <p class="font-bold">No pudimos actualizar las señales</p>
          <p>
            {{
              displayTracking
                ? 'Mostramos la última información guardada; no podemos confirmar posiciones actuales.'
                : 'La información de vehículos no está disponible ahora.'
            }}
          </p>
          <button
            :disabled="busy"
            class="mt-2 font-bold text-[#0038A8] underline disabled:opacity-60"
            @click="retryTransport"
          >
            Reintentar señales
          </button>
        </div>
        <p
          v-else-if="displayTracking?.stale"
          role="status"
          class="mt-4 rounded-xl bg-amber-50 p-4"
        >
          La fuente no pudo actualizarse. Estas señales son información
          anterior.
        </p>
        <p
          v-if="displayTracking && !visibleVehicles.length"
          class="mt-4 rounded-xl bg-slate-50 p-4"
        >
          No recibimos señales{{ selectedRoute ? ' para esta ruta' : '' }} en
          esta consulta. Esto no confirma una interrupción del servicio.
          Comprueba el horario y los avisos municipales.
        </p>
        <ul v-if="visibleVehicles.length" class="mt-4 space-y-3">
          <li
            v-for="vehicle in visibleVehicles"
            :key="vehicle.assetId"
            class="rounded-xl border border-slate-200 p-4"
          >
            <NuxtLink
              :to="{
                path: '/transporte',
                query: {
                  routeId: String(vehicle.routeId),
                  assetId: String(vehicle.assetId),
                },
              }"
              class="font-bold text-[#0038A8]"
              >{{ vehicle.label }}</NuxtLink
            >
            <p
              class="mt-1 text-sm"
              :class="
                vehicleSignal(vehicle).state === 'live'
                  ? 'text-emerald-700'
                  : 'text-amber-800'
              "
            >
              {{ vehicleSignal(vehicle).label }} · reportada
              {{ formatTimestamp(vehicle.when) }}
            </p>
            <p
              v-if="vehicle.nextStop?.name"
              class="mt-1 text-sm text-slate-600"
            >
              Próxima parada reportada: {{ vehicle.nextStop.name }}
            </p>
            <a
              v-if="transportMapLink(vehicle.lat, vehicle.lng)"
              :href="transportMapLink(vehicle.lat, vehicle.lng)!"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-block text-sm font-bold text-[#0038A8] underline"
              >Ver ubicación reportada en mapas</a
            >
          </li>
        </ul>
        <p v-if="displayTracking" class="mt-4 text-xs text-slate-500">
          Consulta de señales: {{ formatTimestamp(displayTracking.fetchedAt) }}.
          La fecha de cada vehículo indica cuándo se reportó su señal.
        </p>
      </section>
    </main>
  </div>
</template>
