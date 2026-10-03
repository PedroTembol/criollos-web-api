<script setup lang="ts">
import {
  AlertTriangle,
  ArrowUpRight,
  Bus,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  Route as RouteIcon,
} from 'lucide-vue-next'
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
  <main class="page-wrap py-8 md:py-12">
    <section class="transport-intro" aria-labelledby="transport-title">
      <div>
        <p class="transport-eyebrow">Muévete por Caguas</p>
        <h1 id="transport-title" class="brand-display transport-title">
          Rutas y paradas
        </h1>
        <p class="transport-lead">
          Elige tu ruta, encuentra una parada y consulta la última señal de las
          unidades antes de salir.
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <NuxtLink to="/cerca" class="btn-primary">
          <MapPin class="h-4 w-4" aria-hidden="true" />
          Paradas cerca de ti
        </NuxtLink>
        <button
          type="button"
          :disabled="busy"
          class="btn-secondary disabled:opacity-60"
          @click="retryTransport"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="{ 'animate-spin': busy }"
            aria-hidden="true"
          />
          {{ busy ? 'Actualizando…' : 'Actualizar información' }}
        </button>
      </div>
    </section>

    <p
      v-if="catalogPending && !displayCatalog"
      role="status"
      class="surface mb-6 p-5 text-[var(--color-muted)]"
    >
      Cargando rutas y paradas…
    </p>
    <div v-if="catalogError" role="alert" class="transport-notice mb-6">
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <h2 class="font-bold">No pudimos actualizar el catálogo</h2>
        <p class="mt-1">
          {{
            displayCatalog
              ? 'Mostramos las últimas rutas cargadas; los detalles pueden haber cambiado.'
              : 'No podemos confirmar las rutas ahora. Intenta de nuevo.'
          }}
        </p>
        <button
          type="button"
          :disabled="busy"
          class="transport-text-link disabled:opacity-60"
          @click="retryTransport"
        >
          Reintentar catálogo
        </button>
      </div>
    </div>

    <template v-if="displayCatalog">
      <p
        v-if="displayCatalog.stale && !catalogError"
        role="status"
        class="transport-notice mb-6"
      >
        El catálogo es información anterior: la fuente no pudo actualizarse.
        Verifica los detalles con el municipio.
      </p>
      <div
        v-if="selection.invalid || context?.missing.length"
        role="alert"
        class="transport-notice mb-6"
      >
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h2 class="font-bold">No encontramos la selección solicitada</h2>
          <p class="mt-1">
            {{
              selection.invalid
                ? 'El enlace tiene un identificador inválido.'
                : `La selección de ${context?.missing.join(', ')} no está en el catálogo disponible.`
            }}
            Puedes elegir otra ruta abajo.
          </p>
          <NuxtLink to="/transporte" class="transport-text-link"
            >Ver todas las rutas</NuxtLink
          >
        </div>
      </div>

      <section
        class="surface route-selector mb-6"
        aria-labelledby="route-details-title"
      >
        <div class="route-selector-field">
          <label
            for="transport-route"
            class="mb-2 flex items-center gap-2 font-bold"
          >
            <RouteIcon
              class="h-5 w-5 text-[var(--color-blue)]"
              aria-hidden="true"
            />
            Elige una ruta
          </label>
          <select
            id="transport-route"
            :value="selectedRoute?.id ?? ''"
            class="field"
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
        </div>
        <div class="min-w-0">
          <template v-if="selectedRoute">
            <p class="transport-eyebrow">Ruta #{{ selectedRoute.id }}</p>
            <h2
              id="route-details-title"
              class="brand-display text-2xl font-bold"
            >
              {{ selectedRoute.description || `Ruta ${selectedRoute.id}` }}
            </h2>
            <p
              v-if="
                selectedRoute.directionStartName ||
                selectedRoute.directionEndName
              "
              class="mt-2 text-[var(--color-muted)]"
            >
              {{ selectedRoute.directionStartName }} ↔
              {{ selectedRoute.directionEndName }}
            </p>
          </template>
          <h2 v-else id="route-details-title" class="font-bold">
            Consulta un recorrido
          </h2>
          <p
            v-if="!displayCatalog.routes.length"
            class="mt-2 text-[var(--color-muted)]"
          >
            No recibimos rutas en el catálogo disponible.
          </p>
          <p class="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
            Catálogo consultado: {{ formatTimestamp(displayCatalog.fetchedAt)
            }}{{ catalogStale ? ' · Información anterior' : '' }}.
          </p>
        </div>
      </section>

      <section
        v-if="context?.stop"
        aria-labelledby="selected-stop-title"
        class="surface selected-transport mb-6 p-5 md:p-6"
      >
        <p class="transport-eyebrow">
          Parada seleccionada · #{{ context.stop.id }}
        </p>
        <h2 id="selected-stop-title" class="brand-display text-2xl font-bold">
          {{ context.stop.description }}
        </h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <a
            v-if="selectedStopMap"
            :href="selectedStopMap"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary"
          >
            <MapPin class="h-4 w-4" aria-hidden="true" />
            Abrir parada en mapas
            <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
          </a>
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
            class="btn-secondary"
          >
            <Bus class="h-4 w-4 shrink-0" aria-hidden="true" />
            {{ servingRoute.description || `Ruta ${servingRoute.id}` }}
          </NuxtLink>
        </div>
        <p
          v-if="!servingRoutes.length"
          class="mt-3 text-sm text-[var(--color-muted)]"
        >
          El catálogo no indica una ruta para esta parada.
        </p>
        <p
          v-if="!selectedStopMap"
          class="mt-3 text-sm text-[var(--color-muted)]"
        >
          La ubicación de esta parada no está confirmada.
        </p>
      </section>

      <section
        v-if="
          selection.assetId !== null && (context?.asset || context?.vehicle)
        "
        aria-labelledby="selected-vehicle-title"
        class="surface selected-transport mb-6 p-5 md:p-6"
      >
        <p class="transport-eyebrow">
          Vehículo seleccionado · #{{ selection.assetId }}
        </p>
        <h2
          id="selected-vehicle-title"
          class="brand-display text-2xl font-bold"
        >
          {{ context?.asset?.description || context?.vehicle?.label }}
        </h2>
        <p v-if="!context?.vehicle" class="mt-3 text-[var(--color-muted)]">
          No recibimos una señal para este vehículo. Su ubicación y su ruta
          actual no están confirmadas.
        </p>
        <p v-else class="mt-3 text-[var(--color-muted)]">
          {{ vehicleSignal(context.vehicle).label }} · reportada
          {{ formatTimestamp(context.vehicle.when) }}.
        </p>
      </section>
    </template>

    <div class="transport-columns">
      <section
        v-if="selectedRoute"
        aria-labelledby="transport-stops-title"
        class="min-w-0"
      >
        <div class="mb-5">
          <h2
            id="transport-stops-title"
            class="brand-display text-2xl font-bold"
          >
            Paradas del recorrido
          </h2>
          <p class="mt-2 text-sm text-[var(--color-muted)]">
            En orden de recorrido, por dirección. Elige una parada para ver sus
            rutas o abrirla en mapas.
          </p>
        </div>
        <p
          v-if="!stopGroups.length"
          class="surface p-5 text-[var(--color-muted)]"
        >
          El catálogo no incluye paradas para esta ruta.
        </p>
        <section
          v-for="group in stopGroups"
          :key="group.direction"
          class="surface mb-5 overflow-hidden"
          :aria-label="group.label"
        >
          <div class="route-group-heading">
            <RouteIcon
              class="h-5 w-5 shrink-0 text-[var(--color-blue)]"
              aria-hidden="true"
            />
            <h3 class="font-bold">{{ group.label }}</h3>
            <span class="ml-auto shrink-0 text-xs text-[var(--color-muted)]"
              >{{ group.stops.length }}
              {{ group.stops.length === 1 ? 'parada' : 'paradas' }}</span
            >
          </div>
          <ol class="stop-timeline">
            <li
              v-for="(stop, index) in group.stops"
              :key="stop.routePointId"
              class="transport-stop"
              :class="{ 'is-selected': stop.markerId === selection.stopId }"
            >
              <span class="stop-number" aria-hidden="true">{{
                index + 1
              }}</span>
              <div class="min-w-0 flex-1">
                <NuxtLink
                  :to="{
                    path: '/transporte',
                    query: {
                      routeId: String(selectedRoute.id),
                      stopId: String(stop.markerId),
                    },
                  }"
                  class="stop-name"
                  :aria-current="
                    stop.markerId === selection.stopId ? 'location' : undefined
                  "
                >
                  {{ stop.name }}
                  <span
                    v-if="stop.markerId === selection.stopId"
                    class="mt-0.5 block text-xs font-normal"
                    >Parada seleccionada</span
                  >
                </NuxtLink>
                <span
                  v-if="!stop.mapLink"
                  class="block text-xs text-[var(--color-muted)]"
                  >Ubicación sin confirmar</span
                >
              </div>
              <a
                v-if="stop.mapLink"
                :href="stop.mapLink"
                target="_blank"
                rel="noopener noreferrer"
                class="stop-map"
                :aria-label="`Abrir ${stop.name} en mapas`"
              >
                <MapPin class="h-4 w-4" aria-hidden="true" />
                <span>Mapa</span>
              </a>
            </li>
          </ol>
        </section>
        <p class="text-xs leading-relaxed text-[var(--color-muted)]">
          El orden de las paradas no representa una hora de llegada.
        </p>
      </section>

      <div
        class="min-w-0 space-y-5"
        :class="{ 'lg:col-span-2': !selectedRoute }"
      >
        <section
          aria-labelledby="transport-signals-title"
          class="surface p-5 md:p-6"
        >
          <div class="mb-2 flex items-center gap-2">
            <Radio
              class="h-5 w-5 text-[var(--color-blue)]"
              aria-hidden="true"
            />
            <h2
              id="transport-signals-title"
              class="brand-display text-xl font-bold"
            >
              Últimas señales{{ selectedRoute ? ' de esta ruta' : '' }}
            </h2>
          </div>
          <p class="text-sm leading-relaxed text-[var(--color-muted)]">
            Consulta automática cada 30 segundos mientras ves esta página. Una
            señal anterior no confirma la ubicación actual ni el servicio.
          </p>
          <p
            v-if="trackingPending && !displayTracking"
            role="status"
            class="mt-4 text-[var(--color-muted)]"
          >
            Consultando señales…
          </p>
          <div v-if="trackingError" role="alert" class="transport-notice mt-4">
            <div>
              <p class="font-bold">No pudimos actualizar las señales</p>
              <p class="mt-1">
                {{
                  displayTracking
                    ? 'Mostramos la última información guardada; no podemos confirmar posiciones actuales.'
                    : 'La información de vehículos no está disponible ahora.'
                }}
              </p>
              <button
                type="button"
                :disabled="busy"
                class="transport-text-link disabled:opacity-60"
                @click="retryTransport"
              >
                Reintentar señales
              </button>
            </div>
          </div>
          <p
            v-else-if="displayTracking?.stale"
            role="status"
            class="transport-notice mt-4"
          >
            La fuente no pudo actualizarse. Estas señales son información
            anterior.
          </p>
          <p
            v-if="displayTracking && !visibleVehicles.length"
            class="mt-4 rounded-xl bg-[var(--color-cream)] p-4 text-sm leading-relaxed text-[var(--color-muted)]"
          >
            No recibimos señales{{ selectedRoute ? ' para esta ruta' : '' }} en
            esta consulta. Esto no confirma una interrupción del servicio.
            Comprueba el horario y los avisos municipales.
          </p>
          <ul v-if="visibleVehicles.length" class="mt-5 space-y-3">
            <li
              v-for="vehicle in visibleVehicles"
              :key="vehicle.assetId"
              class="signal-card"
            >
              <NuxtLink
                :to="{
                  path: '/transporte',
                  query: {
                    routeId: String(vehicle.routeId),
                    assetId: String(vehicle.assetId),
                  },
                }"
                class="signal-name"
              >
                <Bus class="h-4 w-4 shrink-0" aria-hidden="true" />
                {{ vehicle.label }}
              </NuxtLink>
              <p
                class="signal-status"
                :class="
                  vehicleSignal(vehicle).state === 'live'
                    ? 'signal-recent'
                    : 'signal-previous'
                "
              >
                {{ vehicleSignal(vehicle).label }}
              </p>
              <p class="mt-2 text-xs text-[var(--color-muted)]">
                Reportada {{ formatTimestamp(vehicle.when) }}
              </p>
              <p
                v-if="vehicle.nextStop?.name"
                class="mt-2 text-sm text-[var(--color-muted)]"
              >
                Próxima parada reportada:
                <span class="font-semibold text-[var(--color-ink)]">{{
                  vehicle.nextStop.name
                }}</span>
              </p>
              <a
                v-if="transportMapLink(vehicle.lat, vehicle.lng)"
                :href="transportMapLink(vehicle.lat, vehicle.lng)!"
                target="_blank"
                rel="noopener noreferrer"
                class="transport-text-link text-sm"
              >
                Ver ubicación reportada en mapas
                <ArrowUpRight class="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </li>
          </ul>
          <p
            v-if="displayTracking"
            class="mt-5 text-xs leading-relaxed text-[var(--color-muted)]"
          >
            Consulta de señales:
            {{ formatTimestamp(displayTracking.fetchedAt) }}. La fecha de cada
            vehículo indica cuándo se reportó su señal.
          </p>
        </section>

        <aside
          class="transport-schedule"
          aria-labelledby="transport-schedule-title"
        >
          <div class="flex items-center gap-2">
            <Clock3 class="h-5 w-5" aria-hidden="true" />
            <h2
              id="transport-schedule-title"
              class="brand-display text-xl font-bold"
            >
              Antes de salir
            </h2>
          </div>
          <p class="mt-3 text-sm leading-relaxed">
            Horario regular publicado, hora de Puerto Rico.
          </p>
          <dl class="mt-4 space-y-3 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <dt class="font-bold">Trolley</dt>
              <dd>Lun.–vie., 7 a. m.–6 p. m.</dd>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-1">
              <dt class="font-bold">Transcriollo</dt>
              <dd>Lun.–vie., 6 a. m.–6 p. m.</dd>
            </div>
          </dl>
          <p class="mt-4 text-sm leading-relaxed">
            Puede cambiar en días especiales. Confirma el horario y los avisos
            del municipio.
          </p>
          <a
            href="https://caguas.gov.pr/movilidad/"
            target="_blank"
            rel="noopener noreferrer"
            class="schedule-link"
            >Ver horarios y avisos
            <ArrowUpRight class="h-4 w-4" aria-hidden="true"
          /></a>
        </aside>
      </div>
    </div>
  </main>
</template>

<style scoped>
.transport-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.transport-eyebrow {
  margin-bottom: 0.5rem;
  color: var(--color-blue);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.transport-title {
  font-size: clamp(2.35rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.08;
}
.transport-lead {
  max-width: 36rem;
  margin-top: 1rem;
  color: var(--color-muted);
  font-size: 1.05rem;
  line-height: 1.6;
}
.transport-notice {
  display: flex;
  gap: 0.75rem;
  border: 1px solid var(--color-ochre);
  border-radius: var(--radius);
  background: var(--color-ochre-soft);
  color: var(--color-warning);
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.6;
}
.transport-text-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-navy);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.route-selector {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem;
}
.selected-transport {
  border-left: 4px solid var(--color-blue);
}
.transport-columns {
  display: grid;
  gap: 1.75rem;
  align-items: start;
}
.route-group-heading {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-cream);
}
.stop-timeline {
  padding: 0.5rem 1.1rem;
}
.transport-stop {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0;
}
.transport-stop + .transport-stop {
  border-top: 1px solid var(--color-line);
}
.stop-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  background: var(--color-cream);
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 700;
}
.stop-name {
  display: flex;
  min-height: 44px;
  flex-direction: column;
  justify-content: center;
  color: var(--color-navy);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.5;
}
.stop-name:hover {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.is-selected .stop-number {
  border-color: var(--color-navy);
  background: var(--color-navy);
  color: white;
}
.is-selected .stop-name {
  color: var(--color-blue);
}
.stop-map {
  display: inline-flex;
  min-height: 44px;
  min-width: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex-shrink: 0;
  color: var(--color-blue);
  font-size: 0.75rem;
  font-weight: 700;
}
.stop-map:hover {
  text-decoration: underline;
}
.signal-card {
  border: 1px solid var(--color-line);
  border-radius: 0.75rem;
  padding: 0.8rem 1rem;
}
.signal-name {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-navy);
  font-weight: 700;
}
.signal-name:hover {
  text-decoration: underline;
}
.signal-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
}
.signal-status::before {
  content: '';
  width: 0.4rem;
  height: 0.4rem;
  flex-shrink: 0;
  border-radius: 50%;
  background: currentColor;
}
.signal-recent {
  color: var(--color-success);
}
.signal-previous {
  color: var(--color-warning);
}
.transport-schedule {
  border-radius: var(--radius);
  background: var(--color-navy);
  color: var(--color-surface);
  padding: 1.5rem;
}
.schedule-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.75rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
@media (min-width: 768px) {
  .route-selector {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
    align-items: center;
    gap: 2rem;
  }
}
@media (min-width: 1024px) {
  .transport-columns {
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  }
}
@media (max-width: 380px) {
  .stop-map span {
    display: none;
  }
  .route-group-heading {
    flex-wrap: wrap;
  }
}
</style>
