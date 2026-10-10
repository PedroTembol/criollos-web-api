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

### Fuentes de agenda y gastronomía

La agenda se lee de `https://visitacaguas.net/eventos`. El directorio
gastronómico se lee de `https://visitacaguas.net/`; la antigua ruta
`/donde-comer` ya no es la fuente del catálogo. Se recorren solamente enlaces
de paginación del mismo directorio, sin filtros, con un máximo de 40 páginas,
3 solicitudes simultáneas, 5 segundos por solicitud y 20 segundos por lectura.
Los lugares se deduplican por ID y se ordenan por página de origen.

Las lecturas completas se almacenan durante una hora y se conservan como
último catálogo válido durante 24 horas. Si falla una página o cambia el HTML,
el catálogo completo anterior se mantiene con `stale` y `staleReason`; una
primera lectura parcial se identifica como incompleta y no crea un
`lastSuccessAt`. Los fallos se reintentan después de 60 segundos. La salud
reporta la hora de la lectura válida, incluso en respuestas de caché, y no la
hora de la consulta a `/health`. La persistencia del caché de Cloudflare es
por región y puede eliminarse antes de su TTL.

### Pruebas locales y verificaciones live

`bun run test` y `bun run test:local` ejecutan todas las suites locales:
Bun para los archivos que importan `bun:test` y Vitest para los que importan
`vitest`. No consultan producción. También se pueden ejecutar por separado
con `bun run test:bun` y `bun run test:vitest`. El hook de pre-push ejecuta
estas pruebas y el build; la CI usa las mismas comprobaciones.

Las verificaciones live son opt-in, usan únicamente GET y requieren una URL
explícita. La clave de pruebas es opcional y solo habilita el check autenticado;
no hay claves incluidas en los tests:

```bash
CRIOLLOS_TEST_BASE_URL=https://criollos.app bun run test:live
```

Para incluir rutas autenticadas, suministrar `CRIOLLOS_TEST_API_KEY` mediante
el entorno local autorizado. No ejecutar estas verificaciones como parte de
CI ni de un pre-push. Un HTTP 429 o un fallo de contenido hace fallar el check;
no se contabiliza como una respuesta válida.

La QA de interfaz con fixtures es opt-in y no forma parte de CI. Requiere un
Chromium ya instalado; en macOS puede usar Chrome con un perfil temporal
headless. `CRIOLLOS_UI_BROWSER_PATH` permite seleccionar otro ejecutable
instalado. En una terminal se arranca el servidor con fuentes ficticias y
escrituras externas bloqueadas; en otra se ejecutan las pantallas:

```bash
NODE_OPTIONS="--import=$PWD/tests/ui/source-preload.mjs" bun run dev -- --host 127.0.0.1 --port 4176
bun run test:ui:fixtures
```

Los scripts aceptan únicamente un backend local, interceptan los POST beta
y guardan capturas/evidencias en `.cache/ui`. Comprueban carga, datos
anteriores/parciales, fallos, reintentos, doble pulsación, búsqueda y Atrás,
geolocalización ficticia y selección de paradas. Los recorridos principales
se comprueban en escritorio y móviles de 390 y 320 píxeles, incluidos filtros,
fuentes y calendario. El preload usa 1000 consultas por minuto salvo que
`RATE_LIMIT_RPM` ya esté definido, para aislar estas sesiones de prueba del
límite de producción. Un HTTP 429 simulado verifica
la interfaz; el límite real de solicitudes se valida en las pruebas del
servidor. No prueban almacenamiento de producción ni condiciones reales del
servicio de transporte.

### Acceso, registro beta y publicación

Los GET y HEAD de catálogo, tracking y ETA son públicos de forma explícita.
También se autoriza únicamente el POST público de `/api/v1/beta` para registrar
interés en las aplicaciones. Las demás escrituras administrativas están
protegidas: sin configuración de acceso válida se rechazan.

El registro beta requiere un binding KV `BETA_SIGNUPS` en el entorno de
Cloudflare Pages. El servidor valida correo y plataforma, deduplica mediante
SHA-256 con Web Crypto, asigna `createdAt` y guarda el registro con un TTL de
90 días (7.776.000 segundos). Solo devuelve `persisted: true`
cuando la escritura termina; si el binding no está disponible, devuelve HTTP
503 y la interfaz no confirma el registro. La provisión está autorizada solo
en el nivel gratuito, con namespaces separados para preview y producción.
El hashing no requiere añadir un flag de compatibilidad Node.
El body JSON se limita a 1.024 bytes y diez segundos. Cada instancia limita
a cinco intentos por cliente en diez minutos; el exceso devuelve HTTP 429
con un aviso de reintento. También reserva como máximo cien intentos de
escritura nueva por día UTC e instancia; las escrituras fallidas consumen
presupuesto y los registros existentes no. Estos controles son volátiles y
se reinician con la instancia: no garantizan un límite global entre
instancias ni evitan agotar la cuota KV de toda la cuenta. No se almacenan
ni publican IPs. En el plan gratuito, el agotamiento de cuota falla y el
formulario no confirma el registro; no hay una actualización automática a
un plan de pago.

La política del proyecto, verificada el 3 de octubre de 2026, publica previews
accesibles desde ramas distintas de `main`; los cambios en `main` disparan
publicación automática en producción. El relanzamiento requiere aprobación
del usuario. No desplegar ni fusionar el trabajo de recuperación antes de
esa aprobación.

### Cloudflare Pages

Este proyecto usa `nitro.preset = "cloudflare-pages"`. Para deploy:

- Build con `bun run build`
- Publicar con Cloudflare Pages apuntando a `dist`

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

## Validación de telemetría

Bootstrap y tracking incluyen `telemetry.state` (`available`, `empty` o `incompatible`), `receivedRows` y `rejectedRows`. Una lista válida vacía no equivale a un formato desconocido. Las filas incompatibles no se convierten en vehículos; el catálogo se conserva. `/api/v1/vehicles/positions` y su alias `/vehicles/positions` comparten parser y devuelven 502 con metadata y `Cache-Control: no-store` ante incompatibilidad, frente a 200 para una lista válida vacía. Las claves internas de cache v2 evitan reutilizar snapshots anteriores a estas validaciones.

Health declara el transporte saludable sólo con al menos un timestamp interpretable, con zona horaria explícita, de 0 a 120 segundos y un contrato compatible. Timestamps ausentes, inválidos, sin zona horaria o futuros tienen frescura `unknown`; los reportes más antiguos son stale. Una lectura exitosa sin señales recientes es degraded, sin inferir una interrupción municipal. `lastSuccessAt` y `fetchedAt` siguen siendo relojes de lectura del snapshot, no de llegada ni de reporte de un vehículo. El índice `GetAll[5]` permanece sin cambios.
