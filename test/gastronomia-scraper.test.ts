import { describe, expect, test } from 'bun:test'

import { parseGastronomiaFromHtml } from '../server/utils/scraper'

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
