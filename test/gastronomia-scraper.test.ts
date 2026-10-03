import { describe, expect, test } from 'bun:test'

import {
  parseGastronomiaFromHtml,
  parseGastronomiaPageLinks,
  scrapeGastronomiaFeed,
} from '../server/utils/scraper'

describe('parseGastronomiaFromHtml', () => {
  test('normalizes Visit Caguas gastronomia cards', () => {
    const places = parseGastronomiaFromHtml(`
      <div class="hidden mt-6 bg-white shadow-lg relative md:flex overflow-hidden">
        <img src="/storage/restaurants/pina.jpg" alt="Piña Colada Bar" />
        <div>
          <p class="font-bold">Piña Colada Bar</p>
          <p class="mt-2 uppercase tracking-wide text-xs">Barras, Cocteles</p>
          <p class="mt-3">Cocteleria tropical en el casco urbano.</p>
          <a href="/gastronomia/77">Ver mas</a>
        </div>
      </div>
      <div class="bg-white shadow-md rounded-lg">
        <p class="font-bold">El Nuevo Lugar</p>
        <p class="mt-2 uppercase tracking-wide text-xs">Comida Criolla</p>
        <p class="mt-3">Tradicion en cada plato.</p>
        <a href="/donde-comer/nuevo-lugar">Explorar</a>
      </div>
    `)

    expect(places).toHaveLength(2)
    expect(places[0]).toMatchObject({
      id: 'pina-colada-bar',
      title: 'Piña Colada Bar',
      category: 'Barras',
      categories: ['Barras', 'Cocteles'],
      summary: 'Cocteleria tropical en el casco urbano.',
      imageUrl: 'https://visitacaguas.net/storage/restaurants/pina.jpg',
      imageAlt: 'Piña Colada Bar',
      sourceUrl: 'https://visitacaguas.net/gastronomia/77',
    })
    expect(places[1]).toMatchObject({
      id: 'el-nuevo-lugar',
      title: 'El Nuevo Lugar',
      category: 'Comida Criolla',
      imageAlt: 'El Nuevo Lugar',
      sourceUrl: 'https://visitacaguas.net/donde-comer/nuevo-lugar',
    })
  })

  test('removes duplicate cards by title', () => {
    const places = parseGastronomiaFromHtml(`
      <div class="hidden mt-6 bg-white shadow-lg relative md:flex overflow-hidden">
        <p class="font-bold">Cafe del Turabo</p>
        <p class="mt-2 uppercase tracking-wide text-xs">Cafeterias</p>
        <p class="mt-3">Cafe local.</p>
        <a href="/gastronomia/11">Ver mas</a>
      </div>
      <div class="hidden mt-6 bg-white shadow-lg relative md:flex overflow-hidden">
        <p class="font-bold">Cafe del Turabo</p>
        <p class="mt-2 uppercase tracking-wide text-xs">Cafeterias</p>
        <p class="mt-3">Cafe local.</p>
        <a href="/gastronomia/11">Ver mas</a>
      </div>
    `)

    expect(places).toHaveLength(1)
    expect(places[0].title).toBe('Cafe del Turabo')
  })
})

const card = (title: string) => `
  <article data-place-card>
    <h2>${title}</h2><p data-event-category>Cafeterías</p>
    <p data-event-description>Comida local.</p>
    <a href="/gastronomia/${title}">Detalles</a>
  </article>`

describe('gastronomy directory pagination', () => {
  test('follows only canonical same-source directory links', () => {
    expect(
      parseGastronomiaPageLinks(`
      <a href="https://visitacaguas.net?page=34">34</a>
      <a href="/?page=2">2</a><a href="/?page=2#top">2</a>
      <a href="/?page=1">1</a><a href="/?page=-1">Bad</a>
      <a href="/?page=2.5">Bad</a><a href="/?page=2&category=cafe">Filter</a>
      <a href="https://example.com/?page=3">External</a>
      <a href="/eventos?page=3">Events</a>
    `)
    ).toEqual([
      'https://visitacaguas.net/?page=2',
      'https://visitacaguas.net/?page=34',
    ])
  })

  test('discovers linked pages recursively and dedupes their cards', async () => {
    const requests: string[] = []
    const fixtures: Record<string, string> = {
      'https://visitacaguas.net/': card('Cafe Uno') + '<a href="?page=2">2</a>',
      'https://visitacaguas.net/?page=2':
        card('Cafe Uno') + card('Cafe Dos') + '<a href="?page=3">3</a>',
      'https://visitacaguas.net/?page=3':
        card('Cafe Tres') + '<a href="?page=2">2</a>',
    }
    const result = await scrapeGastronomiaFeed(async (url, timeoutMs) => {
      requests.push(url)
      expect(timeoutMs).toBeGreaterThan(0)
      expect(timeoutMs).toBeLessThanOrEqual(5000)
      return fixtures[url]!
    })
    expect(requests).toHaveLength(3)
    expect(result.data.map((place) => place.id)).toEqual([
      'cafe-uno',
      'cafe-dos',
      'cafe-tres',
    ])
    expect(result.complete).toBe(true)
    expect(result.pagesFetched).toBe(3)
    expect(result.pagesDiscovered).toBe(3)
    expect(result.fetchedAt).not.toBeNull()
  })

  test('reports partial data when one linked page fails instead of claiming a complete catalog', async () => {
    const result = await scrapeGastronomiaFeed(async (url) => {
      if (url.endsWith('page=2'))
        throw new Error('Provider error with private context')
      return card('Cafe Uno') + '<a href="?page=2">2</a>'
    })
    expect(result.complete).toBe(false)
    expect(result.pagesFetched).toBe(1)
    expect(result.pagesDiscovered).toBe(2)
    expect(result.data).toHaveLength(1)
    expect(result.error).toBe('Gastronomy pagination incomplete (1/2 pages)')
  })

  test('caps requests even when a source links more pages', async () => {
    let count = 0
    const result = await scrapeGastronomiaFeed(
      async () => {
        count++
        return (
          card('Cafe Uno') + '<a href="?page=2">2</a><a href="?page=3">3</a>'
        )
      },
      { maxPages: 2 }
    )
    expect(count).toBe(2)
    expect(result.complete).toBe(false)
    expect(result.pagesFetched).toBe(2)
    expect(result.pagesDiscovered).toBe(3)
  })

  test('rejects an unrelated or redesigned HTML page without inventing a fetch success', async () => {
    const result = await scrapeGastronomiaFeed(
      async () => '<html>Maintenance</html>'
    )
    expect(result.data).toEqual([])
    expect(result.fetchedAt).toBeNull()
    expect(result.complete).toBe(false)
  })
})
