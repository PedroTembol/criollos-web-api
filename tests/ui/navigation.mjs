import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
const base = process.env.CRIOLLOS_UI_BASE_URL || 'http://127.0.0.1:4176'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('UI fixtures require a local backend')
const output = process.env.CRIOLLOS_UI_OUTPUT_DIR || '.cache/ui'
await fs.mkdir(output, { recursive: true })
const installed = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({
  executablePath:
    process.env.CRIOLLOS_UI_BROWSER_PATH ||
    (existsSync(installed) ? installed : chromium.executablePath()),
  headless: true,
})
const evidence = []
try {
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
    ['small-mobile', { width: 320, height: 740 }],
  ]) {
    const mobile = name !== 'desktop'
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
    })
    let betaPosts = 0
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (
        url.pathname === '/api/v1/beta' &&
        route.request().method() === 'POST'
      )
        betaPosts++
      return url.origin === base ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    const clientErrors = []
    const hydrationErrors = []
    const requestFailures = []
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/v1/'))
        requestFailures.push({ url: request.url(), error: request.failure() })
    })
    page.on('pageerror', (error) => clientErrors.push(error.message))
    page.on('console', (message) => {
      if (/hydration.*mismatch|Hydration completed/i.test(message.text()))
        hydrationErrors.push(message.text())
    })
    const view = async (route) => {
      const typography = await page.evaluate(async () => {
        await document.fonts.ready
        return {
          interLoaded: [...document.fonts].some(
            (font) => font.family === 'Inter' && font.status === 'loaded'
          ),
          accentsAvailable: document.fonts.check(
            '16px Inter',
            'áéíóúüñÁÉÍÓÚÜÑ¿¡'
          ),
          headings: [
            ...document.querySelectorAll('main h1, main h2, main h3'),
          ].map((element) => {
            const style = getComputedStyle(element)
            return {
              text: element.textContent.trim(),
              family: style.fontFamily,
              weight: Number(style.fontWeight),
              transform: style.transform,
              stretch: style.fontStretch,
              clipped:
                element.scrollWidth > element.clientWidth + 1 ||
                (['hidden', 'clip'].includes(style.overflowY) &&
                  element.scrollHeight > element.clientHeight + 1) ||
                !['none', ''].includes(style.webkitLineClamp),
            }
          }),
        }
      })
      assert(typography.interLoaded, `${route} loads local Inter`)
      assert(typography.accentsAvailable, `${route} supports Spanish accents`)
      for (const heading of typography.headings) {
        assert(heading.family.includes('Inter'), `${heading.text} uses Inter`)
        assert(heading.weight <= 700, `${heading.text} uses a readable weight`)
        assert.equal(
          heading.transform,
          'none',
          `${heading.text} is not transformed`
        )
        assert.equal(
          heading.stretch,
          '100%',
          `${heading.text} is not stretched`
        )
        assert.equal(
          heading.clipped,
          false,
          `${heading.text} wraps without clipping`
        )
      }
      await page.evaluate(() => {
        document.activeElement?.blur()
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
      assert.equal(
        await page.locator('main').count(),
        1,
        `${route} has exactly one main landmark`
      )
      const overflowing = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1
      )
      assert.equal(overflowing, false, `${route} has no horizontal overflow`)
      if (mobile) {
        const nav = page.getByRole('navigation', {
          name: 'Accesos principales',
          exact: true,
        })
        assert(await nav.isVisible())
        assert.equal(await nav.getByRole('link').count(), 3)
      }
      await page.screenshot({
        path: join(output, `rebrand-${name}-${route}.png`),
        fullPage: true,
      })
    }
    await page.goto(base, { waitUntil: 'networkidle' })
    // Development-only Nuxt tools cover the mobile navigation in local runs.
    await page.addStyleTag({
      content: '#nuxt-devtools-container { display: none !important; }',
    })
    await page
      .getByRole('heading', { name: 'Tu día en Caguas', exact: true })
      .waitFor()
    assert.equal(await page.getByLabel('Email para invitación beta').count(), 0)
    assert.equal(
      await page
        .getByRole('button', { name: 'Pedir Acceso', exact: true })
        .count(),
      0
    )
    assert.equal(
      await page
        .getByText(
          /Test ?Flight|App Status|Closed Beta|Descarga (?:la|el) app/i
        )
        .count(),
      0
    )
    const choices = page.getByRole('navigation', {
      name: '¿Qué necesitas hoy?',
      exact: true,
    })
    assert.deepEqual(
      await choices
        .getByRole('link')
        .evaluateAll((links) =>
          links.map((link) => new URL(link.href).pathname)
        ),
      ['/transporte', '/eventos', '/gastronomia']
    )
    await view('home')
    await choices.getByRole('link', { name: /Transporte/ }).click()
    await page.waitForURL('**/transporte')
    await page.getByLabel('Elige una ruta').selectOption('701')
    await page.waitForURL('**/transporte?routeId=701')
    await page
      .getByRole('heading', { name: 'Ruta de Prueba 701', exact: true })
      .waitFor()
    await view('transporte')
    const stops = page.locator('a.stop-name')
    assert((await stops.count()) > 0)
    await stops.first().click()
    await page.waitForURL('**/transporte?*stopId=801*')
    await page
      .getByRole('heading', { name: 'Parada de Prueba Uno', exact: true })
      .waitFor()
    await page.goBack({ waitUntil: 'networkidle' })
    assert.equal(new URL(page.url()).searchParams.get('routeId'), '701')
    const primary = mobile
      ? page.getByRole('navigation', {
          name: 'Accesos principales',
          exact: true,
        })
      : page.getByRole('navigation', {
          name: 'Navegación principal',
          exact: true,
        })
    await primary.getByRole('link', { name: 'Eventos', exact: true }).click()
    await page.waitForURL('**/eventos')
    const eventSearch = page
      .locator('#eventos-filters')
      .getByLabel('Buscar', { exact: true })
    await eventSearch.fill('Prueba')
    await eventSearch.press('Enter')
    await page.waitForURL('**/eventos?q=Prueba')
    await page.locator('#eventos-filters summary').click()
    await page.getByLabel('Categoría', { exact: true }).selectOption('Familia')
    await page.waitForURL('**/eventos?*category=Familia*')
    await page.getByLabel('Desde', { exact: true }).fill('2026-10-01')
    await page.getByLabel('Hasta', { exact: true }).fill('2026-10-31')
    await page.waitForURL('**/*to=2026-10-31*')
    await page.locator('#eventos-results article').first().waitFor()
    const source = page.locator('#eventos-results a.catalog-source').first()
    assert.equal(
      new URL(await source.getAttribute('href')).hostname,
      'visitacaguas.net'
    )
    assert.equal(await source.getAttribute('target'), '_blank')
    assert((await source.getAttribute('rel')).includes('noopener'))
    const calendar = page.getByRole('link', { name: /Descargar agenda/ })
    const calendarUrl = new URL(await calendar.getAttribute('href'), base)
    assert.equal(calendarUrl.pathname, '/calendars/eventos.ics')
    assert.equal(calendarUrl.searchParams.get('category'), 'Familia')
    const google = page.getByRole('link', { name: /Guardar Fiesta de Prueba/ })
    assert.equal(
      new URL(await google.getAttribute('href')).hostname,
      'calendar.google.com'
    )
    await view('eventos')
    await eventSearch.fill('SinCoincidencia')
    await eventSearch.press('Enter')
    await page.locator('#eventos-empty-state').waitFor()
    await page
      .getByRole('button', { name: 'Limpiar filtros', exact: true })
      .click()
    await page.waitForURL('**/eventos')
    await page.locator('#eventos-results article').first().waitFor()
    await primary
      .getByRole('link', {
        name: mobile ? 'Comida' : 'Gastronomía',
        exact: true,
      })
      .click()
    await page.waitForURL('**/gastronomia')
    const foodSearch = page
      .locator('#gastronomia-filters')
      .getByLabel('Buscar', { exact: true })
    await foodSearch.fill('Prueba')
    await foodSearch.press('Enter')
    await page.waitForURL('**/gastronomia?q=Prueba')
    await page.locator('#gastronomia-filters summary').click()
    await page.getByRole('button', { name: /^Cafeterías/ }).click()
    await page.waitForURL('**/gastronomia?*category=Cafeter*')
    try {
      await page.getByText('1 lugar', { exact: true }).waitFor()
    } catch (error) {
      console.log(
        JSON.stringify({
          viewport: name,
          url: page.url(),
          requestFailures,
          errors: await page.evaluate(() => {
            const nuxt =
              document.getElementById('__nuxt')?.__vue_app__?.config
                ?.globalProperties?.$nuxt
            return nuxt?.payload?._errors || window.__NUXT__?._errors || null
          }),
          content: await page.locator('main').innerText(),
        })
      )
      await page.screenshot({
        path: join(output, `failure-${name}.png`),
        fullPage: true,
      })
      throw error
    }
    await page
      .getByRole('heading', { name: 'Cafe de Prueba Uno', exact: true })
      .waitFor()
    assert.equal(await page.locator('#gastronomia-results article').count(), 1)
    const place = page.locator('#gastronomia-results a.catalog-source').first()
    assert.equal(
      new URL(await place.getAttribute('href')).pathname,
      '/gastronomia/prueba-uno'
    )
    await view('gastronomia')
    await page.getByRole('link', { name: 'Explorar', exact: true }).click()
    await page.waitForURL('**/discovery')
    await page
      .getByRole('heading', {
        name: 'Sal de la rutina, cerquita.',
        exact: true,
      })
      .waitFor()
    await view('discovery')
    await page.goBack({ waitUntil: 'networkidle' })
    await foodSearch.waitFor()
    assert.equal(new URL(page.url()).searchParams.get('q'), 'Prueba')
    assert.equal(new URL(page.url()).searchParams.get('category'), 'Cafeterías')
    assert.equal(await foodSearch.inputValue(), 'Prueba')
    assert.equal(betaPosts, 0)
    assert.deepEqual(clientErrors, [])
    assert.deepEqual(hydrationErrors, [])
    evidence.push({
      viewport: name,
      pages: ['/', '/transporte', '/eventos', '/gastronomia', '/discovery'],
      checks: [
        'three-primary-paths',
        'no-app-beta-ui-or-posts',
        'route-selection-stop-and-back',
        'event-search-category-dates-source-calendar',
        'empty-state-clear-recovery',
        'food-search-category-source',
        'discovery-and-back-restores-filters',
        'main-landmark-no-overflow',
        'mobile-navigation',
        'no-client-or-hydration-errors',
        'inter-headings-accents-no-stretch-or-clipping',
      ],
      clientErrors,
      hydrationErrors,
      betaPosts,
    })
    await context.close()
    console.log(JSON.stringify({ viewport: name, passed: true }))
  }
  await fs.writeFile(
    join(output, 'rebrand-navigation-evidence.json'),
    JSON.stringify(
      { fixtureOnly: true, productionWrites: 0, evidence },
      null,
      2
    )
  )
} finally {
  await browser.close()
}
