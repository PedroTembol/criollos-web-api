<template>
  <div class="flex min-h-screen flex-col bg-rose-50/30">
    <nav
      aria-label="Atajos de página"
      class="sr-only focus-within:not-sr-only focus-within:px-6 focus-within:py-4 focus-within:bg-white focus-within:border-b focus-within:border-rose-200"
    >
      <div
        class="mx-auto flex max-w-5xl flex-wrap gap-3 text-sm font-bold text-[#CE1126]"
      >
        <a
          href="#eventos-filters"
          class="rounded-full border border-[#CE1126]/20 bg-[#CE1126]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#CE1126]"
          >Ir a filtros</a
        >
        <a
          href="#eventos-summary-cards"
          class="rounded-full border border-[#CE1126]/20 bg-[#CE1126]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#CE1126]"
          >Ir a resumen editorial</a
        >
        <a
          href="#eventos-featured-plans"
          class="rounded-full border border-[#CE1126]/20 bg-[#CE1126]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#CE1126]"
          >Ir a planes destacados</a
        >
        <a
          href="#eventos-results"
          class="rounded-full border border-[#CE1126]/20 bg-[#CE1126]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#CE1126]"
          >Ir a la agenda</a
        >
      </div>
    </nav>

    <header class="bg-[#CE1126] px-6 py-6 text-white shadow-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="group flex items-center gap-3">
            <span class="text-3xl transition-transform group-hover:scale-110"
              >🍍</span
            >
            <h1 class="text-xl font-bold uppercase tracking-tight">
              Criollos <span class="text-[#FFD700]">Eventos</span>
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
            to="/gastronomia"
            class="rounded-full border border-white/30 px-3 py-1.5 transition hover:bg-white/10"
            >Gastronomía</NuxtLink
          >
          <span class="rounded-full bg-white/20 px-3 py-1.5">Beta</span>
        </div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
      <section
        id="eventos-filters"
        class="mb-8 rounded-3xl border border-rose-200 bg-white p-6 shadow-sm"
      >
        <div
          class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="mb-2 text-sm font-black uppercase tracking-[0.2em] text-[#CE1126]"
            >
              Agenda cultural
            </p>
            <h2 class="text-3xl font-black text-slate-900">
              Explora eventos de Caguas con filtros rápidos
            </h2>
            <p class="mt-2 max-w-2xl text-slate-600">
              Navega la agenda pública del Valle del Turabo por categoría,
              búsqueda textual o ventana de fechas, con metadata editorial lista
              para detectar qué viene ahora mismo.
            </p>
          </div>
          <p
            id="eventos-results-summary"
            class="text-sm text-slate-500"
            aria-live="polite"
          >
            {{ resultSummary }}
          </p>
        </div>

        <form
          class="mt-6 flex flex-col gap-4"
          aria-describedby="eventos-results-summary"
          @submit.prevent="applySearch"
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                for="eventos-search"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Buscar
              </label>
              <input
                id="eventos-search"
                v-model="searchDraft"
                type="search"
                placeholder="Ej. bomba, plaza, familia..."
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner outline-none transition focus:border-[#CE1126]"
              />
            </div>

            <div>
              <label
                for="eventos-category"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Categoría
              </label>
              <select
                id="eventos-category"
                v-model="selectedCategory"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#CE1126]"
                @change="applyFilters"
              >
                <option value="">Todas las categorías</option>
                <option
                  v-for="category in availableCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
            </div>
          </div>

          <div
            class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <div>
              <label
                for="eventos-from"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Desde
              </label>
              <input
                id="eventos-from"
                v-model="fromDraft"
                type="date"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#CE1126]"
                @change="applyFilters"
              />
            </div>

            <div>
              <label
                for="eventos-to"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Hasta
              </label>
              <input
                id="eventos-to"
                v-model="toDraft"
                type="date"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#CE1126]"
                @change="applyFilters"
              />
            </div>

            <div class="flex items-end gap-3">
              <button
                type="submit"
                class="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#CE1126] px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#b00e20]"
              >
                Filtrar
              </button>
              <button
                v-if="hasActiveFilters"
                type="button"
                class="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                @click="clearFilters"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div
            v-if="activeFilters.length"
            class="flex flex-wrap items-center gap-2"
            aria-live="polite"
            aria-label="Filtros activos"
          >
            <span
              class="text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >Activos</span
            >
            <button
              v-for="filter in activeFilters"
              :key="filter.key"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-[#CE1126]/20 bg-[#CE1126]/5 px-3 py-1.5 text-sm font-bold text-[#CE1126] transition hover:border-[#CE1126]/40 hover:bg-[#CE1126]/10"
              :aria-label="`Quitar filtro de ${filter.label.toLowerCase()}: ${filter.value}`"
              @click="removeFilter(filter.key)"
            >
              <span>{{ filter.label }}: {{ filter.value }}</span>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </form>
      </section>

      <section
        id="eventos-summary-cards"
        class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3"
        aria-label="Resumen editorial de la agenda visible"
      >
        <article
          v-for="card in summaryCards"
          :key="card.id"
          class="rounded-3xl border border-rose-200/70 bg-white p-5 shadow-sm"
        >
          <p
            class="text-xs font-black uppercase tracking-[0.2em] text-slate-500"
          >
            {{ card.label }}
          </p>
          <h3 class="mt-3 text-2xl font-black text-slate-900 leading-tight">
            {{ card.value }}
          </h3>
          <p class="mt-3 text-sm text-slate-600 leading-relaxed">
            {{ card.hint }}
          </p>
        </article>
      </section>

      <section
        v-if="alertCards.length"
        class="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3"
        aria-label="Alertas editoriales de la agenda visible"
      >
        <article
          v-for="alert in alertCards"
          :key="alert.id"
          class="rounded-3xl border p-5 shadow-sm"
          :class="
            alert.severity === 'warning'
              ? 'border-[#CE1126]/20 bg-[#CE1126]/5'
              : 'border-amber-200 bg-amber-50/80'
          "
        >
          <p
            class="text-xs font-black uppercase tracking-[0.2em]"
            :class="
              alert.severity === 'warning' ? 'text-[#CE1126]' : 'text-amber-700'
            "
          >
            {{ alert.eyebrow }}
          </p>
          <h3 class="mt-3 text-2xl font-black text-slate-900 leading-tight">
            {{ alert.title }}
          </h3>
          <p class="mt-3 text-sm text-slate-600 leading-relaxed">
            {{ alert.body }}
          </p>
          <p
            class="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500"
          >
            {{ alert.meta }}
          </p>
        </article>
      </section>

      <section
        v-if="featuredPlanCards.length"
        id="eventos-featured-plans"
        class="mb-8 rounded-3xl border border-[#CE1126]/15 bg-gradient-to-br from-white to-rose-50 p-6 shadow-sm"
        aria-label="Planes destacados de la agenda visible"
      >
        <div
          class="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-[#CE1126]"
            >
              Planes destacados
            </p>
            <h3 class="mt-2 text-2xl font-black text-slate-900">
              Convierte la agenda visible en próximos planes
            </h3>
          </div>
          <p class="max-w-xl text-sm text-slate-600">
            Priorizamos los próximos días con eventos confirmados para que el
            ciudadano pueda abrir detalles, guardar calendario y decidir rápido.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article
            v-for="plan in featuredPlanCards"
            :key="plan.id"
            class="flex h-full flex-col rounded-3xl border border-rose-200 bg-white p-5 shadow-sm"
          >
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-[#CE1126]"
            >
              {{ plan.eyebrow }}
            </p>
            <h4 class="mt-3 text-xl font-black leading-tight text-slate-900">
              {{ plan.title }}
            </h4>
            <p class="mt-3 text-sm leading-relaxed text-slate-600">
              {{ plan.body }}
            </p>
            <p
              class="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500"
            >
              {{ plan.meta }}
            </p>
            <div
              class="mt-auto flex flex-wrap gap-2 pt-5"
              aria-label="Categorías del plan"
            >
              <span
                v-for="category in plan.categoryLabels.slice(0, 3)"
                :key="`${plan.id}-${category}`"
                class="rounded-full bg-[#FFD700]/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-700"
              >
                {{ category }}
              </span>
            </div>
            <div class="mt-5 flex flex-wrap gap-3">
              <a
                v-if="plan.primaryEventHref"
                :href="plan.primaryEventHref"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#CE1126] transition-all hover:gap-3"
              >
                Ver plan
                <span>→</span>
              </a>
              <a
                :href="`#event-${plan.primaryEventId}`"
                class="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 transition-all hover:gap-3"
                :aria-label="`Saltar al evento ${plan.primaryEventTitle}`"
              >
                Ver en agenda
                <span>↓</span>
              </a>
            </div>
          </article>
        </div>
      </section>

      <section
        class="mb-8 rounded-3xl border border-rose-200 bg-white p-6 shadow-sm"
        aria-label="Exportar agenda filtrada"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-[#CE1126]"
            >
              Llévatelo al calendario
            </p>
            <h3 class="mt-2 text-2xl font-black text-slate-900">
              Exporta la agenda visible sin copiar fechas a mano
            </h3>
            <p class="mt-2 max-w-2xl text-sm text-slate-600">
              El archivo `.ics` respeta los filtros activos de categoría,
              búsqueda y rango de fechas e incluye un recordatorio Criollos 6
              horas antes de cada evento. Puedes importarlo en Apple Calendar,
              Google Calendar u otras apps compatibles.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a
              :href="calendarDownloadUrl"
              class="inline-flex items-center justify-center rounded-2xl bg-[#CE1126] px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#b00e20]"
            >
              Descargar `.ics`
            </a>
            <a
              href="#eventos-results"
              class="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Ver agenda visible
            </a>
          </div>
        </div>
      </section>

      <div
        v-if="pending"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="h-12 w-12 animate-spin rounded-full border-b-2 border-[#CE1126]"
        ></div>
        <p class="mt-4 font-medium text-slate-500">
          Montando la agenda cultural...
        </p>
      </div>

      <div
        v-else-if="error"
        class="rounded-3xl border border-red-100 bg-red-50 p-8 text-center"
      >
        <span class="mb-4 block text-4xl">⚠️</span>
        <h2 class="mb-2 text-xl font-bold text-red-800">
          No pudimos cargar la agenda
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
        v-else
        id="eventos-results"
        class="grid grid-cols-1 gap-8 md:grid-cols-2"
        aria-live="polite"
      >
        <article
          v-for="item in feed?.data"
          :id="`event-${item.id}`"
          :key="item.id"
          class="group scroll-mt-6 flex flex-col overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm transition-all hover:shadow-xl"
        >
          <div v-if="item.imageUrl" class="relative h-64 overflow-hidden">
            <img
              :src="item.imageUrl"
              :alt="item.imageAlt || item.title"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              class="absolute left-4 top-4 rounded-full bg-[#CE1126] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
            >
              {{ item.category }}
            </div>
          </div>

          <div class="flex flex-1 flex-col p-8">
            <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
              <span
                class="text-xs font-bold uppercase tracking-widest text-[#CE1126]"
                >{{ item.category }}</span
              >
              <span
                v-if="item.rawDate"
                class="text-xs font-medium text-slate-400"
                >{{ item.rawDate }}</span
              >
            </div>

            <h3
              class="mb-2 text-2xl font-black leading-tight text-slate-800 transition-colors group-hover:text-[#CE1126]"
            >
              {{ item.title }}
            </h3>

            <p v-if="item.venue" class="mb-4 text-sm font-bold text-slate-500">
              {{ item.venue }}
            </p>

            <p class="mb-8 line-clamp-4 leading-relaxed text-slate-600">
              {{ item.description }}
            </p>

            <div class="mt-auto flex flex-wrap gap-3">
              <a
                v-if="item.sourceUrl"
                :href="item.sourceUrl"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#CE1126] transition-all hover:gap-3"
              >
                Ver detalles
                <span>→</span>
              </a>
              <a
                v-if="getGoogleCalendarUrl(item)"
                :href="getGoogleCalendarUrl(item)"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 transition-all hover:gap-3"
              >
                Añadir a Google Calendar
                <span>↗</span>
              </a>
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="!pending && !error && (!feed?.data || feed?.data.length === 0)"
        id="eventos-empty-state"
        class="rounded-3xl border border-dashed border-rose-200 bg-white py-20 text-center"
        role="status"
        aria-live="polite"
      >
        <span class="mb-4 block text-5xl">🎭</span>
        <p class="text-lg text-slate-600">
          No encontramos eventos para ese filtro.
        </p>
        <p class="mt-2 text-sm text-slate-500">
          Prueba otra fecha, categoría o limpia la búsqueda para volver a la
          agenda completa.
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl bg-[#CE1126] px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#b00e20]"
            @click="clearFilters"
          >
            Limpiar filtros
          </button>
          <a
            href="#eventos-filters"
            class="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Volver a filtros
          </a>
        </div>
      </div>
    </main>

    <footer class="bg-slate-900 px-6 py-10 text-center text-slate-400">
      <div class="mx-auto max-w-5xl">
        <p class="text-sm font-medium">
          © 2026 Criollos · Agenda cultural de Caguas 🍍
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import {
  buildCalendarDownloadUrl,
  buildGoogleCalendarUrl,
} from '../../utils/calendarLinks'
import {
  getActiveEventFilters,
  getStableEventCategories,
} from '../../utils/eventsFilters'
import {
  getEventsAlertCards,
  getEventsSummaryCards,
  getFeaturedEventPlanCards,
} from '../../utils/eventsSummary'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const apiKey =
  config.public.apiKey ||
  '118884a9d701e5b0ab4f44322568a3c548fb3efb9f22b1b64f8c446224224c2b'

const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return typeof value === 'string' ? value : ''
}

const selectedCategory = ref(normalizeQueryValue(route.query.category))
const searchDraft = ref(normalizeQueryValue(route.query.q))
const fromDraft = ref(normalizeQueryValue(route.query.from))
const toDraft = ref(normalizeQueryValue(route.query.to))

const queryParams = computed(() => {
  const params = {}

  if (selectedCategory.value) params.category = selectedCategory.value

  const trimmedQuery = searchDraft.value.trim()
  if (trimmedQuery) params.q = trimmedQuery
  if (fromDraft.value) params.from = fromDraft.value
  if (toDraft.value) params.to = toDraft.value

  return params
})

const fetchOptions = {
  headers: {
    'x-api-key': apiKey,
  },
}

const { data: fullFeed } = await useFetch('/api/v1/eventos', fetchOptions)

const {
  data: feed,
  pending,
  error,
  refresh,
} = await useFetch('/api/v1/eventos', {
  ...fetchOptions,
  query: queryParams,
  watch: [queryParams],
})

const availableCategories = computed(() =>
  getStableEventCategories(fullFeed.value?.summary?.categories || [])
)

const hasActiveFilters = computed(() =>
  Boolean(
    selectedCategory.value ||
    searchDraft.value.trim() ||
    fromDraft.value ||
    toDraft.value
  )
)

const activeFilters = computed(() =>
  getActiveEventFilters({
    selectedCategory: selectedCategory.value,
    searchQuery: searchDraft.value,
    from: fromDraft.value,
    to: toDraft.value,
  })
)

const resultSummary = computed(() => {
  if (pending.value) {
    return 'Actualizando agenda…'
  }

  const count = feed.value?.count ?? 0
  const categoriesCount = availableCategories.value.length
  const categoryLabel =
    categoriesCount === 1
      ? '1 categoría disponible'
      : `${categoriesCount} categorías disponibles`
  const countLabel =
    count === 1 ? '1 evento visible' : `${count} eventos visibles`
  return `${countLabel} · ${categoryLabel}`
})

const summaryCards = computed(() =>
  getEventsSummaryCards(feed.value?.summary, feed.value?.count ?? 0)
)
const alertCards = computed(() => getEventsAlertCards(feed.value?.summary))
const featuredPlanCards = computed(() => {
  const apiPlans = feed.value?.summary?.featuredPlans?.filter(Boolean) || []
  return apiPlans.length
    ? apiPlans
    : getFeaturedEventPlanCards(feed.value?.data || [])
})
const calendarDownloadUrl = computed(() =>
  buildCalendarDownloadUrl('/calendars/eventos.ics', {
    category: selectedCategory.value || undefined,
    q: searchDraft.value.trim() || undefined,
    from: fromDraft.value || undefined,
    to: toDraft.value || undefined,
  })
)

const getGoogleCalendarUrl = (item) =>
  buildGoogleCalendarUrl({
    title: item.title,
    description: item.description,
    venue: item.venue,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
  })

watch(
  () => route.query,
  (query) => {
    selectedCategory.value = normalizeQueryValue(query.category)
    searchDraft.value = normalizeQueryValue(query.q)
    fromDraft.value = normalizeQueryValue(query.from)
    toDraft.value = normalizeQueryValue(query.to)
  }
)

const pushQueryState = async () => {
  const nextQuery = {
    ...route.query,
    category: selectedCategory.value || undefined,
    q: searchDraft.value.trim() || undefined,
    from: fromDraft.value || undefined,
    to: toDraft.value || undefined,
  }

  await router.replace({ query: nextQuery })
}

const applyFilters = async () => {
  await pushQueryState()
}

const applySearch = async () => {
  await pushQueryState()
}

const clearFilters = async () => {
  selectedCategory.value = ''
  searchDraft.value = ''
  fromDraft.value = ''
  toDraft.value = ''
  await router.replace({ query: {} })
}

const removeFilter = async (key) => {
  if (key === 'category') {
    selectedCategory.value = ''
  }

  if (key === 'q') {
    searchDraft.value = ''
  }

  if (key === 'from') {
    fromDraft.value = ''
  }

  if (key === 'to') {
    toDraft.value = ''
  }

  await pushQueryState()
}

useHead({
  title: 'Eventos Caguas | Criollos',
  meta: [
    {
      name: 'description',
      content: 'Agenda pública para descubrir eventos y actividades en Caguas.',
    },
  ],
})
</script>
