import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
const base = process.env.CRIOLLOS_UI_BASE_URL || 'http://127.0.0.1:4176'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('UI fixtures require a local backend')
const outputDir = process.env.CRIOLLOS_UI_OUTPUT_DIR || '.cache/ui'
await fs.mkdir(outputDir, { recursive: true })
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browserPath =
  process.env.CRIOLLOS_UI_BROWSER_PATH ||
  (existsSync(chrome) ? chrome : chromium.executablePath())
const evidence = []
const browser = await chromium.launch({
  executablePath: browserPath,
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update'],
})
async function context(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ...options,
  })
  await c.route('**/*', (route) =>
    new URL(route.request().url()).origin === base
      ? route.continue()
      : route.abort()
  )
  return c
}
try {
  const c = await context()
  const page = await c.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const response = await page.request.get(`${base}/api/v1/tracking`)
  assert.equal(response.status(), 200)
  const tracking = await response.json()
  let mode = 'failure'
  await page.route('**/api/v1/tracking*', async (route) => {
    if (mode === 'failure')
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"message":"Local fixture unavailable"}',
      })
    const payload = structuredClone(tracking)
    if (mode === 'stale') payload.stale = true
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByText('Sin lectura disponible', { exact: true }).waitFor()
  const count = page.locator(
    'section[aria-labelledby="live-status-heading"] [aria-live="polite"]'
  )
  assert.equal(
    (await count.textContent()).trim(),
    '...',
    'No invented zero on initial transport failure'
  )
  mode = 'fresh'
  await page
    .getByRole('button', { name: 'Actualizar señales', exact: true })
    .click()
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          'section[aria-labelledby="live-status-heading"] [aria-live="polite"]'
        )
        .textContent.trim() === '1'
  )
  mode = 'failure'
  await page
    .getByRole('button', { name: 'Actualizar señales', exact: true })
    .click()
  await page.getByText('Lectura sin actualizar', { exact: true }).waitFor()
  assert.equal(
    (await count.textContent()).trim(),
    '1',
    'Last valid count survives transport failure'
  )
  mode = 'stale'
  await page
    .getByRole('button', { name: 'Actualizar señales', exact: true })
    .click()
  await page.getByText('Lectura antigua', { exact: true }).waitFor()
  let posts = 0
  await page.route('**/api/v1/beta', async (route) => {
    posts++
    await new Promise((r) => setTimeout(r, 250))
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"persisted":false}',
    })
  })
  await page
    .getByLabel('Email para invitación beta')
    .fill('fixture@example.invalid')
  const beta = page.getByRole('button', { name: 'Pedir Acceso', exact: true })
  await beta.evaluate((b) => {
    b.click()
    b.click()
  })
  await page.getByText(/Tu correo no se confirmó como guardado/).waitFor()
  assert.equal(posts, 1, 'Double click cannot submit twice')
  assert.equal(
    await page
      .getByText('Tu interés se guardó correctamente. 🍍', { exact: true })
      .count(),
    0
  )
  let firstDone
  const firstFinished = new Promise((r) => (firstDone = r))
  await page.route('**/api/v1/search*', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q')
    if (q === 'Primera') await new Promise((r) => setTimeout(r, 900))
    const title = q === 'Primera' ? 'Resultado anterior' : 'Fiesta de Prueba'
    try {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              type: 'evento',
              id: 'evento-fixture',
              title,
              subtitle: 'Fixture',
              metadata: {},
            },
          ],
        }),
      })
    } finally {
      if (q === 'Primera') firstDone()
    }
  })
  const search = page.getByLabel('Buscador global de Criollos')
  await search.fill('Primera')
  await page.waitForRequest(
    (req) =>
      new URL(req.url()).pathname === '/api/v1/search' &&
      new URL(req.url()).searchParams.get('q') === 'Primera'
  )
  await search.fill('Prueba')
  await page
    .getByRole('option')
    .filter({ hasText: 'Fiesta de Prueba' })
    .waitFor()
  await firstFinished
  assert.equal(
    await page
      .getByRole('option')
      .filter({ hasText: 'Resultado anterior' })
      .count(),
    0
  )
  await page.screenshot({
    path: join(outputDir, 'root-ui-home-errors.png'),
    fullPage: false,
  })
  await page.getByRole('option').filter({ hasText: 'Fiesta de Prueba' }).click()
  await page.waitForURL('**/eventos?q=Fiesta+de+Prueba')
  assert.equal(new URL(page.url()).searchParams.get('q'), 'Fiesta de Prueba')
  assert.deepEqual(errors, [])
  evidence.push({
    page: '/',
    checks: [
      'no-invented-zero',
      'retains-tracking-on-error',
      'stale-label',
      'beta503-no-success',
      'beta-doubleclick',
      'search-late-response-ignored',
      'meaningful-search-navigation',
    ],
    clientErrors: errors.length,
  })
  await c.close()
  console.log(JSON.stringify({ page: '/', passed: true }))

  const denied = await context()
  await denied.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail({ code: 1, message: 'Fixture denied' })
  })
  const deniedPage = await denied.newPage()
  await deniedPage.goto(`${base}/cerca`, { waitUntil: 'networkidle' })
  await deniedPage.getByRole('button', { name: /Actualizar ubicación/ }).click()
  await deniedPage.getByText(/Revisa los permisos de ubicación/).waitFor()
  await denied.close()

  const near = await context({
    permissions: ['geolocation'],
    geolocation: { latitude: 18.2341, longitude: -66.0485 },
  })
  const np = await near.newPage()
  const nearErrors = []
  np.on('pageerror', (e) => nearErrors.push(e.message))
  await np.goto(`${base}/cerca`, { waitUntil: 'networkidle' })
  await np.getByRole('button', { name: /Actualizar ubicación/ }).click()
  await np.locator('#nearby-results article').first().waitFor()
  const map = await np.getByTitle('Cómo llegar').first().getAttribute('href')
  assert.equal(new URL(map).searchParams.get('destination'), '18.2341,-66.0485')
  await np
    .getByRole('link', { name: 'Ver parada y rutas', exact: true })
    .first()
    .click()
  await np.waitForURL('**/transporte?stopId=801')
  await np.getByText('Parada de Prueba Uno', { exact: true }).first().waitFor()
  const stopMap = await np
    .locator('a[href*="maps/search"]')
    .first()
    .getAttribute('href')
  assert.equal(new URL(stopMap).searchParams.get('query'), '18.2341,-66.0485')
  await np.screenshot({
    path: join(outputDir, 'root-ui-selected-stop.png'),
    fullPage: false,
  })
  await np.goBack({ waitUntil: 'networkidle' })
  if (
    !(await np.getByRole('button', { name: 'Desactivar', exact: true }).count())
  ) {
    await np.getByRole('button', { name: /Actualizar ubicación/ }).click()
    await np.locator('#nearby-results article').first().waitFor()
  }
  let failNearby = true
  await np.route('**/api/v1/stops/nearby*', async (route) =>
    failNearby
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"message":"Fixture nearby failure"}',
        })
      : route.continue()
  )
  await np
    .getByRole('button', { name: 'Actualizar paradas', exact: true })
    .click()
  await np.getByText(/Mostrando la lectura anterior/).waitFor()
  assert(
    (await np.locator('#nearby-results article').count()) > 0,
    'Same-origin results survive a failed refresh'
  )
  await near.setGeolocation({ latitude: 18.2351, longitude: -66.0495 })
  await np.evaluate(() => {
    const original = navigator.geolocation.getCurrentPosition.bind(
      navigator.geolocation
    )
    navigator.geolocation.getCurrentPosition = (ok, fail, options) =>
      original(ok, fail, { ...options, maximumAge: 0 })
  })
  await np.locator('#nearby-location button').first().click()
  await np.getByText(/Ubicación activa: 18.2351/).waitFor()
  await np.getByText('No pudimos cargar las paradas', { exact: true }).waitFor()
  assert.equal(
    await np.locator('#nearby-results article').count(),
    0,
    'Previous-origin results are not relabeled for new GPS coordinates'
  )
  failNearby = false
  await np.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await np.locator('#nearby-results article').first().waitFor()
  await np.getByRole('button', { name: 'Desactivar', exact: true }).click()
  assert.equal(await np.locator('#nearby-results').count(), 0)
  await np.getByText('Esperando tu ubicación', { exact: true }).waitFor()
  assert.deepEqual(nearErrors, [])
  evidence.push({
    page: '/cerca and /transporte',
    checks: [
      'geolocation-denied',
      'geolocation-fixture',
      'nearby-degree-map-link',
      'stop-selection801',
      'transit-degree-map-link',
      'back-navigation',
      'same-origin-error-retention',
      'new-origin-error-no-old-results',
      'nearby-retry-recovery',
      'clear-location',
    ],
    clientErrors: nearErrors.length,
  })
  await near.close()
  await fs.writeFile(
    join(outputDir, 'web-root-ui-evidence.json'),
    JSON.stringify(
      {
        fixtureOnly: true,
        baseUrl: base,
        externalPageRequestsBlocked: true,
        pages: evidence,
      },
      null,
      2
    )
  )
  console.log(JSON.stringify({ passedPages: evidence.length }))
} finally {
  await browser.close()
}
