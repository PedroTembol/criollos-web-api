<template>
  <main class="page-wrap catalog-page">
    <header class="catalog-heading">
      <p class="catalog-eyebrow">
        <UtensilsCrossed :size="17" aria-hidden="true" /> Sabores de Caguas
      </p>
      <h1 class="brand-display">¿Qué se te antoja?</h1>
      <p>
        Descubre dónde comer, tomar un café o compartir algo rico. Consulta
        horarios y detalles antes de ir.
      </p>
    </header>
    <section
      id="gastronomia-filters"
      class="surface catalog-tools"
      aria-label="Buscar lugares para comer"
    >
      <form
        aria-describedby="gastronomia-results-summary"
        @submit.prevent="applySearch"
      >
        <div class="catalog-search">
          <div class="catalog-field">
            <label for="gastronomia-search">Buscar</label>
            <input
              id="gastronomia-search"
              v-model="searchDraft"
              type="search"
              class="field"
              placeholder="Nombre, café o tipo de comida"
            />
          </div>
          <button type="submit" class="btn-primary">
            <Search :size="17" aria-hidden="true" /> Buscar
          </button>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn-secondary"
            @click="clearFilters"
          >
            Limpiar
          </button>
        </div>
        <details v-if="categoryOptions.length">
          <summary>
            <SlidersHorizontal :size="17" aria-hidden="true" /> Tipos de comida
          </summary>
          <fieldset>
            <legend class="catalog-help">
              Puedes elegir más de una categoría.
            </legend>
            <div class="catalog-chips">
              <button
                v-for="option in categoryOptions"
                :key="option.category"
                type="button"
                class="catalog-chip"
                :aria-pressed="isCategorySelected(option.category)"
                @click="toggleCategory(option.category)"
              >
                <Check
                  v-if="isCategorySelected(option.category)"
                  :size="14"
                  aria-hidden="true"
                />
                <span>{{ option.category }}</span
                ><span v-if="option.count" class="catalog-chip-count">{{
                  option.count
                }}</span>
              </button>
            </div>
          </fieldset>
        </details>

        <div
          v-if="activeFilters.length"
          class="catalog-chips catalog-active"
          aria-label="Filtros activos"
        >
          <button
            v-for="filter in activeFilters"
            :key="filter.key"
            type="button"
            class="catalog-chip"
            :aria-label="`Quitar filtro de ${filter.label.toLowerCase()}: ${filter.value}`"
            @click="removeFilter(filter.key)"
          >
            <span>{{ filter.label }}: {{ filter.value }}</span
            ><X :size="14" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
    <section aria-labelledby="gastronomia-results-heading">
      <div class="catalog-results-head">
        <div>
          <h2 id="gastronomia-results-heading" class="brand-display">
            Dónde comer
          </h2>
          <p id="gastronomia-results-summary" aria-live="polite">
            {{ resultSummary }}
          </p>
        </div>
      </div>

      <FeedStatus
        :metadata="displayFeed?.metadata"
        :pending="pending || refreshing"
        :error="Boolean(error)"
        :has-data="Boolean(displayFeed?.data?.length)"
        @retry="retryFeed"
      />

      <div
        v-if="pending && !displayFeed?.data?.length"
        class="surface catalog-state"
        role="status"
      >
        <LoaderCircle :size="28" class="animate-spin" aria-hidden="true" />
        <h3>Buscando los lugares…</h3>
        <p>Un momento mientras consultamos la información.</p>
      </div>
      <div
        v-else-if="error && !displayFeed?.data?.length"
        class="surface catalog-state"
      >
        <CircleAlert :size="28" aria-hidden="true" />
        <h3>No pudimos cargar los lugares</h3>
        <p>
          La información no está disponible ahora. Vuelve a intentar en unos
          minutos.
        </p>
        <button
          type="button"
          class="btn-primary"
          :disabled="refreshing || pending"
          @click="retryFeed"
        >
          Reintentar
        </button>
      </div>

      <div v-else id="gastronomia-results" class="catalog-grid">
        <article
          v-for="item in visibleItems"
          :key="item.id"
          :id="`place-${item.id}`"
          class="surface catalog-card"
        >
          <div class="catalog-media">
            <img
              v-if="safeSourceUrl(item.imageUrl) && !failedImages.has(item.id)"
              :src="safeSourceUrl(item.imageUrl)"
              :alt="item.imageAlt || item.title"
              loading="lazy"
              decoding="async"
              @error="imageFailed(item.id)"
            />
            <UtensilsCrossed
              v-else
              :size="32"
              :stroke-width="1.4"
              aria-hidden="true"
            />
          </div>
          <div class="catalog-body">
            <div class="catalog-tags">
              <span
                v-for="category in (item.categories?.length
                  ? item.categories
                  : [item.category]
                ).slice(0, 2)"
                :key="category"
                class="catalog-tag catalog-tag-food"
                >{{ category }}</span
              >
            </div>
            <h3 class="brand-display">{{ item.title }}</h3>
            <p
              v-if="item.summary || item.description"
              class="catalog-description"
            >
              {{ item.summary || item.description }}
            </p>
          </div>
          <div class="catalog-actions">
            <a
              v-if="safeSourceUrl(item.sourceUrl)"
              :href="safeSourceUrl(item.sourceUrl)"
              target="_blank"
              rel="noopener noreferrer"
              class="catalog-source"
              :aria-label="`Ver detalles de ${item.title} en ${sourceName(item.sourceUrl)} (abre otra pestaña)`"
            >
              <span
                >Ver detalles<small>{{
                  sourceName(item.sourceUrl)
                }}</small></span
              ><ArrowUpRight :size="17" aria-hidden="true" />
            </a>
            <span v-else class="catalog-source-missing"
              >Sin enlace de la fuente</span
            >
          </div>
        </article>
      </div>

      <div v-if="hasMoreResults" class="catalog-pagination">
        <p aria-live="polite">
          Mostrando {{ visibleItems.length }} de
          {{ displayFeed?.count ?? displayFeed?.data?.length }}.
        </p>
        <button
          type="button"
          class="btn-secondary"
          :disabled="pending"
          @click="showMoreResults"
        >
          Ver más lugares
        </button>
      </div>

      <div
        v-if="
          !pending &&
          !error &&
          displayFeed?.metadata?.state !== 'unavailable' &&
          !displayFeed?.data?.length
        "
        id="gastronomia-empty-state"
        class="surface catalog-state"
        role="status"
        aria-live="polite"
      >
        <Search :size="28" aria-hidden="true" />
        <h3>
          {{
            hasActiveFilters
              ? 'No hay lugares con estos filtros'
              : 'No hay lugares publicados por ahora'
          }}
        </h3>
        <p>
          {{
            hasActiveFilters
              ? 'Prueba otra búsqueda o quita los filtros para ver más opciones.'
              : 'Vuelve más tarde o actualiza para consultar la fuente otra vez.'
          }}
        </p>
        <div class="catalog-state-actions">
          <button
            v-if="hasActiveFilters"
            type="button"
            class="btn-primary"
            @click="clearFilters"
          >
            Limpiar filtros
          </button>
          <button
            v-else
            type="button"
            class="btn-primary"
            :disabled="refreshing || pending"
            @click="retryFeed"
          >
            Actualizar
          </button>
          <a href="#gastronomia-filters" class="btn-secondary"
            >Volver a filtros</a
          >
        </div>
      </div>
    </section>
    <details
      v-if="routeCards.length && displayFeed?.data?.length"
      id="gastronomia-routes"
      class="surface catalog-ideas"
    >
      <summary>
        <Sparkles :size="18" aria-hidden="true" /> Ideas para combinar paradas
      </summary>
      <div class="catalog-idea-grid">
        <article v-for="routeCard in routeCards" :key="routeCard.id">
          <h3>{{ routeCard.title }}</h3>
          <p>
            {{ routeCard.placeTitles?.join(' · ') || routeCard.description }}
          </p>
          <NuxtLink
            v-if="safeRouteLink(routeCard.actionHref)"
            :to="safeRouteLink(routeCard.actionHref)"
            class="catalog-source"
            >Ver estos lugares <ArrowRight :size="16" aria-hidden="true"
          /></NuxtLink>
        </article>
      </div>
    </details>
  </main>
</template>

<script setup>
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-vue-next'
import {
  getActiveGastronomyFilters,
  getGastronomyCategoryOptions,
  normalizeGastronomyQueryList,
} from '../../utils/gastronomyFilters'

const safeSourceUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
const sourceName = (value) => {
  const href = safeSourceUrl(value)
  return href ? new URL(href).hostname.replace(/^www\./, '') : ''
}
const failedImages = ref(new Set())
const imageFailed = (id) => {
  failedImages.value = new Set([...failedImages.value, id])
}
const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) return value[0] || ''
  return typeof value === 'string' ? value : ''
}
const route = useRoute()
const router = useRouter()
const pagePath = route.path
const appliedQuery = computed(() =>
  router.currentRoute.value.path === pagePath
    ? router.currentRoute.value.query
    : route.query
)

const selectedCategories = ref(
  normalizeGastronomyQueryList(appliedQuery.value.category)
)
const searchDraft = ref(normalizeQueryValue(appliedQuery.value.q))
const queryParams = computed(() => ({
  category:
    normalizeGastronomyQueryList(appliedQuery.value.category).join(',') ||
    undefined,
  q: normalizeQueryValue(appliedQuery.value.q).trim() || undefined,
}))
const { data: fullFeed, refresh: refreshFullFeed } = await useFetch(
  '/api/v1/gastronomia'
)
const {
  data: feed,
  pending,
  error,
  refresh,
} = await useFetch('/api/v1/gastronomia', {
  query: queryParams,
  watch: [queryParams],
})

const refreshing = ref(false)
const lastSuccessfulFeed = shallowRef(feed.value)
watch(feed, (value) => {
  if (value?.data) lastSuccessfulFeed.value = value
})
const displayFeed = computed(() => feed.value || lastSuccessfulFeed.value)
const lastSuccessfulFullFeed = shallowRef(fullFeed.value)
watch(fullFeed, (value) => {
  if (value?.data && value.metadata?.state !== 'unavailable')
    lastSuccessfulFullFeed.value = value
})
const displayFullFeed = computed(() =>
  fullFeed.value && fullFeed.value.metadata?.state !== 'unavailable'
    ? fullFeed.value
    : lastSuccessfulFullFeed.value
)
const visibleLimit = ref(24)
const visibleItems = computed(() =>
  (displayFeed.value?.data || []).slice(0, visibleLimit.value)
)
const hasMoreResults = computed(
  () => (displayFeed.value?.data?.length || 0) > visibleLimit.value
)
watch(queryParams, () => {
  visibleLimit.value = 24
})
const showMoreResults = () => {
  visibleLimit.value += 24
}
const retryFeed = async () => {
  if (refreshing.value || pending.value) return
  refreshing.value = true
  try {
    await Promise.allSettled([refresh(), refreshFullFeed()])
  } finally {
    refreshing.value = false
  }
}

const categoryOptions = computed(() =>
  getGastronomyCategoryOptions(
    displayFullFeed.value?.summary?.categoryBreakdown || [],
    displayFullFeed.value?.summary?.categories || []
  )
)
const hasActiveFilters = computed(() =>
  Object.values(queryParams.value).some(Boolean)
)
const activeFilters = computed(() =>
  getActiveGastronomyFilters({
    selectedCategories: normalizeGastronomyQueryList(
      appliedQuery.value.category
    ),
    searchQuery: queryParams.value.q,
  })
)
const resultSummary = computed(() => {
  const count = displayFeed.value?.count ?? 0
  if (error.value)
    return count
      ? `${count} lugares anteriores · actualización pendiente`
      : 'Lugares sin confirmar'
  if (displayFeed.value?.metadata?.state === 'unavailable')
    return 'Lugares sin confirmar'
  if (pending.value) return 'Actualizando lugares…'
  return count === 1 ? '1 lugar' : `${count} lugares`
})
const routeCards = computed(
  () => displayFeed.value?.summary?.suggestedRoutes?.filter(Boolean) || []
)
const safeRouteLink = (value) =>
  typeof value === 'string' && /^\/gastronomia(?:\?|$)/.test(value)
    ? value
    : null
watch(
  () => appliedQuery.value.category,
  (value) => {
    selectedCategories.value = normalizeGastronomyQueryList(value)
  },
  { flush: 'sync' }
)
watch(
  () => appliedQuery.value.q,
  (value) => {
    searchDraft.value = normalizeQueryValue(value)
  },
  { flush: 'sync' }
)
let pendingQuery = null
const getQueryState = () => pendingQuery || appliedQuery.value
const pushQueryState = async (patch) => {
  const nextQuery = { ...getQueryState(), ...patch }
  pendingQuery = nextQuery
  try {
    await router.push({ path: pagePath, query: nextQuery })
  } finally {
    if (pendingQuery === nextQuery) pendingQuery = null
  }
}
const applySearch = () =>
  pushQueryState({ q: searchDraft.value.trim() || undefined })
const clearFilters = () => {
  selectedCategories.value = []
  searchDraft.value = ''
  return pushQueryState({ category: undefined, q: undefined })
}
const isCategorySelected = (category) =>
  selectedCategories.value.includes(category)
const toggleCategory = (category) => {
  const currentCategories = normalizeGastronomyQueryList(
    getQueryState().category
  )
  const categories = currentCategories.includes(category)
    ? currentCategories.filter((entry) => entry !== category)
    : [...currentCategories, category].sort((left, right) =>
        left.localeCompare(right, 'es')
      )
  selectedCategories.value = categories
  return pushQueryState({ category: categories.join(',') || undefined })
}
const removeFilter = (key) => {
  if (key === 'q') return pushQueryState({ q: undefined })
  if (key.startsWith('category:')) {
    const categories = normalizeGastronomyQueryList(
      getQueryState().category
    ).filter((entry) => entry !== key.slice('category:'.length))
    return pushQueryState({ category: categories.join(',') || undefined })
  }
}
useHead({
  title: 'Dónde comer en Caguas | Criollos',
  meta: [
    {
      name: 'description',
      content:
        'Descubre restaurantes, cafés y lugares para comer en Caguas. Busca por nombre o combina tus tipos de comida favoritos.',
    },
  ],
})
</script>

<style scoped>
.catalog-page {
  padding-block: 2.5rem 3rem;
}
.catalog-heading {
  margin-bottom: 1.5rem;
}
.catalog-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-blue);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.catalog-heading h1 {
  margin-top: 0.45rem;
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 700;
  line-height: 1.18;
}
.catalog-heading > p:last-child {
  margin-top: 0.7rem;
  max-width: 44rem;
  color: var(--color-muted);
}
.catalog-tools {
  margin-bottom: 1.5rem;
  padding: 1.2rem;
}
.catalog-search {
  display: flex;
  align-items: end;
  gap: 0.75rem;
}
.catalog-search > .catalog-field {
  flex: 1;
  min-width: 0;
}
.catalog-field label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
}
.catalog-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 0.8rem;
}
.catalog-tools details {
  margin-top: 0.7rem;
}
.catalog-tools summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  width: fit-content;
  cursor: pointer;
  color: var(--color-navy);
  font-size: 0.9rem;
  font-weight: 700;
}
.catalog-tools summary::after {
  content: '+';
  margin-left: 0.35rem;
  font-size: 1.25rem;
  font-weight: 400;
}
.catalog-tools details[open] summary::after {
  content: '−';
}
.catalog-help {
  margin-top: 0.65rem;
  color: var(--color-muted);
  font-size: 0.85rem;
}
.catalog-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.catalog-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  color: var(--color-navy);
  background: var(--color-surface);
  font-size: 0.85rem;
  font-weight: 700;
}
.catalog-chip[aria-pressed='true'] {
  border-color: var(--color-navy);
  background: var(--color-navy);
  color: white;
}
.catalog-chip:hover {
  border-color: var(--color-blue);
}
.catalog-active .catalog-chip {
  background: var(--color-blue-soft);
}
.catalog-chip-count {
  font-size: 0.75rem;
  font-weight: 500;
}
.catalog-results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin: 1.5rem 0 1rem;
}
.catalog-results-head h2 {
  font-size: 1.3rem;
  font-weight: 700;
}
.catalog-results-head p {
  margin-top: 0.2rem;
  color: var(--color-muted);
  font-size: 0.85rem;
}
.catalog-results-head .btn-secondary {
  font-size: 0.85rem;
}
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
}
.catalog-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  scroll-margin-top: 7rem;
  box-shadow: none;
}
.catalog-media {
  display: grid;
  place-items: center;
  height: 210px;
  overflow: hidden;
  background: var(--color-cream-deep);
  color: var(--color-navy);
}
.catalog-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.catalog-body {
  padding: 1.15rem 1.15rem 0.5rem;
}
.catalog-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
  font-size: 0.73rem;
  font-weight: 700;
  color: var(--color-navy);
}
.catalog-tag {
  border-radius: 0.3rem;
  padding: 0.2rem 0.45rem;
  background: var(--color-blue-soft);
}
.catalog-tag-food {
  background: var(--color-ochre-soft);
  color: var(--color-warning);
}
.catalog-body h3 {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
.catalog-meta {
  display: flex;
  align-items: start;
  gap: 0.4rem;
  margin-top: 0.55rem;
  color: var(--color-ink-soft);
  font-size: 0.85rem;
}
.catalog-meta svg {
  flex-shrink: 0;
  margin-top: 0.1rem;
}
.catalog-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  margin-top: 0.7rem;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--color-muted);
}
.catalog-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-top: auto;
  padding: 0.8rem 1.15rem 1rem;
}
.catalog-source {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  color: var(--color-navy);
  font-size: 0.85rem;
  font-weight: 700;
}
.catalog-source:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.catalog-source span {
  display: flex;
  flex-direction: column;
}
.catalog-source small {
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 400;
  overflow-wrap: anywhere;
}
.catalog-save {
  font-size: 0.8rem;
  padding: 0.55rem 0.8rem;
}
.catalog-source-missing {
  font-size: 0.8rem;
  color: var(--color-muted);
}
.catalog-state {
  padding: 2.5rem 1.5rem;
  text-align: center;
}
.catalog-state > svg {
  display: block;
  margin: 0 auto 0.8rem;
  color: var(--color-blue);
}
.catalog-state h3 {
  font-size: 1.2rem;
  font-weight: 700;
}
.catalog-state p {
  max-width: 30rem;
  margin: 0.6rem auto 1.1rem;
  color: var(--color-muted);
}
.catalog-state-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.catalog-ideas {
  margin-top: 2rem;
  padding: 0.3rem 1.1rem;
  box-shadow: none;
}
.catalog-ideas > summary {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 56px;
  cursor: pointer;
  color: var(--color-navy);
  font-weight: 700;
}
.catalog-ideas > summary::after {
  content: '+';
  margin-left: auto;
  font-size: 1.3rem;
  font-weight: 400;
}
.catalog-ideas[open] > summary::after {
  content: '−';
}
.catalog-idea-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  padding: 0.5rem 0 1rem;
}
.catalog-idea-grid article {
  padding: 1rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
}
.catalog-idea-grid h3 {
  font-weight: 700;
  line-height: 1.35;
}
.catalog-idea-grid p {
  margin-block: 0.6rem;
  color: var(--color-muted);
  font-size: 0.85rem;
}
.catalog-type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.catalog-type-options .catalog-chip {
  gap: 0.4rem;
}
@media (min-width: 1100px) {
  .catalog-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .catalog-page {
    padding-top: 1.5rem;
  }
  .catalog-heading {
    margin-bottom: 1.1rem;
  }
  .catalog-heading > p:last-child {
    font-size: 0.9rem;
  }
  .catalog-tools {
    padding: 0.9rem;
    margin-bottom: 1rem;
  }
  .catalog-search {
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .catalog-search .btn-primary {
    padding-inline: 1rem;
  }
  .catalog-search .btn-secondary {
    flex-basis: 100%;
  }
  .catalog-filter-grid {
    grid-template-columns: 1fr 1fr;
  }
  .catalog-filter-grid > .catalog-field:first-child {
    grid-column: 1 / -1;
  }
  .catalog-grid {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }
  .catalog-card {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-content: start;
  }
  .catalog-media {
    height: 100%;
    min-height: 145px;
  }
  .catalog-media img {
    min-height: 145px;
  }
  .catalog-body {
    padding: 0.85rem 0.85rem 0.3rem;
  }
  .catalog-body h3 {
    font-size: 1.08rem;
  }
  .catalog-tags {
    font-size: 0.68rem;
    margin-bottom: 0.4rem;
  }
  .catalog-description {
    -webkit-line-clamp: 2;
    font-size: 0.8rem;
    line-height: 1.45;
    margin-top: 0.5rem;
  }
  .catalog-meta {
    font-size: 0.77rem;
  }
  .catalog-actions {
    grid-column: 1 / -1;
    border-top: 1px solid var(--color-line);
    padding: 0.4rem 0.85rem;
  }
  .catalog-results-head {
    margin-top: 1rem;
  }
  .catalog-idea-grid {
    grid-template-columns: 1fr;
  }
}
.catalog-pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
.catalog-pagination p {
  color: var(--color-muted);
  font-size: 0.85rem;
}
</style>
