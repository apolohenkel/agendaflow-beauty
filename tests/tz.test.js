import { describe, it, expect } from 'vitest'
import { dayOfWeekInTz, localToUtcIso, dayBoundsUtcIso } from '../lib/tz.js'

describe('tz helpers', () => {
  it('dayOfWeekInTz: 2026-04-16 es jueves en CDMX', () => {
    expect(dayOfWeekInTz('2026-04-16', 'America/Mexico_City')).toBe(4)
  })

  it('localToUtcIso: 15:00 CDMX (UTC-6) -> 21:00 UTC', () => {
    const iso = localToUtcIso('2026-04-20', 15, 0, 'America/Mexico_City')
    expect(iso).toBe('2026-04-20T21:00:00.000Z')
  })

  it('localToUtcIso: 09:30 Buenos Aires (UTC-3) -> 12:30 UTC', () => {
    const iso = localToUtcIso('2026-04-20', 9, 30, 'America/Argentina/Buenos_Aires')
    expect(iso).toBe('2026-04-20T12:30:00.000Z')
  })

  it('dayBoundsUtcIso: día completo CDMX abarca 24h', () => {
    const { start, end } = dayBoundsUtcIso('2026-04-20', 'America/Mexico_City')
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    expect(diffMs).toBe(24 * 3600 * 1000)
  })
})
