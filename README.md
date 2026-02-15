# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## API Publico Caguas

Base local: `http://localhost:3000/api/v1`

OpenAPI: `http://localhost:3000/openapi.yaml`

Endpoints principales:
- `GET /api/v1/bootstrap`
- `GET /api/v1/vehicles/positions`
- `GET /api/v1/routes`
- `GET /api/v1/stops`
- `GET /api/v1/eta?latlngs=...`
- `POST /api/v1/feedback`

### Variables de entorno

- `UPSTREAM_BASE_URL` (default: `https://taapi.caribetrack.com/`)
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
