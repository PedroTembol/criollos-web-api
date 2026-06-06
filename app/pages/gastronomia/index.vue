<template>
  <div class="flex min-h-screen flex-col bg-amber-50/30">
    <nav
      aria-label="Atajos de página"
      class="sr-only focus-within:not-sr-only focus-within:px-6 focus-within:py-4 focus-within:bg-white focus-within:border-b focus-within:border-amber-200"
    >
      <div
        class="mx-auto flex max-w-5xl flex-wrap gap-3 text-sm font-bold text-[#9a3412]"
      >
        <a
          href="#gastronomia-filters"
          class="rounded-full border border-[#9a3412]/20 bg-[#9a3412]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#9a3412]"
          >Ir a filtros</a
        >
        <a
          href="#gastronomia-summary-cards"
          class="rounded-full border border-[#9a3412]/20 bg-[#9a3412]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#9a3412]"
          >Ir a resumen editorial</a
        >
        <a
          href="#gastronomia-featured"
          class="rounded-full border border-[#9a3412]/20 bg-[#9a3412]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#9a3412]"
          >Ir a antojos destacados</a
        >
        <a
          href="#gastronomia-spotlights"
          class="rounded-full border border-[#9a3412]/20 bg-[#9a3412]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#9a3412]"
          >Ir a focos por categoría</a
        >
        <a
          href="#gastronomia-routes"
          class="rounded-full border border-[#9a3412]/20 bg-[#9a3412]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#9a3412]"
          >Ir a rutas sugeridas</a
        >
        <a
          href="#gastronomia-results"
          class="rounded-full border border-[#9a3412]/20 bg-[#9a3412]/5 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#9a3412]"
          >Ir a la vitrina</a
        >
      </div>
    </nav>

    <header class="bg-[#9a3412] px-6 py-6 text-white shadow-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="group flex items-center gap-3">
            <span class="text-3xl transition-transform group-hover:scale-110"
              >🍍</span
            >
            <h1 class="text-xl font-bold uppercase tracking-tight">
              Criollos <span class="text-[#FFD700]">Gastronomía</span>
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
          <span class="rounded-full bg-white/20 px-3 py-1.5">Beta</span>
        </div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
      <section
        id="gastronomia-filters"
        class="mb-8 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"
      >
        <div
          class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="mb-2 text-sm font-black uppercase tracking-[0.2em] text-[#9a3412]"
            >
              Ruta gastronómica
            </p>
            <h2 class="text-3xl font-black text-slate-900">
              Explora dónde comer en Caguas con filtros rápidos
            </h2>
            <p class="mt-2 max-w-2xl text-slate-600">
              Navega la vitrina gastronómica del Valle del Turabo por múltiples
              categorías y búsqueda textual, con metadata editorial lista para
              explorar sin mezclarla con el feed de eventos.
            </p>
          </div>
          <p
            id="gastronomia-results-summary"
            class="text-sm text-slate-500"
            aria-live="polite"
          >
            {{ resultSummary }}
          </p>
        </div>

        <form
          class="mt-6 flex flex-col gap-4"
          aria-describedby="gastronomia-results-summary"
          @submit.prevent="applySearch"
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label
                for="gastronomia-search"
                class="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500"
              >
                Buscar
              </label>
              <input
                id="gastronomia-search"
                v-model="searchDraft"
                type="search"
                placeholder="Ej. brunch, café, criolla..."
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner outline-none transition focus:border-[#9a3412]"
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

          <fieldset
            class="rounded-2xl border border-amber-100 bg-amber-50/40 p-4"
          >
            <legend
              class="px-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500"
            >
              Categorías visibles
            </legend>
            <div
              class="mt-3 flex flex-wrap gap-2"
              aria-label="Selecciona una o más categorías gastronómicas"
            >
              <button
                v-for="option in categoryOptions"
                :key="option.category"
                type="button"
                class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#9a3412]"
                :class="
                  isCategorySelected(option.category)
                    ? 'border-[#9a3412] bg-[#9a3412] text-white shadow-sm'
                    : 'border-[#9a3412]/20 bg-white text-[#9a3412] hover:border-[#9a3412]/40 hover:bg-[#9a3412]/5'
                "
                :aria-pressed="isCategorySelected(option.category)"
                @click="toggleCategory(option.category)"
              >
                <span>{{ option.category }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-black"
                  :class="
                    isCategorySelected(option.category)
                      ? 'bg-white/20 text-white'
                      : 'bg-[#9a3412]/10 text-[#9a3412]'
                  "
                >
                  {{ option.count }}
                </span>
              </button>
            </div>
            <p class="mt-3 text-sm text-slate-500">
              Puedes combinar varias categorías y compartir el resultado con
              `?category=` en la URL.
            </p>
          </fieldset>

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
              class="inline-flex items-center gap-2 rounded-full border border-[#9a3412]/20 bg-[#9a3412]/5 px-3 py-1.5 text-sm font-bold text-[#9a3412] transition hover:border-[#9a3412]/40 hover:bg-[#9a3412]/10"
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
        id="gastronomia-summary-cards"
        class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3"
        aria-label="Resumen editorial de la vitrina gastronómica visible"
      >
        <article
          v-for="card in summaryCards"
          :key="card.id"
          class="rounded-3xl border border-amber-200/70 bg-white p-5 shadow-sm"
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
        v-if="featuredPlaceCards.length"
        id="gastronomia-featured"
        class="mb-8 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"
        aria-label="Antojos destacados de la vitrina gastronómica visible"
      >
        <div
          class="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-[#9a3412]"
            >
              Decide rápido
            </p>
            <h2 class="mt-2 text-2xl font-black text-slate-900">
              Antojos destacados del subset visible
            </h2>
          </div>
          <p class="max-w-2xl text-sm text-slate-500">
            Picks concretos seleccionados por el API desde las categorías
            visibles, priorizando variedad, foto y enlace a detalles para
            reducir pasos antes de salir.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <article
            v-for="placeCard in featuredPlaceCards"
            :key="placeCard.id"
            class="flex flex-col overflow-hidden rounded-3xl border border-amber-100 bg-amber-50/60"
          >
            <div
              v-if="placeCard.imageUrl"
              class="h-36 overflow-hidden bg-amber-100"
            >
              <img
                :src="placeCard.imageUrl"
                :alt="placeCard.imageAlt || `Foto de ${placeCard.title}`"
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div class="flex flex-1 flex-col p-5">
              <p
                class="text-xs font-black uppercase tracking-[0.2em] text-amber-700"
              >
                {{ placeCard.category }}
              </p>
              <h3 class="mt-3 text-xl font-black leading-tight text-slate-900">
                {{ placeCard.title }}
              </h3>
              <p class="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                {{ placeCard.body }}
              </p>
              <p
                class="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500"
              >
                {{ placeCard.meta }}
              </p>
              <a
                v-if="placeCard.external"
                :href="placeCard.actionHref"
                target="_blank"
                rel="noreferrer"
                class="mt-5 inline-flex items-center gap-2 self-start rounded-full bg-[#CE1126] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#b00e20]"
              >
                {{ placeCard.actionLabel }}
                <span aria-hidden="true">→</span>
              </a>
              <NuxtLink
                v-else
                :to="placeCard.actionHref"
                class="mt-5 inline-flex items-center gap-2 self-start rounded-full bg-[#CE1126] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#b00e20]"
              >
                {{ placeCard.actionLabel }}
                <span aria-hidden="true">→</span>
              </NuxtLink>
            </div>
          </article>
        </div>
      </section>
      <section
        v-if="categorySpotlightCards.length"
        id="gastronomia-spotlights"
        class="mb-8 rounded-3xl border border-[#9a3412]/15 bg-white p-6 shadow-sm"
        aria-label="Focos por categoría de la vitrina gastronómica visible"
      >
        <div
          class="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-[#9a3412]"
            >
              Explora por sabor
            </p>
            <h2 class="mt-2 text-2xl font-black text-slate-900">
              Focos por categoría
            </h2>
          </div>
          <p class="max-w-2xl text-sm text-slate-500">
            El API resume las categorías dominantes del subset visible con un
            lugar líder y CTA compartible para que web, mobile y asistente no
            tengan que recalcular agrupaciones.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <article
            v-for="spotlight in categorySpotlightCards"
            :key="spotlight.id"
            class="flex flex-col rounded-3xl border border-amber-200 bg-amber-50/70 p-5"
          >
            <div
              v-if="spotlight.imageUrl"
              class="mb-4 h-32 overflow-hidden rounded-2xl bg-amber-100"
            >
              <img
                :src="spotlight.imageUrl"
                :alt="
                  spotlight.leadingPlaceImageAlt ||
                  `Foto de ${spotlight.category}`
                "
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-amber-700"
            >
              {{ spotlight.category }}
            </p>
            <h3 class="mt-3 text-2xl font-black text-slate-900 leading-tight">
              {{ spotlight.title }}
            </h3>
            <p class="mt-3 flex-1 text-sm text-slate-600 leading-relaxed">
              {{ spotlight.body }}
            </p>
            <p
              class="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500"
            >
              {{ spotlight.meta }}
            </p>
            <NuxtLink
              :to="spotlight.actionHref"
              class="mt-5 inline-flex items-center gap-2 self-start rounded-full bg-[#9a3412] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#7c2d12]"
            >
              {{ spotlight.actionLabel }}
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </article>
        </div>
      </section>

      <section
        v-if="routeCards.length"
        id="gastronomia-routes"
        class="mb-8 rounded-3xl border border-[#9a3412]/15 bg-white p-6 shadow-sm"
        aria-label="Rutas gastronómicas sugeridas para el subset visible"
      >
        <div
          class="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-[#9a3412]"
            >
              Planes listos
            </p>
            <h2 class="mt-2 text-2xl font-black text-slate-900">
              Rutas sugeridas por mood
            </h2>
          </div>
          <p class="max-w-2xl text-sm text-slate-500">
            El API agrupa el subset visible en planes accionables para que web,
            mobile o asistente puedan recomendar sin recalcular categorías.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article
            v-for="routeCard in routeCards"
            :key="routeCard.id"
            class="flex flex-col rounded-3xl border border-amber-200 bg-amber-50/70 p-5"
          >
            <p
              class="text-xs font-black uppercase tracking-[0.2em] text-amber-700"
            >
              Ruta sugerida
            </p>
            <h3 class="mt-3 text-2xl font-black text-slate-900 leading-tight">
              {{ routeCard.title }}
            </h3>
            <p class="mt-3 flex-1 text-sm text-slate-600 leading-relaxed">
              {{ routeCard.body }}
            </p>
            <p
              class="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500"
            >
              {{ routeCard.meta }}
            </p>
            <NuxtLink
              :to="routeCard.actionHref"
              class="mt-5 inline-flex items-center gap-2 self-start rounded-full bg-[#9a3412] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#7c2d12]"
            >
              {{ routeCard.actionLabel }}
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </article>
        </div>
      </section>

      <section
        v-if="alertCards.length"
        class="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3"
        aria-label="Alertas editoriales de la vitrina gastronómica visible"
      >
        <article
          v-for="alert in alertCards"
          :key="alert.id"
          class="rounded-3xl border p-5 shadow-sm"
          :class="
            alert.severity === 'warning'
              ? 'border-[#9a3412]/20 bg-[#9a3412]/5'
              : 'border-amber-200 bg-amber-50/80'
          "
        >
          <p
            class="text-xs font-black uppercase tracking-[0.2em]"
            :class="
              alert.severity === 'warning' ? 'text-[#9a3412]' : 'text-amber-700'
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

      <div
        v-if="pending"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="h-12 w-12 animate-spin rounded-full border-b-2 border-[#9a3412]"
        ></div>
        <p class="mt-4 font-medium text-slate-500">
          Sirviendo la mesa criolla...
        </p>
      </div>

      <div
        v-else-if="error"
        class="rounded-3xl border border-red-100 bg-red-50 p-8 text-center"
      >
        <span class="mb-4 block text-4xl">⚠️</span>
        <h2 class="mb-2 text-xl font-bold text-red-800">
          No pudimos cargar la vitrina gastronómica
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
        id="gastronomia-results"
        class="grid grid-cols-1 gap-8 md:grid-cols-2"
        aria-live="polite"
      >
        <article
          v-for="item in feed?.data"
          :key="item.id"
          class="group flex flex-col overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-sm transition-all hover:shadow-xl"
        >
          <div v-if="item.imageUrl" class="relative h-64 overflow-hidden">
            <img
              :src="item.imageUrl"
              :alt="item.imageAlt || item.title"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              class="absolute left-4 top-4 rounded-full bg-[#9a3412] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
            >
              {{ item.category }}
            </div>
          </div>

          <div class="flex flex-1 flex-col p-8">
            <div class="mb-4 flex items-start justify-between gap-3">
              <span
                class="text-xs font-bold uppercase tracking-widest text-[#9a3412]"
                >{{ item.category }}</span
              >
              <span class="text-xs font-medium text-slate-400">{{
                item.categories?.slice(0, 2).join(' · ')
              }}</span>
            </div>

            <h3
              class="mb-2 text-2xl font-black leading-tight text-slate-800 transition-colors group-hover:text-[#9a3412]"
            >
              {{ item.title }}
            </h3>

            <p class="mb-4 text-sm font-bold text-slate-500">
              {{ item.summary }}
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
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="!pending && !error && (!feed?.data || feed?.data.length === 0)"
        id="gastronomia-empty-state"
        class="rounded-3xl border border-dashed border-amber-200 bg-white py-20 text-center"
        role="status"
        aria-live="polite"
      >
        <span class="mb-4 block text-5xl">🍽️</span>
        <p class="text-lg text-slate-600">
          No encontramos lugares para ese filtro.
        </p>
        <p class="mt-2 text-sm text-slate-500">
          Prueba otra categoría o limpia la búsqueda para volver a la vitrina
          completa.
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl bg-[#9a3412] px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#7c2d12]"
            @click="clearFilters"
          >
            Limpiar filtros
          </button>
          <a
            href="#gastronomia-filters"
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
          © 2026 Criollos · La ruta gastronómica de Caguas 🍍
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import {
  getActiveGastronomyFilters,
  getGastronomyCategoryOptions,
  normalizeGastronomyQueryList,
} from '../../utils/gastronomyFilters'
import {
  getGastronomyAlertCards,
  getGastronomyCategorySpotlightCards,
  getGastronomyFeaturedPlaceCards,
  getGastronomySuggestedRouteCards,
  getGastronomySummaryCards,
} from '../../utils/gastronomySummary'

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

const selectedCategories = ref(
  normalizeGastronomyQueryList(route.query.category)
)
const searchDraft = ref(normalizeQueryValue(route.query.q))

const queryParams = computed(() => {
  const params = {}

  if (selectedCategories.value.length)
    params.category = selectedCategories.value.join(',')

  const trimmedQuery = searchDraft.value.trim()
  if (trimmedQuery) params.q = trimmedQuery

  return params
})

const fetchOptions = {
  headers: {
    'x-api-key': apiKey,
  },
}

const { data: fullFeed } = await useFetch('/api/v1/gastronomia', fetchOptions)

const {
  data: feed,
  pending,
  error,
  refresh,
} = await useFetch('/api/v1/gastronomia', {
  ...fetchOptions,
  query: queryParams,
  watch: [queryParams],
})

const categoryOptions = computed(() =>
  getGastronomyCategoryOptions(
    fullFeed.value?.summary?.categoryBreakdown || [],
    fullFeed.value?.summary?.categories || []
  )
)

const hasActiveFilters = computed(() =>
  Boolean(selectedCategories.value.length || searchDraft.value.trim())
)

const activeFilters = computed(() =>
  getActiveGastronomyFilters({
    selectedCategories: selectedCategories.value,
    searchQuery: searchDraft.value,
  })
)

const resultSummary = computed(() => {
  if (pending.value) {
    return 'Actualizando vitrina…'
  }

  const count = feed.value?.count ?? 0
  const categoriesCount = categoryOptions.value.length
  const selectedCount = selectedCategories.value.length
  const categoryLabel =
    categoriesCount === 1
      ? '1 categoría disponible'
      : `${categoriesCount} categorías disponibles`
  const countLabel =
    count === 1 ? '1 lugar visible' : `${count} lugares visibles`
  const selectedLabel = selectedCount
    ? ` · ${selectedCount} categorías activas`
    : ''
  return `${countLabel} · ${categoryLabel}${selectedLabel}`
})

const summaryCards = computed(() =>
  getGastronomySummaryCards(feed.value?.summary, feed.value?.count ?? 0)
)
const featuredPlaceCards = computed(() =>
  getGastronomyFeaturedPlaceCards(feed.value?.summary)
)
const categorySpotlightCards = computed(() =>
  getGastronomyCategorySpotlightCards(feed.value?.summary)
)
const routeCards = computed(() =>
  getGastronomySuggestedRouteCards(feed.value?.summary)
)
const alertCards = computed(() => getGastronomyAlertCards(feed.value?.summary))

watch(
  () => route.query,
  (query) => {
    selectedCategories.value = normalizeGastronomyQueryList(query.category)
    searchDraft.value = normalizeQueryValue(query.q)
  }
)

const pushQueryState = async () => {
  const nextQuery = {
    ...route.query,
    category: selectedCategories.value.length
      ? selectedCategories.value.join(',')
      : undefined,
    q: searchDraft.value.trim() || undefined,
  }

  await router.replace({ query: nextQuery })
}

const applySearch = async () => {
  await pushQueryState()
}

const clearFilters = async () => {
  selectedCategories.value = []
  searchDraft.value = ''
  await router.replace({ query: {} })
}

const isCategorySelected = (category) =>
  selectedCategories.value.includes(category)

const toggleCategory = async (category) => {
  selectedCategories.value = isCategorySelected(category)
    ? selectedCategories.value.filter((entry) => entry !== category)
    : [...selectedCategories.value, category].sort((left, right) =>
        left.localeCompare(right, 'es')
      )

  await pushQueryState()
}

const removeFilter = async (key) => {
  if (key.startsWith('category:')) {
    const category = key.slice('category:'.length)
    selectedCategories.value = selectedCategories.value.filter(
      (entry) => entry !== category
    )
  }

  if (key === 'q') {
    searchDraft.value = ''
  }

  await pushQueryState()
}

useHead({
  title: 'Gastronomía Caguas | Criollos',
  meta: [
    {
      name: 'description',
      content: 'Vitrina pública para descubrir dónde comer en Caguas.',
    },
  ],
})
</script>
