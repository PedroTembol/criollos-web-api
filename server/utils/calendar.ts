import type { Evento } from './scraper'

interface BuildEventosCalendarOptions {
  calendarName?: string
  calendarDescription?: string
  calendarUrl?: string
  generatedAt?: Date
  reminderMinutesBefore?: number | null
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatUtcDateTime(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function formatAllDayDate(value: Date): string {
  return value.toISOString().slice(0, 10).replace(/-/g, '')
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000)
}

const DEFAULT_REMINDER_MINUTES_BEFORE = 6 * 60

function normalizeReminderMinutes(
  value: number | null | undefined
): number | null {
  if (value === null) return null
  if (value === undefined) return DEFAULT_REMINDER_MINUTES_BEFORE
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

function formatIcsDurationMinutes(minutes: number): string {
  const totalMinutes = Math.max(1, Math.round(minutes))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const remainingMinutes = totalMinutes % 60

  if (days > 0 && hours === 0 && remainingMinutes === 0) {
    return `P${days}D`
  }

  const datePart = days > 0 ? `${days}D` : ''
  const hourPart = hours > 0 ? `${hours}H` : ''
  const minutePart = remainingMinutes > 0 ? `${remainingMinutes}M` : ''
  return `P${datePart}T${hourPart}${minutePart || (hourPart ? '' : '1M')}`
}

function buildEventDescription(event: Evento): string {
  return [
    event.summary || event.description,
    event.venue ? `Lugar: ${event.venue}` : null,
    event.sourceUrl ? `Más info: ${event.sourceUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildEventosCalendar(
  events: Evento[],
  options: BuildEventosCalendarOptions = {}
): string {
  const generatedAt = options.generatedAt ?? new Date()
  const dtStamp = formatUtcDateTime(generatedAt)
  const reminderMinutesBefore = normalizeReminderMinutes(
    options.reminderMinutesBefore
  )
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Criollos//Agenda Cultural//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName ?? 'Criollos · Agenda Cultural de Caguas')}`,
    `X-WR-CALDESC:${escapeIcsText(options.calendarDescription ?? 'Export de eventos públicos de Caguas desde Criollos.')}`,
  ]

  if (options.calendarUrl) {
    lines.push(`URL:${escapeIcsText(options.calendarUrl)}`)
  }

  for (const event of events) {
    if (!event.publishedAt) continue

    const startDate = new Date(event.publishedAt)
    if (Number.isNaN(startDate.getTime())) continue

    const endDate = addDays(startDate, 1)
    const uid = `${event.id || formatAllDayDate(startDate)}@criollos.caguas`
    const description = buildEventDescription(event)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(uid)}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${formatAllDayDate(startDate)}`,
      `DTEND;VALUE=DATE:${formatAllDayDate(endDate)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `CATEGORIES:${escapeIcsText((event.categories?.length ? event.categories : [event.category]).join(','))}`
    )

    if (event.venue) {
      lines.push(`LOCATION:${escapeIcsText(event.venue)}`)
    }

    if (event.sourceUrl) {
      lines.push(`URL:${escapeIcsText(event.sourceUrl)}`)
    }

    if (reminderMinutesBefore !== null) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcsText(`Recordatorio Criollos: ${event.title}`)}`,
        `TRIGGER:-${formatIcsDurationMinutes(reminderMinutesBefore)}`,
        'END:VALARM'
      )
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

export const calendarTestables = {
  formatIcsDurationMinutes,
}

export function getCalendarDateRangeFromIso(
  isoDate: string | null | undefined
): { start: string; end: string } | null {
  if (!isoDate) return null

  const startDate = new Date(isoDate)
  if (Number.isNaN(startDate.getTime())) return null

  return {
    start: formatAllDayDate(startDate),
    end: formatAllDayDate(addDays(startDate, 1)),
  }
}
