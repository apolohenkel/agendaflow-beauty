import { describe, it, expect } from 'vitest'
import { normalizePhone, phoneVariants, formatPhoneDisplay } from '../lib/phone'

describe('normalizePhone', () => {
  it('returns null for empty/invalid input', () => {
    expect(normalizePhone(null)).toBe(null)
    expect(normalizePhone('')).toBe(null)
    expect(normalizePhone('abc')).toBe(null)
    expect(normalizePhone('12')).toBe(null) // demasiado corto
  })

  it('preserves + prefix cleaning spaces and dashes', () => {
    expect(normalizePhone('+502 5512-3456')).toBe('+50255123456')
    expect(normalizePhone('+1 (415) 555-0142')).toBe('+14155550142')
  })

  it('adds + when missing (Meta format)', () => {
    expect(normalizePhone('50255123456')).toBe('+50255123456')
    expect(normalizePhone('14155550142')).toBe('+14155550142')
  })

  it('strips non-digits except leading +', () => {
    expect(normalizePhone('502.5512.3456')).toBe('+50255123456')
    expect(normalizePhone('+502/5512/3456')).toBe('+50255123456')
  })

  it('rejects too long numbers (>15 digits)', () => {
    expect(normalizePhone('+1234567890123456')).toBe(null)
  })
})

describe('phoneVariants', () => {
  it('returns 3 variants for typical Latam number', () => {
    const v = phoneVariants('+50255123456')
    expect(v).toContain('+50255123456')
    expect(v).toContain('50255123456')
    expect(v).toContain('55123456')
  })

  it('returns empty array for invalid input', () => {
    expect(phoneVariants('abc')).toEqual([])
    expect(phoneVariants('')).toEqual([])
  })

  it('does not duplicate when number < 8 digits', () => {
    const v = phoneVariants('+1234567')
    expect(v).toContain('+1234567')
    expect(v).toContain('1234567')
    expect(v.length).toBe(2)
  })
})

describe('formatPhoneDisplay', () => {
  it('groups in blocks of 4 with country code', () => {
    expect(formatPhoneDisplay('+50255123456')).toBe('+502 5512 3456')
    expect(formatPhoneDisplay('+14155550142')).toBe('+141 5555 0142')
  })

  it('returns input unchanged if invalid', () => {
    expect(formatPhoneDisplay('abc')).toBe('abc')
  })
})
