<template>
  <main class="page-wrap py-8 md:py-12">
    <nav
      aria-label="Atajos de página"
      class="sr-only focus-within:not-sr-only focus-within:mb-6"
    >
      <div class="flex flex-wrap gap-3">
        <a href="#nearby-location" class="btn-secondary">Ir a ubicación</a>
        <a v-if="coords && feed" href="#nearby-summary" class="btn-secondary"
          >Ir a resumen</a
        >
        <a v-if="coords && feed" href="#nearby-results" class="btn-secondary"
          >Ir a paradas cercanas</a
        >
      </div>
    </nav>

    <section
      id="nearby-location"
      class="nearby-location mb-8"
      aria-labelledby="nearby-title"
    >
      <div class="nearby-intro">
        <p class="nearby-eyebrow">Muévete por Caguas</p>
        <h1 id="nearby-title" class="brand-display nearby-title">
          Paradas cerca de ti
        </h1>
        <p class="nearby-lead">
          Encuentra dónde subir al trolley, consulta las rutas de cada parada y
          abre las indicaciones para llegar.
        </p>
        <NuxtLink to="/transporte" class="nearby-text-link mt-3">
          Ver todas las rutas
          <ArrowRight class="h-4 w-4" aria-hidden="true" />
        </NuxtLink>
      </div>
      <div class="location-action">
        <LocateFixed class="mb-3 h-7 w-7" aria-hidden="true" />
        <h2 class="brand-display text-xl font-bold">
          Empieza por tu ubicación
        </h2>
        <p class="mt-2 text-sm leading-relaxed">
          Al pulsar el botón, compartes tus coordenadas con Criollos para
          consultar las paradas. Tu navegador te pedirá permiso.
        </p>
        <button
          type="button"
          @click="requestLocation"
          :disabled="loadingLocation || pending"
          class="location-button mt-5"
        >
          <LocateFixed
            class="h-4 w-4"
            :class="{ 'animate-pulse': loadingLocation }"
            aria-hidden="true"
          />
          {{ locationStatus }}
        </button>
        <p class="mt-3 text-xs leading-relaxed">
          Puedes desactivar tu ubicación aquí cuando quieras.
        </p>
      </div>
      <div v-if="coords" class="location-active">
        <div class="flex min-w-0 items-start gap-3">
          <MapPin
            class="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-blue)]"
            aria-hidden="true"
          />
          <div>
            <p class="text-sm font-bold">
              Ubicación activa: {{ coords.lat.toFixed(4) }},
              {{ coords.lng.toFixed(4) }}
            </p>
            <p class="mt-1 text-xs text-[var(--color-muted)]">
              Las distancias parten de esta ubicación. Actualízala si te has
              movido.
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="clearLocation"
          class="btn-secondary text-sm"
        >
          <X class="h-4 w-4" aria-hidden="true" />
          Desactivar
        </button>
      </div>
    </section>

    <div v-if="locationError" role="alert" class="nearby-notice mb-6">
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>{{ locationError }}</p>
    </div>
    <p
      v-if="coords && (feed?.stale || (error && feed))"
      role="status"
      class="nearby-notice mb-6"
    >
      Mostrando la lectura anterior; no se pudo actualizar la fuente. Las rutas
      y paradas pueden haber cambiado.
    </p>

    <section
      v-if="coords && feed"
      id="nearby-summary"
      class="nearby-summary mb-8"
      aria-label="Resumen de cercanía"
    >
      <article
        v-for="card in summaryCards"
        :key="card.id"
        class="surface nearby-summary-card"
      >
        <div class="summary-icon" aria-hidden="true">
          <MapPin v-if="card.id === 'nearest'" class="h-5 w-5" />
          <RouteIcon v-else class="h-5 w-5" />
        </div>
        <div>
          <p
            class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]"
          >
            {{ card.label }}
          </p>
          <h2 class="brand-display mt-1 text-2xl font-bold" aria-live="polite">
            {{ card.value }}
          </h2>
          <p class="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
            {{
              card.id === 'nearest'
                ? 'Distancia en línea recta. El recorrido a pie puede ser mayor.'
                : 'Hasta 10 paradas del catálogo, ordenadas por distancia.'
            }}
          </p>
        </div>
      </article>
    </section>

    <div
      v-if="coords && pending && !feed"
      role="status"
      class="surface flex items-center gap-3 p-6 text-[var(--color-muted)]"
    >
      <RefreshCw
        class="h-5 w-5 shrink-0 animate-spin text-[var(--color-blue)]"
        aria-hidden="true"
      />
      Buscando las paradas más cercanas…
    </div>
    <div
      v-else-if="coords && error && !feed"
      role="alert"
      class="surface p-6 md:p-8"
    >
      <AlertTriangle
        class="mb-4 h-7 w-7 text-[var(--color-warning)]"
        aria-hidden="true"
      />
      <h2 class="brand-display text-2xl font-bold">
        No pudimos cargar las paradas
      </h2>
      <p class="mt-2 max-w-xl text-[var(--color-muted)]">
        La información no está disponible ahora. Puedes reintentar la consulta
        con tu ubicación actual o revisar todas las rutas.
      </p>
      <div class="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          @click="retryNearby"
          :disabled="pending || loadingLocation"
          class="btn-primary"
        >
          <RefreshCw class="h-4 w-4" aria-hidden="true" />
          Reintentar
        </button>
        <NuxtLink to="/transporte" class="btn-secondary">Ver rutas</NuxtLink>
      </div>
    </div>
    <section
      v-else-if="coords && feed"
      id="nearby-results"
      aria-labelledby="nearby-results-title"
    >
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="nearby-results-title"
            class="brand-display text-2xl font-bold"
          >
            Elige tu parada
          </h2>
          <p class="mt-2 text-sm text-[var(--color-muted)]">
            De la más cercana a la más lejana. Las distancias no indican un
            tiempo de llegada.
          </p>
        </div>
        <button
          type="button"
          @click="retryNearby"
          :disabled="pending || loadingLocation"
          class="btn-secondary disabled:opacity-50"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="{ 'animate-spin': pending }"
            aria-hidden="true"
          />
          {{ pending ? 'Actualizando…' : 'Actualizar paradas' }}
        </button>
      </div>
      <p
        v-if="!feed.data?.length"
        role="status"
        class="surface p-6 text-[var(--color-muted)]"
      >
        No hay paradas disponibles para esta ubicación. Consulta todas las rutas
        o actualiza tu ubicación para volver a buscar.
      </p>
      <div class="grid gap-4">
        <article
          v-for="(stop, index) in feed.data"
          :key="stop.markerId"
          class="surface nearby-stop"
        >
          <div class="nearby-distance">
            <MapPin class="mb-2 h-5 w-5" aria-hidden="true" />
            <p class="brand-display text-2xl font-bold">
              {{ stop.distanceLabel }}
            </p>
            <p class="mt-1 text-xs">En línea recta</p>
            <span v-if="index === 0" class="nearest-label">Más cercana</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="mb-1 text-xs font-medium text-[var(--color-muted)]">
              Parada #{{ stop.markerId }}
            </p>
            <h3 class="brand-display text-xl font-bold md:text-2xl">
              {{ stop.name }}
            </h3>
            <p class="mt-2 text-sm text-[var(--color-muted)]">
              {{
                stop.routeCount
                  ? `${stop.routeCount === 1 ? '1 ruta' : `${stop.routeCount} rutas`} en el catálogo`
                  : 'El catálogo no indica rutas para esta parada.'
              }}
            </p>
            <div v-if="stop.routes?.length" class="mt-3 flex flex-wrap gap-2">
              <NuxtLink
                v-for="route in stop.routes"
                :key="route.routeId"
                :to="{
                  path: '/transporte',
                  query: {
                    routeId: String(route.routeId),
                    stopId: String(stop.markerId),
                  },
                }"
                class="nearby-route"
              >
                <span
                  class="route-dot"
                  :style="{
                    backgroundColor: route.routeColor || 'var(--color-navy)',
                  }"
                  aria-hidden="true"
                />
                <span>{{ route.routeName || `Ruta ${route.routeId}` }}</span>
                <ArrowRight class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </NuxtLink>
            </div>
            <NuxtLink
              :to="`/transporte?stopId=${stop.markerId}`"
              class="nearby-text-link mt-2 text-sm"
              >Ver parada y rutas
              <ArrowRight class="h-4 w-4" aria-hidden="true"
            /></NuxtLink>
          </div>
          <a
            :href="`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-primary nearby-directions"
            title="Cómo llegar"
            :aria-label="`Cómo llegar a ${stop.name} en mapas`"
          >
            <Navigation class="h-4 w-4" aria-hidden="true" />
            Cómo llegar
            <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
          </a>
        </article>
      </div>
      <p class="mt-5 text-xs text-[var(--color-muted)]">
        Catálogo consultado: {{ formatTimestamp(feed.fetchedAt) }} · Hora de
        Puerto Rico.
      </p>
    </section>
    <section
      v-else
      class="surface nearby-empty"
      aria-labelledby="nearby-empty-title"
    >
      <div class="empty-heading">
        <MapPin class="h-7 w-7 text-[var(--color-blue)]" aria-hidden="true" />
        <div>
          <h2 id="nearby-empty-title" class="brand-display text-2xl font-bold">
            Esperando tu ubicación
          </h2>
          <p class="mt-2 max-w-xl text-[var(--color-muted)]">
            Pulsa “Actualizar ubicación” para ver las paradas más cercanas.
            También puedes consultar las rutas sin compartir tu ubicación.
          </p>
        </div>
      </div>
      <ol class="nearby-steps">
        <li>
          <span class="step-number" aria-hidden="true">1</span>
          <div>
            <h3 class="font-bold">Comparte tu ubicación</h3>
            <p>Autoriza el acceso en tu navegador.</p>
          </div>
        </li>
        <li>
          <span class="step-number" aria-hidden="true">2</span>
          <div>
            <h3 class="font-bold">Encuentra una parada</h3>
            <p>Compara distancias y consulta las rutas.</p>
          </div>
        </li>
        <li>
          <span class="step-number" aria-hidden="true">3</span>
          <div>
            <h3 class="font-bold">Abre cómo llegar</h3>
            <p>Revisa el recorrido en mapas antes de salir.</p>
          </div>
        </li>
      </ol>
    </section>
  </main>
</template>

<script setup>
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Route as RouteIcon,
  X,
} from 'lucide-vue-next'
import {
  getNearbyStopsSummaryCards,
  getUserLocation,
} from '../utils/nearbyStops'

const coords = ref(null)
const locationStatus = ref('Actualizar ubicación')
const loadingLocation = ref(false)
const locationError = ref('')
let locationGeneration = 0
let locationTimer

const queryParams = computed(() => {
  if (!coords.value) return null
  return {
    lat: coords.value.lat,
    lng: coords.value.lng,
    limit: 10,
  }
})

const {
  data: rawFeed,
  pending,
  error,
  refresh,
  clear,
} = await useFetch('/api/v1/stops/nearby', {
  query: queryParams,
  watch: false,
  immediate: false,
})

const previousNearby = shallowRef(null)
const matchesOrigin = (value) =>
  !!coords.value &&
  value?.summary?.origin?.lat === coords.value.lat &&
  value?.summary?.origin?.lng === coords.value.lng
watch(
  rawFeed,
  (value) => {
    if (matchesOrigin(value)) previousNearby.value = value
  },
  { immediate: true }
)
const feed = computed(() => {
  if (matchesOrigin(rawFeed.value)) return rawFeed.value
  return matchesOrigin(previousNearby.value) ? previousNearby.value : null
})

const retryNearby = () => {
  if (coords.value && !pending.value && !loadingLocation.value) refresh()
}
onBeforeUnmount(() => {
  locationGeneration++
  clearTimeout(locationTimer)
})

const summaryCards = computed(() =>
  getNearbyStopsSummaryCards(feed.value?.summary, feed.value?.count ?? 0)
)

function formatTimestamp(value) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return 'Fecha sin confirmar'
  return new Intl.DateTimeFormat('es-PR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Puerto_Rico',
  }).format(new Date(value))
}

const requestLocation = async () => {
  if (loadingLocation.value || pending.value) return
  const generation = ++locationGeneration
  locationError.value = ''
  loadingLocation.value = true
  locationStatus.value = 'Localizando…'
  try {
    const loc = await getUserLocation()
    if (generation !== locationGeneration) return
    coords.value = loc
    await nextTick()
    await refresh()
    if (generation !== locationGeneration) return
    locationStatus.value = 'Ubicación actualizada'
    clearTimeout(locationTimer)
    locationTimer = setTimeout(() => {
      locationStatus.value = 'Actualizar ubicación'
    }, 3000)
  } catch (err) {
    if (generation !== locationGeneration) return
    locationStatus.value = 'Error al localizar'
    locationError.value =
      'No pudimos obtener tu ubicación. Revisa los permisos de ubicación del navegador y reintenta.'
  } finally {
    if (generation === locationGeneration) loadingLocation.value = false
  }
}

const clearLocation = () => {
  locationGeneration++
  clearTimeout(locationTimer)
  loadingLocation.value = false
  locationError.value = ''
  clear()
  previousNearby.value = null
  coords.value = null
  locationStatus.value = 'Actualizar ubicación'
}

useHead({
  title: 'Cerca de ti | Criollos',
  meta: [
    {
      name: 'description',
      content:
        'Encuentra las paradas de trolley más cercanas a tu ubicación en Caguas.',
    },
  ],
})
</script>

<style scoped>
.nearby-eyebrow {
  margin-bottom: 0.5rem;
  color: var(--color-blue);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.nearby-title {
  font-size: clamp(2.35rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.08;
}
.nearby-lead {
  max-width: 36rem;
  margin-top: 1rem;
  color: var(--color-muted);
  font-size: 1.05rem;
  line-height: 1.6;
}
.nearby-location {
  display: grid;
  gap: 1.5rem;
  align-items: center;
}
.location-action {
  border-radius: var(--radius);
  background: var(--color-navy);
  color: var(--color-surface);
  padding: 1.5rem;
}
.location-button {
  display: inline-flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-navy);
  padding: 0.8rem 1rem;
  font-weight: 800;
  transition: background 180ms ease;
}
.location-button:hover {
  background: var(--color-cream-deep);
}
.location-button:focus-visible {
  outline-color: var(--color-surface);
}
.location-button:disabled {
  cursor: wait;
  opacity: 0.65;
}
.location-active {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  background: var(--color-surface);
  padding: 1rem 1.25rem;
}
.nearby-notice {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  border: 1px solid var(--color-ochre);
  border-radius: var(--radius);
  background: var(--color-ochre-soft);
  color: var(--color-warning);
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.6;
}
.nearby-text-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-navy);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.nearby-summary {
  display: grid;
  gap: 1rem;
}
.nearby-summary-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
}
.summary-icon {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: var(--color-cream);
  color: var(--color-blue);
}
.nearby-stop {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.25rem;
}
.nearby-distance {
  width: 100%;
  border-radius: 0.75rem;
  background: var(--color-cream);
  color: var(--color-navy);
  padding: 1rem;
}
.nearest-label {
  display: inline-block;
  margin-top: 0.6rem;
  color: var(--color-muted);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.nearby-route {
  display: inline-flex;
  min-height: 44px;
  max-width: 100%;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--color-line);
  border-radius: 0.65rem;
  background: var(--color-cream);
  padding: 0.5rem 0.7rem;
  color: var(--color-navy);
  font-size: 0.75rem;
  font-weight: 700;
}
.nearby-route:hover {
  background: var(--color-cream-deep);
}
.route-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  border: 1px solid rgb(18 26 43 / 0.15);
  border-radius: 50%;
}
.nearby-directions {
  width: 100%;
  flex-shrink: 0;
  font-size: 0.875rem;
}
.nearby-empty {
  padding: 1.5rem;
}
.empty-heading {
  display: flex;
  align-items: start;
  gap: 1rem;
}
.empty-heading > svg {
  flex-shrink: 0;
  margin-top: 0.15rem;
}
.nearby-steps {
  display: grid;
  gap: 1.25rem;
  margin-top: 1.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-line);
}
.nearby-steps li {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  font-size: 0.875rem;
}
.nearby-steps p {
  margin-top: 0.25rem;
  color: var(--color-muted);
  line-height: 1.5;
}
.step-number {
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-cream);
  color: var(--color-blue);
  font-size: 0.75rem;
  font-weight: 800;
}
@media (min-width: 640px) {
  .nearby-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .nearby-stop {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
  }
  .nearby-distance {
    width: 7.5rem;
    flex-shrink: 0;
    text-align: center;
  }
  .nearby-distance svg {
    margin-inline: auto;
  }
  .nearby-directions {
    width: auto;
    margin-left: 9rem;
  }
  .nearby-empty {
    padding: 2rem;
  }
}
@media (min-width: 768px) {
  .nearby-steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .nearby-location {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 2rem;
  }
  .location-active {
    grid-column: 1 / -1;
  }
  .nearby-stop {
    flex-wrap: nowrap;
  }
  .nearby-directions {
    margin-left: 0;
  }
}
</style>
