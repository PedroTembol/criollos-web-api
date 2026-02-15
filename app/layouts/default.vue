<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <slot />
  </div>
</template>

<script setup>
useHead({
  htmlAttrs: {
    lang: 'es-PR',
  },
  title: 'Criollos - El Corazón de Puerto Rico',
  meta: [
    {
      name: 'description',
      content:
        'Plataforma digital para el pueblo de Caguas. Tracking de trolleys, eventos, gastronomía y más.',
    },
  ],
  link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
})
</script>

<style>
body {
  @apply antialiased;
}
</style>
