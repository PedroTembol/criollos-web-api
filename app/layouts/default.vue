<template>
  <div class="site-shell">
    <a class="skip-link" href="#contenido-principal">Saltar al contenido</a>

    <header
      class="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[rgba(246,240,230,0.92)] pt-[var(--safe-top)] backdrop-blur-md"
    >
      <div
        class="page-wrap flex flex-wrap items-center justify-between gap-3 py-3"
      >
        <NuxtLink
          to="/"
          class="brand-display group flex min-h-[var(--tap)] items-center gap-2.5 text-[var(--color-ink)] no-underline"
          aria-label="Criollos, inicio"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-navy)] text-[var(--color-pineapple)] transition-transform duration-300 group-hover:scale-105"
          >
            <BrandMark class-name="h-6 w-5" />
          </span>
          <span class="leading-none">
            <span class="block text-xl font-bold tracking-tight md:text-2xl"
              >Criollos</span
            >
            <span
              class="mt-0.5 block font-[family-name:var(--font-body)] text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]"
              >Caguas</span
            >
          </span>
        </NuxtLink>

        <nav
          class="hidden items-center gap-1 md:flex"
          aria-label="Navegación principal"
        >
          <NuxtLink
            v-for="item in primaryLinks"
            :key="item.to"
            :to="item.to"
            class="inline-flex min-h-[var(--tap)] items-center rounded-full px-3.5 text-sm font-bold no-underline transition-colors"
            :aria-current="isCurrent(item.to) ? 'page' : undefined"
            :class="
              isCurrent(item.to)
                ? 'bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)] hover:text-white'
                : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-cream-deep)] hover:text-[var(--color-ink)]'
            "
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <nav
          class="flex flex-wrap items-center gap-2"
          aria-label="Más opciones"
        >
          <NuxtLink
            v-for="item in secondaryLinks"
            :key="item.to"
            :to="item.to"
            class="inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm font-bold text-[var(--color-ink-soft)] no-underline transition-colors hover:border-[var(--color-blue)] hover:text-[var(--color-navy)]"
            :aria-current="isCurrent(item.to) ? 'page' : undefined"
          >
            <component :is="item.icon" class="h-4 w-4" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </div>
    </header>

    <div id="contenido-principal" tabindex="-1" class="site-main">
      <slot />
    </div>

    <footer
      class="mt-auto border-t border-[var(--color-line)] bg-[var(--color-ink)] text-[var(--color-cream)]"
    >
      <div
        class="page-wrap flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between"
      >
        <div class="flex items-center gap-3">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-pineapple)] text-[var(--color-ink)]"
          >
            <BrandMark class-name="h-5 w-4" />
          </span>
          <div>
            <p class="brand-display text-lg font-bold">Criollos</p>
            <p class="text-sm text-[rgba(246,240,230,0.72)]">
              Muévete, encuentra planes y descubre dónde comer en Caguas.
            </p>
          </div>
        </div>
        <p class="text-sm text-[rgba(246,240,230,0.65)]">
          Un proyecto independiente, hecho para Caguas.
        </p>
      </div>
    </footer>

    <nav class="mobile-primary-nav" aria-label="Accesos principales">
      <NuxtLink
        v-for="item in primaryLinks.slice(1)"
        :key="`mobile-${item.to}`"
        :to="item.to"
        :aria-current="isCurrent(item.to) ? 'page' : undefined"
      >
        <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
        <span>{{ item.short }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup>
import {
  Bus,
  CalendarDays,
  Compass,
  MapPin,
  UtensilsCrossed,
} from 'lucide-vue-next'

const route = useRoute()

const primaryLinks = [
  { to: '/', label: 'Inicio', short: 'Inicio', icon: Compass },
  { to: '/transporte', label: 'Transporte', short: 'Transporte', icon: Bus },
  { to: '/eventos', label: 'Eventos', short: 'Eventos', icon: CalendarDays },
  {
    to: '/gastronomia',
    label: 'Gastronomía',
    short: 'Comida',
    icon: UtensilsCrossed,
  },
]

const secondaryLinks = [
  { to: '/discovery', label: 'Explorar', icon: Compass },
  { to: '/cerca', label: 'Cerca', icon: MapPin },
]

function isCurrent(path) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(`${path}/`)
}

useHead({
  htmlAttrs: {
    lang: 'es-PR',
  },
  titleTemplate: (title) =>
    title?.includes('Criollos')
      ? title
      : title
        ? `${title} | Criollos`
        : 'Criollos · Tu día en Caguas',
  meta: [
    {
      name: 'description',
      content:
        'Consulta rutas y paradas del trolley, encuentra eventos y descubre dónde comer en Caguas.',
    },
    {
      name: 'theme-color',
      content: '#16365f',
    },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/criollos.svg' },
    {
      rel: 'preload',
      href: '/fonts/figtree-latin.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    },
  ],
})
</script>
