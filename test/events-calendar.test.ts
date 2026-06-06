import { describe, expect, test } from 'bun:test'

import {
  buildCalendarDownloadUrl,
  buildGoogleCalendarUrl,
} from '../app/utils/calendarLinks'
import {
  buildEventosCalendar,
  calendarTestables,
} from '../server/utils/calendar'
import type { Evento } from '../server/utils/scraper'

const baseEvent = (overrides: Partial<Evento>): Evento => ({
  id: overrides.id ?? 'evento',
  title: overrides.title ?? 'Evento',
  category: overrides.category ?? 'General',
  categories: overrides.categories ?? [overrides.category ?? 'General'],
  summary: overrides.summary ?? 'Resumen',
  description: overrides.description ?? 'Descripcion',
  venue: overrides.venue ?? null,
  imageUrl: overrides.imageUrl ?? null,
  sourceUrl: overrides.sourceUrl ?? 'https://visitacaguas.net/eventos',
  publishedAt: overrides.publishedAt ?? null,
  rawDate: overrides.rawDate ?? null,
})

describe('buildEventosCalendar', () => {
  test('renders a valid all-day calendar export for dated events', () => {
    const calendar = buildEventosCalendar(
      [
        baseEvent({
          id: 'bomba',
          title: 'Noche de Bomba',
          category: 'Música',
          categories: ['Música', 'Familia'],
          summary: 'Ven a bailar en la plaza.',
          venue: 'Plaza Santiago R. Palmer',
          sourceUrl: 'https://visitacaguas.net/eventos/bomba',
          publishedAt: '2026-04-22T00:00:00.000Z',
        }),
        baseEvent({
          id: 'sin-fecha',
          title: 'Evento sin fecha',
          publishedAt: null,
        }),
      ],
      {
        generatedAt: new Date('2026-04-20T06:00:00.000Z'),
      }
    )

    expect(calendar).toContain('BEGIN:VCALENDAR')
    expect(calendar).toContain('BEGIN:VEVENT')
    expect(calendar).toContain('SUMMARY:Noche de Bomba')
    expect(calendar).toContain('DTSTART;VALUE=DATE:20260422')
    expect(calendar).toContain('DTEND;VALUE=DATE:20260423')
    expect(calendar).toContain('LOCATION:Plaza Santiago R. Palmer')
    expect(calendar).toContain('URL:https://visitacaguas.net/eventos/bomba')
    expect(calendar).toContain('BEGIN:VALARM')
    expect(calendar).toContain('ACTION:DISPLAY')
    expect(calendar).toContain(
      'DESCRIPTION:Recordatorio Criollos: Noche de Bomba'
    )
    expect(calendar).toContain('TRIGGER:-PT6H')
    expect(calendar).not.toContain('Evento sin fecha')
  })

  test('supports custom reminder timing and disabling alarms', () => {
    const event = baseEvent({
      id: 'teatro',
      title: 'Teatro familiar',
      publishedAt: '2026-05-08T00:00:00.000Z',
    })

    expect(
      buildEventosCalendar([event], {
        generatedAt: new Date('2026-05-01T00:00:00.000Z'),
        reminderMinutesBefore: 90,
      })
    ).toContain('TRIGGER:-PT1H30M')

    expect(
      buildEventosCalendar([event], {
        generatedAt: new Date('2026-05-01T00:00:00.000Z'),
        reminderMinutesBefore: null,
      })
    ).not.toContain('BEGIN:VALARM')
  })

  test('formats reminder durations for calendar alarms', () => {
    expect(calendarTestables.formatIcsDurationMinutes(360)).toBe('PT6H')
    expect(calendarTestables.formatIcsDurationMinutes(90)).toBe('PT1H30M')
    expect(calendarTestables.formatIcsDurationMinutes(1440)).toBe('P1D')
  })
})

describe('calendar link helpers', () => {
  test('builds a calendar download url with active filters only', () => {
    expect(
      buildCalendarDownloadUrl('/calendars/eventos.ics', {
        category: 'Música',
        q: 'plaza',
        from: '2026-04-20',
        to: undefined,
      })
    ).toBe(
      '/calendars/eventos.ics?category=M%C3%BAsica&q=plaza&from=2026-04-20'
    )
  })

  test('builds a Google Calendar template url for dated events', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Noche de Bomba',
      description: 'Ven al casco urbano.',
      venue: 'Plaza Santiago R. Palmer',
      sourceUrl: 'https://visitacaguas.net/eventos/bomba',
      publishedAt: '2026-04-22T00:00:00.000Z',
    })

    expect(url).toContain('action=TEMPLATE')
    expect(url).toContain('text=Noche+de+Bomba')
    expect(url).toContain('dates=20260422%2F20260423')
    expect(url).toContain('location=Plaza+Santiago+R.+Palmer')
  })
})
