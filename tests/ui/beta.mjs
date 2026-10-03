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
const browser = await chromium.launch({
  executablePath: browserPath,
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update'],
})
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === base
      ? route.continue()
      : route.abort()
  )
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let mode = 'persisted'
  let calls = 0
  await page.route('**/api/v1/beta', async (route) => {
    calls++
    const body = route.request().postDataJSON()
    assert(body.email.endsWith('@example.invalid'))
    await new Promise((r) => setTimeout(r, 100))
    const status = mode === 'rate-limited' ? 429 : 200
    const data =
      mode === 'persisted' ? { persisted: true } : { persisted: false }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  })
  await page.goto(base, { waitUntil: 'networkidle' })
  const email = page.getByLabel('Email para invitación beta')
  const submit = page.getByRole('button', { name: 'Pedir Acceso', exact: true })
  await email.fill('accepted-fixture@example.invalid')
  await submit.evaluate((button) => {
    button.click()
    button.click()
  })
  await page
    .getByText('Tu interés se guardó correctamente. 🍍', { exact: true })
    .waitFor()
  assert.equal(calls, 1)
  assert.equal(await email.inputValue(), '')
  mode = 'not-persisted'
  await email.fill('not-confirmed-fixture@example.invalid')
  await submit.click()
  await page.getByText(/Tu correo no se confirmó como guardado/).waitFor()
  assert.equal(
    await page
      .getByText('Tu interés se guardó correctamente. 🍍', { exact: true })
      .count(),
    0
  )
  mode = 'rate-limited'
  await email.fill('limited-fixture@example.invalid')
  await submit.click()
  await page.getByText(/Alcanzaste el límite de intentos/).waitFor()
  assert.equal(
    await page
      .getByText('Tu interés se guardó correctamente. 🍍', { exact: true })
      .count(),
    0
  )
  assert.equal(calls, 3)
  await page.screenshot({
    path: join(outputDir, 'root-ui-beta-failure.png'),
    fullPage: false,
  })
  assert.deepEqual(errors, [])
  await fs.writeFile(
    join(outputDir, 'web-beta-ui-evidence.json'),
    JSON.stringify(
      {
        fixtureOnly: true,
        productionWrites: 0,
        localServerWrites: 0,
        postRequestsIntercepted: calls,
        checks: [
          'persistedtrue-success',
          'doubleclick-one-post',
          'persistedfalse-no-success',
          '429-no-success',
        ],
        clientErrors: errors.length,
        rateLimitBackendValidation:
          'Provided by server helper unit tests; HTTP429 is mocked here',
      },
      null,
      2
    )
  )
  console.log(JSON.stringify({ passed: true, interceptedPosts: calls }))
  await context.close()
} finally {
  await browser.close()
}
