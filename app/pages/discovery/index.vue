<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <nav
      aria-label="Atajos de página"
      class="sr-only focus-within:not-sr-only focus-within:px-6 focus-within:py-4 focus-within:bg-white focus-within:border-b focus-within:border-slate-200"
    >
      <div
        class="mx-auto flex max-w-5xl flex-wrap gap-3 text-sm font-bold text-[#0038A8]"
      >
        <a
          href="#discovery-filters"
          class="rounded-full border border-[#0038A8]/20 bg-[#0038A8]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
          >Ir a filtros</a
        >
        <a
          href="#discovery-summary-cards"
          class="rounded-full border border-[#0038A8]/20 bg-[#0038A8]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
          >Ir a resumen editorial</a
        >
        <a
          href="#discovery-results"
          class="rounded-full border border-[#0038A8]/20 bg-[#0038A8]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0038A8]"
          >Ir al feed</a
        >
      </div>
    </nav>

    <header class="bg-[#0038A8] px-6 py-6 text-white shadow-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <NuxtLink to="/" class="group flex items-center gap-3">
          <span class="text-3xl transition-transform group-hover:scale-110"
            >🍍</span
          >
          <h1 class="text-xl font-bold uppercase tracking-tight">
            Criollos <span class="text-[#FFD700]">Descubrir</span>
          </h1>
        </NuxtLink>
        <div
          class="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest"
        >
          Beta
        </div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
      <section
        id="discovery-filters"
        class="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div
          class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="mb-2 text-sm font-black uppercase tracking-[0.2em] text-[#0038A8]"
            >
              Feed público
            </p>
            <h2 class="text-3xl font-black text-slate-900">
              Explora eventos y lugares con filtros rápidos
            </h2>
            <p class="mt-2 max-w-2xl text-slate-600">
              Refina el feed por tipo, categoría, búsqueda textual o ventana de
              fechas para planificar rápido qué hacer y dónde comer en Caguas.
            </p>
          </div>
          <p
            id="discovery-results-summary"
            class="text-sm text-slate-500"
            aria-live="polite"
          >
            {{ resultSummary }}
          </p>
        </div>

        <form
          class="mt-6 flex flex-col gap-4"
          aria-describedby="discovery-results-summary"
          @submit.prevent="applySearch"
        >
          <fieldset>
            <legend
              class="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500"
            >
              Tipo de contenido
            </legend>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="option in typeOptions"
                :key="option.value"
                type="button"
                class="rounded-full border px-4 py-2 text-sm font-bold transition-colors"
                :class="
                  selectedType === option.value
                    ? 'border-[#0038A8] bg-[#0038A8] text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-[#0038A8] hover:text-[#0038A8]'
                "
                :aria-pressed="selectedType === option.value"
                @click="setType(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </fieldset>

          <div
            class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(180px,0.55fr)_minmax(180px,0.55fr)_auto]"
          >
            <div>
              <label
                for="discovery-search"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Buscar
              </label>
              <input
                id="discovery-search"
                v-model="searchDraft"
                type="search"
                placeholder="Ej. plaza, café, bomba..."
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner outline-none transition focus:border-[#0038A8]"
              />
            </div>

            <div>
              <label
                for="discovery-category"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Categoría
              </label>
              <select
                id="discovery-category"
                v-model="selectedCategory"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0038A8]"
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

            <div>
              <label
                for="discovery-from"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Desde
              </label>
              <input
                id="discovery-from"
                v-model="selectedFrom"
                type="date"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0038A8]"
                @change="applyFilters"
              />
            </div>

            <div>
              <label
                for="discovery-to"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Hasta
              </label>
              <input
                id="discovery-to"
                v-model="selectedTo"
                type="date"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0038A8]"
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
              class="inline-flex items-center gap-2 rounded-full border border-[#0038A8]/20 bg-[#0038A8]/5 px-3 py-1.5 text-sm font-bold text-[#0038A8] transition hover:border-[#0038A8]/40 hover:bg-[#0038A8]/10"
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
        id="discovery-summary-cards"
        class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3"
        aria-label="Resumen editorial del feed visible"
      >
        <article
          v-for="card in summaryCards"
          :key="card.id"
          class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
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
        class="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2"
        aria-label="Alertas editoriales del feed visible"
      >
        <article
          v-for="alert in alertCards"
          :key="alert.id"
          class="rounded-3xl border p-5 shadow-sm"
          :class="
            alert.severity === 'warning'
              ? 'border-amber-200 bg-amber-50'
              : 'border-[#0038A8]/15 bg-[#0038A8]/5'
          "
        >
          <p
            class="text-xs font-black uppercase tracking-[0.2em]"
            :class="
              alert.severity === 'warning' ? 'text-amber-700' : 'text-[#0038A8]'
            "
          >
            {{ alert.eyebrow }}
          </p>
          <h3 class="mt-3 text-xl font-black leading-tight text-slate-900">
            {{ alert.title }}
          </h3>
          <p class="mt-3 text-sm leading-relaxed text-slate-700">
            {{ alert.body }}
          </p>
          <p
            v-if="alert.meta"
            class="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
          >
            {{ alert.meta }}
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
          Buscando lo mejor de Caguas...
        </p>
      </div>

      <div
        v-else-if="error"
        class="rounded-3xl border border-red-100 bg-red-50 p-8 text-center"
      >
        <span class="mb-4 block text-4xl">⚠️</span>
        <h2 class="mb-2 text-xl font-bold text-red-800">
          No pudimos cargar las recomendaciones
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
        id="discovery-results"
        class="grid grid-cols-1 gap-8 md:grid-cols-2"
        aria-live="polite"
      >
        <article
          v-for="item in feed?.data"
          :key="item.id"
          class="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl"
        >
          <div v-if="item.imageUrl" class="relative h-64 overflow-hidden">
            <img
              :src="item.imageUrl"
              :alt="item.imageAlt || item.title"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              class="absolute left-4 top-4 rounded-full bg-[#0038A8] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
            >
              {{ item.tag }}
            </div>
          </div>

          <div class="flex flex-1 flex-col p-8">
            <div class="mb-4 flex items-start justify-between gap-3">
              <span
                class="text-xs font-bold uppercase tracking-widest text-[#0038A8]"
                >{{ item.category }}</span
              >
              <span
                v-if="item.date"
                class="text-xs font-medium text-slate-400"
                >{{ item.date }}</span
              >
            </div>

            <h3
              class="mb-2 text-2xl font-black leading-tight text-slate-800 transition-colors group-hover:text-[#0038A8]"
            >
              {{ item.title }}
            </h3>

            <p class="mb-4 text-sm font-bold text-slate-500">
              {{ item.subtitle }}
            </p>

            <p class="mb-8 line-clamp-3 leading-relaxed text-slate-600">
              {{ item.description }}
            </p>

            <div class="mt-auto">
              <a
                v-if="item.link"
                :href="item.link"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#CE1126] transition-all hover:gap-3"
              >
                Ver detalles
                <span>→</span>
              </a>
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="!pending && !error && (!feed?.data || feed?.data.length === 0)"
        id="discovery-empty-state"
        class="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center"
        role="status"
        aria-live="polite"
      >
        <span class="mb-4 block text-5xl">🌵</span>
        <p class="text-lg text-slate-600">
          No encontramos resultados para ese filtro.
        </p>
        <p class="mt-2 text-sm text-slate-500">
          Prueba otra categoría o limpia la búsqueda para volver al feed
          completo.
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl bg-[#0038A8] px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#002a7f]"
            @click="clearFilters"
          >
            Limpiar filtros
          </button>
          <a
            href="#discovery-filters"
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
          © 2026 Criollos · Hecho para Caguas 🍍
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import {
  getActiveDiscoveryFilters,
  getStableAvailableCategories,
} from '../../utils/discoveryFilters'
import {
  getDiscoveryAlertCards,
  getDiscoverySummaryCards,
} from '../../utils/discoverySummary'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const apiKey =
  config.public.apiKey ||
  '118884a9d701e5b0ab4f44322568a3c548fb3efb9f22b1b64f8c446224224c2b'

const typeOptions = [
  { value: '', label: 'Todo' },
  { value: 'evento', label: 'Eventos' },
  { value: 'gastronomia', label: 'Gastronomía' },
]

const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return typeof value === 'string' ? value : ''
}

const selectedType = ref(normalizeQueryValue(route.query.type))
const selectedCategory = ref(normalizeQueryValue(route.query.category))
const selectedFrom = ref(normalizeQueryValue(route.query.from))
const selectedTo = ref(normalizeQueryValue(route.query.to))
const searchDraft = ref(normalizeQueryValue(route.query.q))

const queryParams = computed(() => {
  const params = {}

  if (selectedType.value) params.type = selectedType.value
  if (selectedCategory.value) params.category = selectedCategory.value
  if (selectedFrom.value) params.from = selectedFrom.value
  if (selectedTo.value) params.to = selectedTo.value

  const trimmedQuery = searchDraft.value.trim()
  if (trimmedQuery) params.q = trimmedQuery

  return params
})

const fetchOptions = {
  headers: {
    'x-api-key': apiKey,
  },
}

const { data: fullFeed } = await useFetch('/api/v1/discovery', fetchOptions)

const {
  data: feed,
  pending,
  error,
  refresh,
} = await useFetch('/api/v1/discovery', {
  ...fetchOptions,
  query: queryParams,
  watch: [queryParams],
})

const availableCategories = computed(() =>
  getStableAvailableCategories(fullFeed.value?.data || [], selectedType.value)
)

const hasActiveFilters = computed(() =>
  Boolean(
    selectedType.value ||
    selectedCategory.value ||
    selectedFrom.value ||
    selectedTo.value ||
    searchDraft.value.trim()
  )
)

const activeFilters = computed(() =>
  getActiveDiscoveryFilters(
    {
      selectedType: selectedType.value,
      selectedCategory: selectedCategory.value,
      searchQuery: searchDraft.value,
      from: selectedFrom.value,
      to: selectedTo.value,
    },
    typeOptions
  )
)

const resultSummary = computed(() => {
  if (pending.value) {
    return 'Actualizando resultados…'
  }

  const count = feed.value?.count ?? 0
  const categoriesCount = availableCategories.value.length
  const categoryLabel =
    categoriesCount === 1
      ? '1 categoría disponible'
      : `${categoriesCount} categorías disponibles`
  const countLabel =
    count === 1 ? '1 resultado disponible' : `${count} resultados disponibles`
  return `${countLabel} · ${categoryLabel}`
})

const summaryCards = computed(() =>
  getDiscoverySummaryCards(feed.value?.summary, feed.value?.count ?? 0)
)
const alertCards = computed(() => getDiscoveryAlertCards(feed.value?.summary))

watch(
  () => route.query,
  (query) => {
    selectedType.value = normalizeQueryValue(query.type)
    selectedCategory.value = normalizeQueryValue(query.category)
    selectedFrom.value = normalizeQueryValue(query.from)
    selectedTo.value = normalizeQueryValue(query.to)
    searchDraft.value = normalizeQueryValue(query.q)
  }
)

const pushQueryState = async () => {
  const nextQuery = {
    ...route.query,
    type: selectedType.value || undefined,
    category: selectedCategory.value || undefined,
    from: selectedFrom.value || undefined,
    to: selectedTo.value || undefined,
    q: searchDraft.value.trim() || undefined,
  }

  await router.replace({ query: nextQuery })
}

const applyFilters = async () => {
  await pushQueryState()
}

const applySearch = async () => {
  await pushQueryState()
}

const setType = async (value) => {
  selectedType.value = value
  selectedCategory.value = ''
  await pushQueryState()
}

const clearFilters = async () => {
  selectedType.value = ''
  selectedCategory.value = ''
  selectedFrom.value = ''
  selectedTo.value = ''
  searchDraft.value = ''
  await router.replace({ query: {} })
}

const removeFilter = async (key) => {
  if (key === 'type') {
    selectedType.value = ''
    selectedCategory.value = ''
  }

  if (key === 'category') {
    selectedCategory.value = ''
  }

  if (key === 'q') {
    searchDraft.value = ''
  }

  if (key === 'from') {
    selectedFrom.value = ''
  }

  if (key === 'to') {
    selectedTo.value = ''
  }

  await pushQueryState()
}

useHead({
  title: 'Descubrir Caguas | Criollos',
  meta: [
    {
      name: 'description',
      content: 'Eventos y gastronomía en el corazón de Puerto Rico.',
    },
  ],
})
</script>
