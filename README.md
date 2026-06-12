# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## API Publico Caguas

Base local: `http://localhost:3000/api/v1`

OpenAPI: `http://localhost:3000/openapi.yaml`

Endpoints principales:

- `GET /api/v1/bootstrap` (devuelve `ETag` + `Last-Modified` para conditional GET del catálogo/bootstrap)
- `GET /api/v1/vehicles/positions`
- `GET /api/v1/vehicles/nearby?lat=&lng=&limit=` (devuelve unidades ordenadas por distancia con metadata de ruta, velocidad, estado y `lastReportedAt` para mapas/dashboards)
- `GET /api/v1/tracking` (`?routeId=&assetId=&status=&freshness=&limit=`; incluye `summary.routes[].lastReportedAt`, `summary.routes[].leadVehicle.nextStopEtaSeconds`, `vehicles[].nextStopEtaSeconds`, `summary.telemetry`/`summary.routes[].telemetry` con edad newest/oldest/median/p90 de reportes, `summary.dataQuality` con score e issues de payload incompleto, `summary.upcomingStops[]` agrupado por parada visible, `summary.alerts[]` con severidad/copy listo para UI o push notifications y ahora devuelve `ETag` + `Last-Modified` para conditional GET sin re-descargar el mismo snapshot)
- `GET /api/v1/notifications` (`?source=&severity=&seen=&limit=`; consolida alertas de tracking, eventos, discovery y gastronomía en un feed deduplicado con cursor estable, acciones y tags listos para polling web/push)
- `GET /api/v1/assistant?q=&lat=&lng=&limit=` (interpreta preguntas naturales sobre trolley, cercanía, eventos y gastronomía; devuelve intención, respuesta breve, acciones y evidencia reutilizable por web/mobile)
- `GET /api/v1/routes` (devuelve `ETag` + `Last-Modified` para conditional GET del catálogo de rutas)
- `GET /api/v1/routes/:routeId/stops` (devuelve secuencias de paradas por dirección con `distanceMeters`, `travelSecondsFromStart` y métricas de segmento para mapas/onboarding)
- `GET /api/v1/stops` (devuelve `ETag` + `Last-Modified` para conditional GET del catálogo de paradas)
- `GET /api/v1/stops/nearby?lat=&lng=&limit=&maxDistanceMeters=` (devuelve paradas ordenadas por distancia con rutas, colores, direcciones y `routePointIds` para mapas/onboarding)
- `GET /api/v1/eta?latlngs=...`
- `GET /api/v1/eventos` (`?category=&q=&from=&to=&limit=`; incluye `summary.featuredPlans[]` con planes destacados por día visible y `summary.alerts[]` con avisos editoriales/notificables por día o weekend listos para UI/push)
- `GET /api/v1/gastronomia` (`?category=` acepta una o más categorías separadas por coma, `?q=&limit=`; incluye `summary.categoryBreakdown[]`, `summary.featuredPlaces[]` con picks concretos por categoría, `summary.suggestedRoutes[]` con planes accionables por mood/categoría, `summary.categorySpotlights[]` con focos por categoría y lugar líder, y `summary.alerts[]` con rutas editoriales/notificables del subset actual)
- `GET /api/v1/discovery` (`?type=&category=&q=&from=&to=&limit=`; incluye `summary.types`, `summary.categories`, `summary.dateRange`, `summary.withImageCount`, `summary.sourceDomains` y `summary.alerts[]` con avisos editoriales/notificables del subset visible)
- `GET /api/v1/recommendations` (`?type=service,mobility,plan,food&limit=`; combina tracking + discovery y devuelve cards accionables listas para UI con prioridad, evidencia y CTA; `summary.nextBestAction` expone la recomendación primaria ya rankeada para hero/assistant)
- `GET /calendars/eventos.ics` (`?category=&q=&from=&to=&limit=&reminderMinutesBefore=`; exporta la agenda visible en formato iCalendar para Calendar/Google Calendar, con recordatorio `VALARM` por defecto 6 horas antes; usa `reminderMinutesBefore=0` para desactivar)
- `POST /api/v1/feedback`

### Variables de entorno

- `UPSTREAM_BASE_URL` (default: `https://taapi.caribetrack.com/`)
- `CACHE_TTL_BOOTSTRAP_STALE` (default: `86400`, last-known-good fallback)
- `IDCLIENT` (default: `151`)
- `DEVICEID` (default: `server`)
- `API_KEYS` (comma-separated, opcional)
- `RATE_LIMIT_RPM` (default: `60`)
- `CORS_ORIGINS` (comma-separated, opcional)
- `CACHE_TTL_POSITIONS` (default: `10`)
- `CACHE_TTL_CATALOG` (default: `1800`)
- `CACHE_TTL_BOOTSTRAP` (default: `300`)

### Cloudflare Pages

Este proyecto usa `nitro.preset = "cloudflare-pages"`. Para deploy:

- Build con `bun run build`
- Publicar con Cloudflare Pages apuntando a `.output/public`

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
