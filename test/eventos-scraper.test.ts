import { describe, expect, test } from 'bun:test'

import { __testables, parseEventosFromHtml } from '../server/utils/scraper'

describe('parseEventosFromHtml', () => {
  test('normalizes the current Visit Caguas card structure', () => {
    const eventos = parseEventosFromHtml(`
      <div class="hidden mt-6 bg-white shadow-lg relative md:flex overflow-hidden">
        <img src="/images/bomba.jpg" alt="Baile de bomba en plaza" />
        <p class="uppercase tracking-wide text-xs">Música, Familia</p>
        <p class="lowercase tracking-wide text-xs">14 de marzo de 2026</p>
        <p class="font-bold">Noche de Bomba en la Plaza</p>
        <p class="mt-3">Ven al casco urbano. 📍 Lugar: Plaza Santiago R. Palmer. Habrá kioscos.</p>
      </div>
    `)

    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({
      title: 'Noche de Bomba en la Plaza',
      category: 'Música',
      categories: ['Música', 'Familia'],
      venue: 'Plaza Santiago R. Palmer. Habrá kioscos.',
      imageUrl: 'https://visitacaguas.net/images/bomba.jpg',
      imageAlt: 'Baile de bomba en plaza',
      publishedAt: '2026-03-14T00:00:00.000Z',
    })
    expect(eventos[0].summary).toBe('Ven al casco urbano.')
  })

  test('supports fallback selectors and fallback imageAlt', () => {
    const eventos = parseEventosFromHtml(`
      <article data-event-card>
        <img src="https://cdn.example.com/evento.png" />
        <h2>Feria Artesanal</h2>
        <div data-event-category>Artesanía</div>
        <time>5 de abril de 2026</time>
        <div data-event-description>Llega temprano. Lugar: Paseo Gautier Benítez</div>
      </article>
      <article data-event-card>
        <h2>Feria Artesanal</h2>
        <div data-event-category>Artesanía</div>
        <time>5 de abril de 2026</time>
        <div data-event-description>Llega temprano. Lugar: Paseo Gautier Benítez</div>
      </article>
    `)

    expect(eventos).toHaveLength(1)
    expect(eventos[0]).toMatchObject({
      title: 'Feria Artesanal',
      venue: 'Paseo Gautier Benítez',
      imageUrl: 'https://cdn.example.com/evento.png',
      imageAlt: 'Feria Artesanal',
      publishedAt: '2026-04-05T00:00:00.000Z',
    })
  })
})

describe('scraper helpers', () => {
  test('parses spanish dates including setiembre', () => {
    expect(__testables.toIsoDate('7 de setiembre de 2026')).toBe(
      '2026-09-07T00:00:00.000Z'
    )
  })

  test('extracts venue with and without emoji marker', () => {
    expect(__testables.extractVenue('📍 Lugar: Centro de Bellas Artes')).toBe(
      'Centro de Bellas Artes'
    )
    expect(__testables.extractVenue('Lugar: Jardín Botánico y Cultural')).toBe(
      'Jardín Botánico y Cultural'
    )
  })
})
