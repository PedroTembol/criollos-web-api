// Local UI verification only: fictional source responses, no production reads.
const originalFetch = globalThis.fetch.bind(globalThis)
const foodHtml = `
  <article data-place-card><h2>Cafe de Prueba Uno</h2>
    <p data-event-category>Cafeterías</p><p data-event-description>Fixture local para probar la vitrina.</p>
    <a href="/gastronomia/prueba-uno">Detalles</a></article>
  <article data-place-card><h2>Restaurante de Prueba Dos</h2>
    <p data-event-category>Comida Criolla</p><p data-event-description>Fixture local para probar filtros.</p>
    <a href="/gastronomia/prueba-dos">Detalles</a></article>`
const eventHtml = `
  <article data-event-card><h2>Fiesta de Prueba</h2><p data-event-category>Familia</p>
    <time>27 de octubre de 2026</time><p data-event-description>Fixture local de agenda. Lugar: Plaza de prueba</p></article>`
globalThis.fetch = async (input, init) => {
  const value = typeof input === 'string' ? input : input?.url || String(input)
  const url = new URL(value, 'http://localhost')
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname))
    return originalFetch(input, init)
  const method = String(init?.method || input?.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD'].includes(method)) {
    return new Response(
      JSON.stringify({
        fixture: true,
        persisted: false,
        error: 'External writes blocked by local fixture',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (url.hostname === 'visitacaguas.net') {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return new Response(
      url.pathname.startsWith('/eventos') ? eventHtml : foodHtml,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }
  if (url.hostname === 'taapi.caribetrack.com') {
    if (!url.pathname.toLowerCase().endsWith('/getall')) {
      return new Response(
        JSON.stringify({
          fixture: true,
          error: 'Provider endpoint not available in local fixture',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const raw = [
      [[901, 1, 'Unidad de Prueba 901']],
      [
        [801, 1, 'Parada de Prueba Uno', '18.2341,-66.0485'],
        [802, 1, 'Parada de Prueba Dos', '18.2342,-66.0484'],
      ],
      [
        [
          701,
          151,
          'Ruta de Prueba 701',
          '#0038A8',
          '#CE1126',
          'Inicio de Prueba',
          'Final de Prueba',
          '#0038A8',
          '#CE1126',
          0,
          '',
        ],
      ],
      [
        [1001, 701, 0, 0, 801, 18234100, -66048500, 'P', 0, 0, 0],
        [1002, 701, 0, 1, 802, 18234200, -66048400, 'P', 20, 0, 60],
      ],
      [],
      [
        [
          901,
          0,
          new Date().toISOString(),
          5,
          0,
          '18.2341,-66.0485',
          1,
          '',
          'Fixture local',
          701,
          1002,
          1001,
        ],
      ],
    ]
    return new Response(JSON.stringify(raw), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  throw new Error('External network blocked by local UI fixture')
}
