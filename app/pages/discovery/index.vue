<template>
  <main class="page-wrap catalog-page">
    <header class="catalog-heading">
      <p class="catalog-eyebrow">
        <Compass :size="17" aria-hidden="true" /> Descubre Caguas
      </p>
      <h1 class="brand-display">Sal de la rutina, cerquita.</h1>
      <p>Eventos, lugares y sabores para tu próxima vuelta por Caguas.</p>
    </header>
    <section
      id="discovery-filters"
      class="surface catalog-tools"
      aria-label="Buscar eventos y lugares"
    >
      <form
        aria-describedby="discovery-results-summary"
        @submit.prevent="applySearch"
      >
        <fieldset class="catalog-type-options" aria-label="Tipo de contenido">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            class="catalog-chip"
            :aria-pressed="selectedType === option.value"
            @click="setType(option.value)"
          >
            <component :is="option.icon" :size="16" aria-hidden="true" />{{
              option.label
            }}
          </button>
        </fieldset>
        <div class="catalog-search">
          <div class="catalog-field">
            <label for="discovery-search">Buscar</label>
            <input
              id="discovery-search"
              v-model="searchDraft"
              type="search"
              class="field"
              placeholder="Nombre, lugar o actividad"
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
        <details>
          <summary>
            <SlidersHorizontal :size="17" aria-hidden="true" /> Categoría y
            fechas
          </summary>
          <div class="catalog-filter-grid">
            <div class="catalog-field">
              <label for="discovery-category">Categoría</label>
              <select
                id="discovery-category"
                v-model="selectedCategory"
                class="field"
                @change="applyFilters('category')"
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
            <div class="catalog-field">
              <label for="discovery-from">Desde</label>
              <input
                id="discovery-from"
                v-model="selectedFrom"
                type="date"
                class="field"
                @change="applyFilters('from')"
              />
            </div>
            <div class="catalog-field">
              <label for="discovery-to">Hasta</label>
              <input
                id="discovery-to"
                v-model="selectedTo"
                type="date"
                class="field"
                @change="applyFilters('to')"
              />
            </div>
          </div>
          <p class="catalog-help">
            Las fechas filtran los eventos; los lugares para comer siguen
            disponibles.
          </p>
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
    <section aria-labelledby="discovery-results-heading">
      <div class="catalog-results-head">
        <div>
          <h2 id="discovery-results-heading" class="brand-display">
            {{
              selectedType === 'evento'
                ? 'Eventos para explorar'
                : selectedType === 'gastronomia'
                  ? 'Lugares para probar'
                  : 'Tu próxima salida'
            }}
          </h2>
          <p id="discovery-results-summary" aria-live="polite">
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
        <h3>Buscando las opciones…</h3>
        <p>Un momento mientras consultamos la información.</p>
      </div>
      <div
        v-else-if="error && !displayFeed?.data?.length"
        class="surface catalog-state"
      >
        <CircleAlert :size="28" aria-hidden="true" />
        <h3>No pudimos cargar las opciones</h3>
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

      <div v-else id="discovery-results" class="catalog-grid">
        <article
          v-for="item in visibleItems"
          :key="item.id"
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
            <component
              :is="item.type === 'evento' ? CalendarDays : UtensilsCrossed"
              v-else
              :size="32"
              :stroke-width="1.4"
              aria-hidden="true"
            />
          </div>
          <div class="catalog-body">
            <div class="catalog-tags">
              <span
                class="catalog-tag"
                :class="{ 'catalog-tag-food': item.type === 'gastronomia' }"
                >{{
                  item.type === 'evento'
                    ? 'Evento'
                    : item.type === 'gastronomia'
                      ? 'Gastronomía'
                      : item.tag
                }}</span
              ><span>{{ item.category }}</span>
            </div>
            <h3 class="brand-display">{{ item.title }}</h3>
            <p v-if="item.type === 'evento'" class="catalog-meta">
              <CalendarDays :size="15" aria-hidden="true" /><span>{{
                item.date || 'Fecha por confirmar'
              }}</span>
            </p>
            <p
              v-if="item.subtitle && item.subtitle !== item.category"
              class="catalog-meta"
            >
              <MapPin :size="15" aria-hidden="true" /><span>{{
                item.subtitle
              }}</span>
            </p>
            <p v-if="item.description" class="catalog-description">
              {{ item.description }}
            </p>
          </div>
          <div class="catalog-actions">
            <a
              v-if="safeSourceUrl(item.link)"
              :href="safeSourceUrl(item.link)"
              target="_blank"
              rel="noopener noreferrer"
              class="catalog-source"
              :aria-label="`Ver detalles de ${item.title} en ${sourceName(item.link)} (abre otra pestaña)`"
            >
              <span
                >Ver detalles<small>{{ sourceName(item.link) }}</small></span
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
          Ver más opciones
        </button>
      </div>

      <div
        v-if="
          !pending &&
          !error &&
          displayFeed?.metadata?.state !== 'unavailable' &&
          !displayFeed?.data?.length
        "
        id="discovery-empty-state"
        class="surface catalog-state"
        role="status"
        aria-live="polite"
      >
        <Search :size="28" aria-hidden="true" />
        <h3>
          {{
            hasActiveFilters
              ? 'No hay resultados con estos filtros'
              : 'No hay resultados publicados por ahora'
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
          <a href="#discovery-filters" class="btn-secondary"
            >Volver a filtros</a
          >
        </div>
      </div>
    </section>
    <div v-if="displayFeed?.data?.length" class="catalog-more">
      <p>¿Quieres explorar más?</p>
      <NuxtLink to="/eventos" class="btn-secondary"
        ><CalendarDays :size="16" aria-hidden="true" /> Toda la agenda</NuxtLink
      >
      <NuxtLink to="/gastronomia" class="btn-secondary"
        ><UtensilsCrossed :size="16" aria-hidden="true" /> Todos los
        lugares</NuxtLink
      >
    </div>
  </main>
</template>

<script setup>
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Compass,
  Grid2X2,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from 'lucide-vue-next'
import {
  getActiveDiscoveryFilters,
  getStableAvailableCategories,
} from '../../utils/discoveryFilters'

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

const typeOptions = [
  { value: '', label: 'Todo', icon: Grid2X2 },
  { value: 'evento', label: 'Eventos', icon: CalendarDays },
  { value: 'gastronomia', label: 'Gastronomía', icon: UtensilsCrossed },
]
const selectedType = ref(normalizeQueryValue(appliedQuery.value.type))
const selectedCategory = ref(normalizeQueryValue(appliedQuery.value.category))
const selectedFrom = ref(normalizeQueryValue(appliedQuery.value.from))
const selectedTo = ref(normalizeQueryValue(appliedQuery.value.to))
const searchDraft = ref(normalizeQueryValue(appliedQuery.value.q))
const queryParams = computed(() => ({
  type: normalizeQueryValue(appliedQuery.value.type) || undefined,
  category: normalizeQueryValue(appliedQuery.value.category) || undefined,
  from: normalizeQueryValue(appliedQuery.value.from) || undefined,
  to: normalizeQueryValue(appliedQuery.value.to) || undefined,
  q: normalizeQueryValue(appliedQuery.value.q).trim() || undefined,
}))
const { data: fullFeed, refresh: refreshFullFeed } =
  await useFetch('/api/v1/discovery')
const {
  data: feed,
  pending,
  error,
  refresh,
} = await useFetch('/api/v1/discovery', {
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

const availableCategories = computed(() =>
  getStableAvailableCategories(
    displayFullFeed.value?.data || [],
    selectedType.value
  )
)
const hasActiveFilters = computed(() =>
  Object.values(queryParams.value).some(Boolean)
)
const activeFilters = computed(() =>
  getActiveDiscoveryFilters(
    {
      selectedType: queryParams.value.type,
      selectedCategory: queryParams.value.category,
      searchQuery: queryParams.value.q,
      from: queryParams.value.from,
      to: queryParams.value.to,
    },
    typeOptions
  )
)
const resultSummary = computed(() => {
  const count = displayFeed.value?.count ?? 0
  if (error.value)
    return count
      ? `${count} resultados anteriores · actualización pendiente`
      : 'Resultados sin confirmar'
  if (displayFeed.value?.metadata?.state === 'unavailable')
    return 'Resultados sin confirmar'
  if (pending.value) return 'Actualizando resultados…'
  return count === 1 ? '1 resultado' : `${count} resultados`
})
watch(
  () => appliedQuery.value.type,
  (value) => {
    selectedType.value = normalizeQueryValue(value)
  },
  { flush: 'sync' }
)
watch(
  () => appliedQuery.value.category,
  (value) => {
    selectedCategory.value = normalizeQueryValue(value)
  },
  { flush: 'sync' }
)
watch(
  () => appliedQuery.value.from,
  (value) => {
    selectedFrom.value = normalizeQueryValue(value)
  },
  { flush: 'sync' }
)
watch(
  () => appliedQuery.value.to,
  (value) => {
    selectedTo.value = normalizeQueryValue(value)
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
const applyFilters = (key) => {
  const values = {
    category: selectedCategory.value,
    from: selectedFrom.value,
    to: selectedTo.value,
  }
  return pushQueryState({ [key]: values[key] || undefined })
}
const setType = (value) =>
  pushQueryState({ type: value || undefined, category: undefined })
const clearFilters = () => {
  selectedType.value = ''
  selectedCategory.value = ''
  selectedFrom.value = ''
  selectedTo.value = ''
  searchDraft.value = ''
  return pushQueryState({
    type: undefined,
    category: undefined,
    q: undefined,
    from: undefined,
    to: undefined,
  })
}
const removeFilter = (key) =>
  pushQueryState(
    key === 'type'
      ? { type: undefined, category: undefined }
      : { [key]: undefined }
  )
useHead({
  title: 'Descubre Caguas | Criollos',
  meta: [
    {
      name: 'description',
      content:
        'Encuentra eventos, restaurantes y cafés para tu próxima salida por Caguas.',
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
.catalog-more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
  border-top: 1px solid var(--color-line);
  padding-top: 1.25rem;
}
.catalog-more p {
  margin-right: auto;
  font-weight: 700;
}
.catalog-more .btn-secondary {
  font-size: 0.85rem;
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
@media (max-width: 359px) {
  .catalog-filter-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
