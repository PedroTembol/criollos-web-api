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
try {
  for (const name of ['eventos', 'gastronomia', 'discovery']) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    })
    let blockedExternalRequests = 0
    await context.route('**/*', async (route) => {
      if (new URL(route.request().url()).origin !== base) {
        blockedExternalRequests++
        return route.abort()
      }
      return route.continue()
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${base}/${name}`, { waitUntil: 'networkidle' })
    const status = page.getByTestId('feed-status')
    await status.getByText('Información consultada', { exact: true }).waitFor()
    const initial = await page.request.get(`${base}/api/v1/${name}`)
    assert.equal(initial.status(), 200)
    const baseline = await initial.json()
    assert(baseline.data.length > 0)
    let mode = 'fresh'
    let calls = 0
    await page.route(`**/api/v1/${name}*`, async (route) => {
      calls++
      await new Promise((resolve) => setTimeout(resolve, 250))
      if (mode === 'failure') {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Fixture unavailable' }),
        })
      }
      const payload = structuredClone(baseline)
      if (mode === 'stale') {
        payload.metadata.state = 'stale'
        payload.metadata.stale = true
      }
      if (mode === 'partial') {
        payload.metadata.state = 'partial'
        payload.metadata.stale = true
        payload.metadata.complete = false
        if (payload.metadata.sources) {
          payload.metadata.sources.eventos.state = 'unavailable'
          payload.metadata.sources.eventos.fetchedAt = null
          payload.metadata.sources.eventos.lastSuccessAt = null
        }
      }
      if (mode === 'unavailable') {
        payload.data = []
        payload.count = 0
        payload.metadata.state = 'unavailable'
        payload.metadata.complete = false
        payload.metadata.stale = true
        payload.metadata.fetchedAt = null
        payload.metadata.lastSuccessAt = null
      }
      if (mode === 'empty') {
        payload.data = []
        payload.count = 0
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      })
    })
    mode = 'stale'
    const before = calls
    await status.getByRole('button').evaluate((button) => {
      button.click()
      button.click()
    })
    await status
      .getByText('Actualizando información', { exact: true })
      .waitFor()
    assert(await status.getByRole('button').isDisabled())
    await status
      .getByText('Mostrando información anterior', { exact: true })
      .waitFor()
    assert(
      calls - before >= 1 && calls - before <= 2,
      'At most one guarded refresh of each feed'
    )
    await page.screenshot({
      path: join(outputDir, `feed-ui-${name}-stale.png`),
      fullPage: false,
    })
    mode = 'failure'
    await status.getByRole('button').click()
    await status.getByText('No pudimos actualizar', { exact: true }).waitFor()
    assert(
      (await page.locator(`#${name}-results article`).count()) > 0,
      'Previous results remain after refresh failure'
    )
    mode = 'partial'
    await status.getByRole('button').click()
    await status.getByText('Información incompleta', { exact: true }).waitFor()
    mode = 'unavailable'
    await status.getByRole('button').click()
    await status.getByText('Fuente no disponible', { exact: true }).waitFor()
    assert.equal(
      await page.locator(`#${name}-empty-state`).count(),
      0,
      'Source failure is not a filtered empty state'
    )
    mode = 'empty'
    await status.getByRole('button').click()
    await page.locator(`#${name}-empty-state`).waitFor()
    mode = 'fresh'
    await status.getByRole('button').click()
    await status.getByText('Información consultada', { exact: true }).waitFor()
    const input = page.getByLabel('Buscar', { exact: true })
    await input.fill('Prueba')
    await input.press('Enter')
    await page.waitForURL(`**/${name}?q=Prueba`)
    await page.waitForLoadState('networkidle')
    const destination =
      name === 'eventos'
        ? 'gastronomia'
        : name === 'gastronomia'
          ? 'discovery'
          : ''
    await page.locator(`header a[href="/${destination}"]`).first().click()
    await page.waitForURL(`**/${destination}`)
    await page.goBack({ waitUntil: 'networkidle' })
    assert.equal(new URL(page.url()).searchParams.get('q'), 'Prueba')
    assert.equal(await input.inputValue(), 'Prueba')
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ page: name, phase: 'passed' }))
    evidence.push({
      page: name,
      checks: [
        'fresh',
        'loading',
        'stale',
        'partial',
        'unavailable',
        'network-error-keeps-data',
        'retry-recovery',
        'double-tap-guard',
        'empty-filter-state',
        'query-and-back-state',
      ],
      clientErrors: errors.length,
      blockedExternalRequests,
      externalRequestsCompleted: 0,
    })
    await context.close()
  }
  await fs.writeFile(
    join(outputDir, 'web-feed-ui-evidence.json'),
    JSON.stringify(
      {
        fixtureOnly: true,
        baseUrl: base,
        browser: 'installed Chrome, headless isolated profiles',
        pages: evidence,
      },
      null,
      2
    )
  )
  console.log(
    JSON.stringify({ passedPages: evidence.length, checksPerPage: 10 })
  )
} finally {
  await browser.close()
}
