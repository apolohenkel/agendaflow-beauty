import { describe, it, expect } from 'vitest'
import { BookingError, ApiError } from '../lib/error-codes.js'

describe('error codes', () => {
  it('BookingError tiene todos los códigos esperados', () => {
    expect(BookingError.SLOT_UNAVAILABLE).toBe('slot_unavailable')
    expect(BookingError.PLAN_LIMIT_REACHED).toBe('plan_limit_reached')
    expect(BookingError.TRIAL_EXPIRED).toBe('trial_expired')
    expect(BookingError.NO_ACTIVE_PLAN).toBe('no_active_plan')
    expect(BookingError.BUSINESS_NOT_ACTIVE).toBe('business_not_active')
  })

  it('ApiError tiene códigos de transporte', () => {
    expect(ApiError.RATE_LIMITED).toBe('rate_limited')
    expect(ApiError.NOT_ACCEPTING).toBe('not_accepting')
    expect(ApiError.MISSING_FIELDS).toBe('missing_fields')
  })

  it('no hay duplicados entre BookingError y ApiError', () => {
    const all = [...Object.values(BookingError), ...Object.values(ApiError)]
    expect(new Set(all).size).toBe(all.length)
  })
})
