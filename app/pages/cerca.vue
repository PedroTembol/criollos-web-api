<template>
  <div class="flex min-h-screen flex-col bg-blue-50/30">
    <nav
      aria-label="Atajos de página"
      class="sr-only focus-within:not-sr-only focus-within:px-6 focus-within:py-4 focus-within:bg-white focus-within:border-b focus-within:border-blue-200"
    >
      <div
        class="mx-auto flex max-w-5xl flex-wrap gap-3 text-sm font-bold text-[#0038A8]"
      >
        <a
          href="#nearby-location"
          class="rounded-full border border-[#0038A8]/20 bg-[#0038A8]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
          >Ir a ubicación</a
        >
        <a
          href="#nearby-summary"
          class="rounded-full border border-[#0038A8]/20 bg-[#0038A8]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
          >Ir a resumen</a
        >
        <a
          href="#nearby-results"
          class="rounded-full border border-[#0038A8]/20 bg-[#0038A8]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
          >Ir a paradas cercanas</a
        >
      </div>
    </nav>

    <header class="bg-[#0038A8] px-6 py-6 text-white shadow-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="group flex items-center gap-3">
            <span class="text-3xl transition-transform group-hover:scale-110"
              >🍍</span
            >
            <h1 class="text-xl font-bold uppercase tracking-tight">
              Criollos <span class="text-[#FFD700]">Cerca de ti</span>
            </h1>
          </NuxtLink>
        </div>
        <div
          class="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest"
        >
          <NuxtLink
            to="/discovery"
            class="rounded-full border border-white/30 px-3 py-1.5 transition hover:bg-white/10"
            >Discovery</NuxtLink
          >
          <NuxtLink
            to="/eventos"
            class="rounded-full border border-white/30 px-3 py-1.5 transition hover:bg-white/10"
            >Eventos</NuxtLink
          >
          <span class="rounded-full bg-white/20 px-3 py-1.5">Beta</span>
        </div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
      <section
        id="nearby-location"
        class="mb-8 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm"
      >
        <div
          class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p
              class="mb-2 text-sm font-black uppercase tracking-[0.2em] text-[#0038A8]"
            >
              Movilidad inteligente
            </p>
            <h2 class="text-3xl font-black text-slate-900">
              Encuentra tus paradas más cercanas
            </h2>
            <p class="mt-2 max-w-2xl text-slate-600">
              Activa tu GPS para detectar automáticamente las paradas de trolley
              a tu alrededor, con distancias reales y rutas que las sirven.
            </p>
          </div>
          <button
            @click="requestLocation"
            class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0038A8] px-6 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#002a7f] shadow-lg shadow-blue-200"
          >
            <span class="text-xl">📍</span>
            {{ locationStatus }}
          </button>
        </div>

        <div
          v-if="coords"
          class="mt-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between text-sm"
        >
          <div class="flex items-center gap-3 text-blue-900 font-bold">
            <span class="animate-pulse h-2 w-2 rounded-full bg-blue-500"></span>
            Ubicación activa: {{ coords.lat.toFixed(4) }},
            {{ coords.lng.toFixed(4) }}
          </div>
          <button
            @click="clearLocation"
            class="text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-600"
          >
            Desactivar
          </button>
        </div>
      </section>

      <section
        v-if="coords"
        id="nearby-summary"
        class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2"
        aria-label="Resumen de cercanía"
      >
        <article
          v-for="card in summaryCards"
          :key="card.id"
          class="rounded-3xl border p-5 shadow-sm"
          :class="
            card.tone === 'healthy'
              ? 'border-emerald-200 bg-emerald-50/50'
              : card.tone === 'warning'
                ? 'border-amber-200 bg-amber-50/50'
                : card.tone === 'critical'
                  ? 'border-rose-200 bg-rose-50/50'
                  : 'border-slate-200 bg-white'
          "
        >
          <p
            class="text-xs font-black uppercase tracking-[0.2em] text-slate-500"
          >
            {{ card.label }}
          </p>
          <h3
            class="mt-3 text-3xl font-black text-slate-900 leading-tight"
            aria-live="polite"
          >
            {{ card.value }}
          </h3>
          <p class="mt-3 text-sm text-slate-600 leading-relaxed">
            {{ card.hint }}
          </p>
        </article>
      </section>

      <div
        v-if="pending"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="h-12 w-12 animate-spin rounded-full border-b-2 border-[#0038A8]"
        ></div>
        <p class="mt-4 font-medium text-slate-500">
          Calculando distancias por el valle...
        </p>
      </div>

      <div
        v-else-if="error"
        class="rounded-3xl border border-red-100 bg-red-50 p-8 text-center"
      >
        <span class="mb-4 block text-4xl">⚠️</span>
        <h2 class="mb-2 text-xl font-bold text-red-800">
          No pudimos cargar las paradas
        </h2>
        <p class="mb-6 text-red-600">
          Hubo un error al conectar con el API Criollos.
        </p>
        <button
          @click="refresh"
          class="rounded-full bg-red-600 px-6 py-2 font-bold text-white transition-colors hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>

      <div
        v-else-if="coords"
        id="nearby-results"
        class="grid grid-cols-1 gap-6"
        aria-live="polite"
      >
        <article
          v-for="stop in feed?.data"
          :key="stop.markerId"
          class="group flex flex-col md:flex-row overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm transition-all hover:shadow-xl p-6 gap-6"
        >
          <div
            class="flex flex-col items-center justify-center bg-blue-50 rounded-2xl px-6 py-4 md:w-32 text-center border border-blue-100"
          >
            <span class="text-3xl mb-1">📍</span>
            <p class="text-lg font-black text-blue-900">
              {{ stop.distanceLabel }}
            </p>
            <p
              class="text-[10px] font-black uppercase tracking-widest text-blue-400"
            >
              Distancia
            </p>
          </div>

          <div class="flex flex-1 flex-col">
            <div class="flex items-start justify-between gap-4 mb-2">
              <h3
                class="text-2xl font-black text-slate-800 transition-colors group-hover:text-[#0038A8]"
              >
                {{ stop.name }}
              </h3>
              <span
                class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500"
              >
                #{{ stop.markerId }}
              </span>
            </div>

            <p class="text-sm font-bold text-slate-500 mb-6">
              Servida por
              {{
                stop.routeCount === 1 ? '1 ruta' : `${stop.routeCount} rutas`
              }}
              de trolley.
            </p>

            <div class="flex flex-wrap gap-3">
              <div
                v-for="route in stop.routes"
                :key="route.routeId"
                class="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-2"
              >
                <div
                  class="h-4 w-4 rounded-full border border-white shadow-sm"
                  :style="{ backgroundColor: route.routeColor || '#CBD5E1' }"
                ></div>
                <div class="text-xs">
                  <p class="font-black text-slate-900 leading-none">
                    Ruta {{ route.routeId }}
                  </p>
                  <p
                    class="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold"
                  >
                    {{ route.routeName || 'Sin nombre' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-center">
            <a
              :href="`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-[#CE1126] hover:text-white group-hover:shadow-lg"
              title="Cómo llegar"
            >
              <span class="text-xl">🚶</span>
            </a>
          </div>
        </article>
      </div>

      <div
        v-else
        class="rounded-3xl border border-dashed border-blue-200 bg-white py-20 text-center"
      >
        <span class="mb-4 block text-6xl">🧭</span>
        <h3 class="text-xl font-bold text-slate-800 mb-2">
          Esperando tu ubicación
        </h3>
        <p class="text-slate-600 max-w-md mx-auto">
          Presiona el botón de "Actualizar ubicación" para encontrar las paradas
          más cercanas a donde estás ahora mismo.
        </p>
      </div>
    </main>

    <footer class="bg-slate-900 px-6 py-10 text-center text-slate-400">
      <div class="mx-auto max-w-5xl">
        <p class="text-sm font-medium">
          © 2026 Criollos · Hecho para el ciudadano caguano 🍍
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import {
  getNearbyStopsSummaryCards,
  getUserLocation,
} from '../utils/nearbyStops'

const config = useRuntimeConfig()
const apiKey =
  config.public.apiKey ||
  '118884a9d701e5b0ab4f44322568a3c548fb3efb9f22b1b64f8c446224224c2b'

const coords = ref(null)
const locationStatus = ref('Actualizar ubicación')
const loadingLocation = ref(false)

const queryParams = computed(() => {
  if (!coords.value) return null
  return {
    lat: coords.value.lat,
    lng: coords.value.lng,
    limit: 10,
  }
})

const {
  data: feed,
  pending,
  error,
  refresh,
} = await useFetch('/api/v1/stops/nearby', {
  headers: {
    'x-api-key': apiKey,
  },
  query: queryParams,
  watch: [queryParams],
  immediate: false,
})

const summaryCards = computed(() =>
  getNearbyStopsSummaryCards(feed.value?.summary, feed.value?.count ?? 0)
)

const requestLocation = async () => {
  loadingLocation.value = true
  locationStatus.value = 'Localizando...'
  try {
    const loc = await getUserLocation()
    coords.value = loc
    locationStatus.value = 'Ubicación actualizada'
    setTimeout(() => {
      locationStatus.value = 'Actualizar ubicación'
    }, 3000)
  } catch (err) {
    console.error('Location error:', err)
    locationStatus.value = 'Error al localizar'
    alert(
      'No pudimos obtener tu ubicación. Por favor, asegúrate de dar permisos de GPS a la página.'
    )
  } finally {
    loadingLocation.value = false
  }
}

const clearLocation = () => {
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
