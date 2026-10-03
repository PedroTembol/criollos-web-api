<template>
  <main class="page-wrap py-6 md:py-10">
    <section
      class="fade-rise mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] lg:items-end"
      aria-labelledby="home-heading"
    >
      <div>
        <p
          class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-blue)]"
        >
          Criollos · Caguas
        </p>
        <h1
          id="home-heading"
          class="brand-display text-4xl font-extrabold leading-[1.05] text-[var(--color-ink)] md:text-5xl"
        >
          Tu día en Caguas
        </h1>
        <p class="mt-3 max-w-xl text-lg text-[var(--color-muted)]">
          Encuentra tu ruta, un plan o algo rico, desde aquí.
        </p>
      </div>

      <div class="relative" role="search">
        <label for="home-search" class="sr-only">Buscar en Criollos</label>
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]"
            aria-hidden="true"
          />
          <input
            id="home-search"
            v-model="searchQuery"
            type="search"
            placeholder="Busca rutas, eventos o comida…"
            class="field pl-10"
            aria-label="Buscador global de Criollos"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="searchResults.length > 0"
            aria-haspopup="listbox"
            :aria-controls="
              searchResults.length ? 'search-results-list' : undefined
            "
            :aria-activedescendant="
              activeIndex >= 0 ? `result-item-${activeIndex}` : undefined
            "
            @input="handleSearch"
            @keydown.down.prevent="moveActiveIndex(1)"
            @keydown.up.prevent="moveActiveIndex(-1)"
            @keydown.enter.prevent="selectActiveResult"
            @keydown.esc="closeSearch"
          />
          <span
            v-if="searchLoading"
            class="absolute inset-y-0 right-3 flex items-center"
            aria-hidden="true"
          >
            <span
              class="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-navy)]"
            />
          </span>
        </div>

        <div
          v-if="searchResults.length"
          id="search-results-list"
          role="listbox"
          aria-label="Resultados de búsqueda"
          class="surface absolute z-30 mt-2 max-h-[50vh] w-full overflow-y-auto p-2"
        >
          <button
            v-for="(result, index) in searchResults"
            :id="`result-item-${index}`"
            :key="result.id"
            type="button"
            role="option"
            :aria-selected="index === activeIndex"
            class="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors"
            :class="
              index === activeIndex
                ? 'bg-[var(--color-blue-soft)]'
                : 'hover:bg-[var(--color-cream)]'
            "
            @click="navigateResult(result)"
            @mouseenter="activeIndex = index"
          >
            <component
              :is="resultTypeIcon(result.type)"
              class="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-navy)]"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-bold text-[var(--color-ink)]">{{
                  result.title
                }}</span>
                <span
                  class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]"
                  >{{ resultTypeLabel(result.type) }}</span
                >
              </span>
              <span class="mt-0.5 block text-sm text-[var(--color-muted)]">{{
                result.subtitle
              }}</span>
            </span>
          </button>
        </div>
        <p
          v-if="searchError"
          role="alert"
          class="mt-2 text-sm text-[var(--color-warning)]"
        >
          {{ searchError }}
          <button
            type="button"
            class="font-bold underline"
            @click="handleSearch"
          >
            Reintentar búsqueda
          </button>
        </p>
        <p
          v-else-if="
            searchQuery.trim().length >= 2 &&
            !searchLoading &&
            !searchResults.length
          "
          role="status"
          class="mt-2 text-sm text-[var(--color-muted)]"
        >
          No encontramos resultados.
        </p>
      </div>
    </section>

    <nav
      class="mb-7 grid grid-cols-3 gap-2 sm:gap-4"
      aria-label="¿Qué necesitas hoy?"
    >
      <NuxtLink to="/transporte" class="service-choice">
        <Bus
          class="h-6 w-6 shrink-0 text-[var(--color-blue)]"
          aria-hidden="true"
        />
        <div><strong>Transporte</strong><span>Rutas y paradas</span></div>
      </NuxtLink>
      <NuxtLink to="/eventos" class="service-choice">
        <CalendarDays
          class="h-6 w-6 shrink-0 text-[var(--color-coral)]"
          aria-hidden="true"
        />
        <div><strong>Eventos</strong><span>Encuentra un plan</span></div>
      </NuxtLink>
      <NuxtLink to="/gastronomia" class="service-choice">
        <UtensilsCrossed
          class="h-6 w-6 shrink-0 text-[var(--color-ochre)]"
          aria-hidden="true"
        />
        <div><strong>Dónde comer</strong><span>Para tu antojo</span></div>
      </NuxtLink>
    </nav>

    <section
      class="fade-rise mb-8 surface p-5 md:p-6"
      aria-labelledby="live-status-heading"
      style="animation-delay: 80ms"
    >
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="live-status-heading"
            class="brand-display text-2xl font-bold text-[var(--color-ink)]"
          >
            Transporte ahora
          </h2>
          <p class="mt-1 text-sm text-[var(--color-muted)]">
            Unidades reportadas y estado de la última lectura.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <p
            class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
            role="status"
            :class="
              serviceHealthTone === 'healthy'
                ? 'bg-emerald-100 text-emerald-800'
                : serviceHealthTone === 'warning'
                  ? 'bg-[var(--color-ochre-soft)] text-[var(--color-warning)]'
                  : 'bg-[var(--color-cream-deep)] text-[var(--color-muted)]'
            "
          >
            {{ serviceHealthLabel }}
          </p>
          <button
            type="button"
            class="btn-primary !px-4 !py-2 text-sm"
            :disabled="trackingLoading"
            @click="refreshTracking"
          >
            {{ trackingLoading ? 'Actualizando…' : 'Actualizar señales' }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div
          class="rounded-2xl bg-[var(--color-blue-soft)] px-5 py-4 text-[var(--color-navy)]"
        >
          <p class="text-xs font-bold uppercase tracking-[0.16em]">
            Unidades reportadas
          </p>
          <p
            class="brand-display mt-1 text-4xl font-extrabold"
            aria-live="polite"
          >
            {{ vehicleCount !== null ? vehicleCount : '...' }}
          </p>
        </div>
        <div class="text-sm text-[var(--color-muted)]">
          <p
            v-if="trackingError"
            role="alert"
            class="text-[var(--color-warning)]"
          >
            {{ trackingError }}
          </p>
          <p
            v-else-if="trackingStale"
            role="status"
            class="text-[var(--color-warning)]"
          >
            La fuente no pudo actualizarse. Esta lectura es anterior.
          </p>
          <p v-else>
            {{
              trackingLoading
                ? 'Consultando señales…'
                : lastUpdatedLabel
                  ? `Última lectura: ${lastUpdatedLabel}`
                  : 'Esperando datos…'
            }}
          </p>
          <p class="mt-2">
            Consulta el recorrido y la señal de cada unidad antes de salir.
          </p>
          <div class="mt-3 flex flex-wrap gap-3">
            <NuxtLink
              to="/transporte"
              class="font-bold text-[var(--color-blue)] underline"
              >Rutas y paradas</NuxtLink
            >
            <NuxtLink
              to="/cerca"
              class="font-bold text-[var(--color-blue)] underline"
              >Cerca de ti</NuxtLink
            >
          </div>
        </div>
      </div>

      <ul
        v-if="topVehicles.length"
        class="mt-4 divide-y divide-[var(--color-line)] border-t border-[var(--color-line)]"
        aria-label="Unidades recientes"
      >
        <li
          v-for="vehicle in topVehicles"
          :key="vehicle.assetId"
          class="grid grid-cols-2 items-center gap-x-4 gap-y-1 py-3 sm:flex sm:flex-wrap sm:gap-x-6"
        >
          <div class="col-span-2 min-w-0 sm:flex-1">
            <p class="text-sm font-bold">
              {{ vehicle.routeName || 'Ruta por confirmar' }} ·
              {{ vehicle.label }}
            </p>
            <p class="mt-1 text-sm text-[var(--color-muted)]">
              {{
                vehicle.nextStop?.name
                  ? `Próxima parada: ${vehicle.nextStop.name}`
                  : 'Parada por confirmar'
              }}
            </p>
          </div>
          <p class="text-xs font-semibold text-[var(--color-muted)]">
            {{ vehicleSignal(vehicle).label }}
          </p>
          <NuxtLink
            :to="`/transporte?assetId=${vehicle.assetId}`"
            class="inline-flex min-h-11 items-center justify-self-end text-sm font-bold text-[var(--color-blue)] underline"
            >Ver unidad y ruta</NuxtLink
          >
        </li>
      </ul>
      <p
        v-else-if="!trackingLoading && vehicleCount === 0"
        class="mt-4 rounded-xl bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-muted)]"
        role="status"
      >
        No recibimos señales de unidades ahora. Esto no confirma una
        interrupción.
      </p>
    </section>

    <div class="grid gap-8 lg:grid-cols-2">
      <section
        class="fade-rise"
        aria-labelledby="home-events-heading"
        style="animation-delay: 140ms"
      >
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="home-events-heading"
              class="brand-display text-2xl font-bold"
            >
              Próximos eventos
            </h2>
            <p class="mt-1 text-sm text-[var(--color-muted)]">
              Una selección corta de la agenda pública.
            </p>
          </div>
          <NuxtLink
            to="/eventos"
            class="inline-flex min-h-11 items-center text-sm font-bold text-[var(--color-coral)] underline"
            >Ver agenda</NuxtLink
          >
        </div>

        <p
          v-if="!eventsFeed && !eventsError"
          role="status"
          class="surface p-4 text-sm text-[var(--color-muted)]"
        >
          Cargando eventos…
        </p>
        <div
          v-else-if="
            (eventsError || eventsFeed?.metadata?.state === 'unavailable') &&
            !events.length
          "
          role="alert"
          class="surface border-[var(--color-ochre)] bg-[var(--color-ochre-soft)] p-4"
        >
          <p class="font-bold">No pudimos cargar eventos</p>
          <button
            type="button"
            class="mt-2 font-bold text-[var(--color-navy)] underline"
            @click="refreshEvents"
          >
            Reintentar
          </button>
        </div>
        <p
          v-else-if="!events.length"
          role="status"
          class="surface p-4 text-sm text-[var(--color-muted)]"
        >
          No hay eventos visibles ahora.
          <NuxtLink to="/eventos" class="font-bold underline"
            >Abrir agenda</NuxtLink
          >
        </p>
        <ul v-else class="space-y-3">
          <li
            v-for="item in events"
            :key="item.id"
            class="surface flex gap-3 p-3"
          >
            <div
              v-if="item.imageUrl"
              class="hidden h-20 w-20 shrink-0 overflow-hidden rounded-lg sm:block"
            >
              <img
                :src="item.imageUrl"
                :alt="item.imageAlt || ''"
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div class="min-w-0">
              <p
                class="text-xs font-bold uppercase tracking-wider text-[var(--color-coral)]"
              >
                {{ item.category || 'Evento' }}
                <span v-if="item.rawDate"> · {{ item.rawDate }}</span>
              </p>
              <h3 class="mt-1 font-bold leading-snug">{{ item.title }}</h3>
              <p
                v-if="item.venue"
                class="mt-1 text-sm text-[var(--color-muted)]"
              >
                {{ item.venue }}
              </p>
              <a
                v-if="safeSourceUrl(item.sourceUrl)"
                :href="safeSourceUrl(item.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-[var(--color-blue)] underline"
                >Detalles en la fuente</a
              >
            </div>
          </li>
        </ul>
        <p
          v-if="eventsMetaLabel"
          class="mt-3 text-xs text-[var(--color-muted)]"
        >
          {{ eventsMetaLabel }}
          <button
            type="button"
            class="ml-2 inline-flex min-h-11 items-center font-bold underline"
            :disabled="mounted && eventsPending"
            @click="refreshEvents"
          >
            Actualizar eventos
          </button>
        </p>
      </section>

      <section
        class="fade-rise"
        aria-labelledby="home-food-heading"
        style="animation-delay: 200ms"
      >
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="home-food-heading" class="brand-display text-2xl font-bold">
              Dónde comer
            </h2>
            <p class="mt-1 text-sm text-[var(--color-muted)]">
              Lugares del directorio gastronómico.
            </p>
          </div>
          <NuxtLink
            to="/gastronomia"
            class="inline-flex min-h-11 items-center text-sm font-bold text-[var(--color-ochre)] underline"
            >Ver comida</NuxtLink
          >
        </div>

        <p
          v-if="!foodFeed && !foodError"
          role="status"
          class="surface p-4 text-sm text-[var(--color-muted)]"
        >
          Cargando lugares…
        </p>
        <div
          v-else-if="
            (foodError || foodFeed?.metadata?.state === 'unavailable') &&
            !places.length
          "
          role="alert"
          class="surface border-[var(--color-ochre)] bg-[var(--color-ochre-soft)] p-4"
        >
          <p class="font-bold">No pudimos cargar lugares</p>
          <button
            type="button"
            class="mt-2 font-bold text-[var(--color-navy)] underline"
            @click="refreshFood"
          >
            Reintentar
          </button>
        </div>
        <p
          v-else-if="!places.length"
          role="status"
          class="surface p-4 text-sm text-[var(--color-muted)]"
        >
          No hay lugares visibles ahora.
          <NuxtLink to="/gastronomia" class="font-bold underline"
            >Abrir gastronomía</NuxtLink
          >
        </p>
        <ul v-else class="space-y-3">
          <li
            v-for="item in places"
            :key="item.id"
            class="surface flex gap-3 p-3"
          >
            <div
              v-if="item.imageUrl"
              class="h-20 w-20 shrink-0 overflow-hidden rounded-lg"
            >
              <img
                :src="item.imageUrl"
                :alt="item.imageAlt || ''"
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div class="min-w-0">
              <p
                class="text-xs font-bold uppercase tracking-wider text-[var(--color-ochre)]"
              >
                {{ item.category || 'Comida' }}
              </p>
              <h3 class="mt-1 font-bold leading-snug">{{ item.title }}</h3>
              <p
                v-if="item.summary"
                class="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]"
              >
                {{ item.summary }}
              </p>
              <a
                v-if="safeSourceUrl(item.sourceUrl)"
                :href="safeSourceUrl(item.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-[var(--color-blue)] underline"
                >Detalles en la fuente</a
              >
            </div>
          </li>
        </ul>
        <p v-if="foodMetaLabel" class="mt-3 text-xs text-[var(--color-muted)]">
          {{ foodMetaLabel }}
          <button
            type="button"
            class="ml-2 inline-flex min-h-11 items-center font-bold underline"
            :disabled="mounted && foodPending"
            @click="refreshFood"
          >
            Actualizar lugares
          </button>
        </p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import {
  Bus,
  CalendarDays,
  MapPin,
  Search,
  UtensilsCrossed,
} from 'lucide-vue-next'
import type {
  TrackingSnapshot,
  TrackingVehicleSnapshot,
} from '../../server/utils/tracking'
import type { Evento, GastronomiaPlace } from '../../server/utils/scraper'
import type {
  GlobalSearchResponse,
  SearchResult,
} from '../../server/utils/search'
import { getFeedStatus, type PublicFeedMetadata } from '../utils/feedStatus'
import {
  searchResultDestination,
  transportVehicleSignal,
} from '../utils/transportLinks'

type HomeFeed<T> = { data: T[]; metadata?: PublicFeedMetadata; stale?: boolean }
type Tracking = TrackingSnapshot & { stale?: boolean }
useHead({ title: 'Tu día en Caguas' })
const mounted = ref(false)

const trackingLoading = ref(false)
const trackingError = ref('')
const trackingStale = ref(false)
const tracking = shallowRef<Tracking | null>(null)
const vehicleCount = computed(() => tracking.value?.vehicles.length ?? null)
const now = ref(Date.now())
const topVehicles = computed(() =>
  [...(tracking.value?.vehicles ?? [])]
    .sort(
      (a, b) =>
        (vehicleSignal(a).ageSeconds ?? Infinity) -
        (vehicleSignal(b).ageSeconds ?? Infinity)
    )
    .slice(0, 3)
)
let trackingTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined
let trackingController: AbortController | undefined
const serviceHealthLabel = computed(() => {
  if (trackingError.value)
    return tracking.value ? 'Lectura sin actualizar' : 'Sin lectura disponible'
  if (!tracking.value)
    return trackingLoading.value
      ? 'Consultando señales'
      : 'Sin lectura disponible'
  if (trackingStale.value) return 'Lectura antigua'
  if (!tracking.value.vehicles.length) return 'Sin señales reportadas'
  return tracking.value.vehicles.some((v) => vehicleSignal(v).state === 'live')
    ? 'Señales recientes'
    : 'Señales anteriores'
})
const serviceHealthTone = computed(() =>
  trackingError.value || trackingStale.value
    ? 'warning'
    : tracking.value?.vehicles.some((v) => vehicleSignal(v).state === 'live')
      ? 'healthy'
      : 'neutral'
)
const lastUpdatedLabel = computed(() =>
  formatDateTime(tracking.value?.fetchedAt)
)
function vehicleSignal(vehicle: TrackingVehicleSnapshot) {
  const signal = transportVehicleSignal(vehicle, now.value)
  return trackingStale.value && signal.state === 'live'
    ? { ...signal, state: 'stale', label: 'Última señal guardada' }
    : signal
}
function formatDateTime(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return ''
  return new Intl.DateTimeFormat('es-PR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Puerto_Rico',
  }).format(new Date(value))
}
async function refreshTracking() {
  if (trackingLoading.value) return
  trackingLoading.value = true
  const controller = new AbortController()
  trackingController = controller
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const data = await $fetch<Tracking>('/api/v1/tracking', {
      signal: controller.signal,
      retry: 0,
    })
    if (!data || !Array.isArray(data.vehicles))
      throw new Error('Respuesta sin confirmar')
    tracking.value = data
    trackingStale.value = data.stale === true
    trackingError.value = ''
    now.value = Date.now()
  } catch {
    trackingError.value = tracking.value
      ? 'No pudimos actualizar. Conservamos la última lectura.'
      : 'No pudimos consultar el transporte. Puedes reintentar.'
    trackingStale.value = Boolean(tracking.value)
  } finally {
    clearTimeout(timeout)
    trackingLoading.value = false
  }
}

// Home loads its independent sources in parallel in the browser; prerendering
// the start screen does not depend on an external municipal source being online.
const [eventRequest, foodRequest] = await Promise.all([
  useFetch<HomeFeed<Evento>>('/api/v1/eventos', {
    key: 'home-eventos',
    query: {
      limit: 50,
      from: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Puerto_Rico',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    },
    server: false,
    transform: (value) => {
      if (!value || !Array.isArray(value.data))
        throw new Error('Agenda sin confirmar')
      return value
    },
  }),
  useFetch<HomeFeed<GastronomiaPlace>>('/api/v1/gastronomia', {
    key: 'home-gastronomia',
    query: { limit: 3 },
    server: false,
    transform: (value) => {
      if (!value || !Array.isArray(value.data))
        throw new Error('Directorio sin confirmar')
      return value
    },
  }),
])
const lastEvents = shallowRef<HomeFeed<Evento> | null>(null)
const lastFood = shallowRef<HomeFeed<GastronomiaPlace> | null>(null)
watch(
  eventRequest.data,
  (value) => {
    if (value) lastEvents.value = value
  },
  { immediate: true }
)
watch(
  foodRequest.data,
  (value) => {
    if (value) lastFood.value = value
  },
  { immediate: true }
)
const eventsFeed = computed(() => eventRequest.data.value ?? lastEvents.value)
const foodFeed = computed(() => foodRequest.data.value ?? lastFood.value)
const events = computed(() =>
  [...(eventsFeed.value?.data ?? [])]
    .sort(
      (a, b) =>
        (a.publishedAt ? Date.parse(a.publishedAt) : Infinity) -
        (b.publishedAt ? Date.parse(b.publishedAt) : Infinity)
    )
    .slice(0, 3)
)
const places = computed(() => foodFeed.value?.data.slice(0, 3) ?? [])
const eventsError = eventRequest.error
const foodError = foodRequest.error
const eventsRefreshing = ref(false)
const foodRefreshing = ref(false)
const eventsPending = computed(
  () => eventRequest.pending.value || eventsRefreshing.value
)
const foodPending = computed(
  () => foodRequest.pending.value || foodRefreshing.value
)
async function refreshEvents() {
  if (eventsPending.value) return
  eventsRefreshing.value = true
  try {
    await eventRequest.refresh()
  } finally {
    eventsRefreshing.value = false
  }
}
async function refreshFood() {
  if (foodPending.value) return
  foodRefreshing.value = true
  try {
    await foodRequest.refresh()
  } finally {
    foodRefreshing.value = false
  }
}
function feedLabel(
  metadata: PublicFeedMetadata | undefined,
  error: boolean,
  hasData: boolean
) {
  const status = getFeedStatus(metadata, { error, hasData })
  return [
    status.title,
    status.updated
      ? `Consultado ${status.updated} (Puerto Rico)`
      : status.message,
  ].join(' · ')
}
const eventsMetaLabel = computed(() =>
  feedLabel(
    eventsFeed.value?.metadata,
    Boolean(eventsError.value),
    Boolean(events.value.length)
  )
)
const foodMetaLabel = computed(() =>
  feedLabel(
    foodFeed.value?.metadata,
    Boolean(foodError.value),
    Boolean(places.value.length)
  )
)
function safeSourceUrl(value?: string | null) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined
  } catch {
    return undefined
  }
}

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const searchLoading = ref(false)
const searchError = ref('')
const activeIndex = ref(-1)
let searchTimeout: ReturnType<typeof setTimeout> | undefined
let searchController: AbortController | undefined
let searchVersion = 0
function handleSearch() {
  activeIndex.value = -1
  clearTimeout(searchTimeout)
  searchController?.abort()
  const version = ++searchVersion
  const q = searchQuery.value.trim()
  searchError.value = ''
  searchResults.value = []
  if (q.length < 2) {
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  searchTimeout = setTimeout(async () => {
    const controller = new AbortController()
    searchController = controller
    try {
      const data = await $fetch<GlobalSearchResponse>('/api/v1/search', {
        query: { q },
        signal: controller.signal,
        retry: 0,
      })
      if (!Array.isArray(data?.results))
        throw new Error('Búsqueda sin confirmar')
      if (version === searchVersion) searchResults.value = data.results
    } catch {
      if (version === searchVersion && !controller.signal.aborted)
        searchError.value = 'No pudimos buscar. Intenta de nuevo.'
    } finally {
      if (version === searchVersion) searchLoading.value = false
    }
  }, 300)
}
function resultTypeIcon(type: string) {
  const icons = {
    route: Bus,
    stop: MapPin,
    vehicle: Bus,
    evento: CalendarDays,
    gastronomia: UtensilsCrossed,
  }
  return icons[type as keyof typeof icons] ?? Search
}
function resultTypeLabel(type: string) {
  const labels = {
    route: 'Ruta',
    stop: 'Parada',
    vehicle: 'Trolley',
    evento: 'Evento',
    gastronomia: 'Comida',
  }
  return labels[type as keyof typeof labels] ?? 'Resultado'
}
function navigateResult(result: SearchResult) {
  return navigateTo(searchResultDestination(result, result.title))
}
function moveActiveIndex(delta: number) {
  if (searchResults.value.length)
    activeIndex.value =
      (activeIndex.value + delta + searchResults.value.length) %
      searchResults.value.length
}
function selectActiveResult() {
  const result = searchResults.value[activeIndex.value]
  if (result) navigateResult(result)
}
function closeSearch() {
  searchVersion++
  clearTimeout(searchTimeout)
  searchController?.abort()
  searchLoading.value = false
  searchError.value = ''
  searchResults.value = []
  searchQuery.value = ''
  activeIndex.value = -1
}
function onVisibility() {
  if (!document.hidden) void refreshTracking()
}
onMounted(() => {
  mounted.value = true
  void refreshTracking()
  trackingTimer = setInterval(() => {
    if (!document.hidden) void refreshTracking()
  }, 30_000)
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 15_000)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  clearInterval(trackingTimer)
  clearInterval(clockTimer)
  clearTimeout(searchTimeout)
  trackingController?.abort()
  searchController?.abort()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>
