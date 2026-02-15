// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare-pages',
    prerender: {
      routes: ['/'],
    },
  },
  compatibilityDate: '2025-07-15',
  vite: {
    server: {
      // Permitir todos los hosts de ngrok en desarrollo
      allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok.app'],
    },
  },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    upstreamBaseUrl:
      process.env.UPSTREAM_BASE_URL || 'https://taapi.caribetrack.com/',
    idClient: process.env.IDCLIENT || '151',
    deviceId: process.env.DEVICEID || 'server',
    apiKeys: process.env.API_KEYS || '',
    rateLimitRpm: process.env.RATE_LIMIT_RPM || '60',
    corsOrigins: process.env.CORS_ORIGINS || '',
    cacheTtlPositions: process.env.CACHE_TTL_POSITIONS || '10',
    cacheTtlCatalog: process.env.CACHE_TTL_CATALOG || '1800',
    cacheTtlBootstrap: process.env.CACHE_TTL_BOOTSTRAP || '300',
  },
})
