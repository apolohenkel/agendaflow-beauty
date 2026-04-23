import { describe, it, expect } from 'vitest'
import { formatOpeningHours } from '../lib/whatsapp/tools'

describe('formatOpeningHours', () => {
  it('returns null for missing input', () => {
    expect(formatOpeningHours(null)).toBe(null)
    expect(formatOpeningHours(undefined)).toBe(null)
    expect(formatOpeningHours('notobject')).toBe(null)
  })

  it('groups consecutive days with same schedule', () => {
    const hours = {
      monday: { start: '09:00', end: '19:00' },
      tuesday: { start: '09:00', end: '19:00' },
      wednesday: { start: '09:00', end: '19:00' },
      thursday: { start: '09:00', end: '19:00' },
      friday: { start: '09:00', end: '19:00' },
      saturday: { start: '10:00', end: '17:00' },
      sunday: null,
    }
    expect(formatOpeningHours(hours)).toBe('Lun-Vie 09:00-19:00, Sáb 10:00-17:00, Dom cerrado')
  })

  it('handles all-closed week', () => {
    const hours = {
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null, sunday: null,
    }
    expect(formatOpeningHours(hours)).toBe('Lun-Dom cerrado')
  })

  it('handles single open day', () => {
    const hours = {
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null,
      saturday: { start: '10:00', end: '14:00' },
      sunday: null,
    }
    expect(formatOpeningHours(hours)).toBe('Lun-Vie cerrado, Sáb 10:00-14:00, Dom cerrado')
  })

  it('handles split schedule across week', () => {
    const hours = {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: null, // cerrado miércoles
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null,
    }
    expect(formatOpeningHours(hours)).toBe('Lun-Mar 09:00-18:00, Mié cerrado, Jue-Vie 09:00-18:00, Sáb 09:00-14:00, Dom cerrado')
  })
})
