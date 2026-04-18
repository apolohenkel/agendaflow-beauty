import { describe, it, expect } from 'vitest'
import { PLANS, PUBLIC_PLANS, getPlan } from '../lib/plans.js'

describe('plans', () => {
  it('PUBLIC_PLANS tiene starter, pro, business', () => {
    expect(PUBLIC_PLANS).toEqual(['starter', 'pro', 'business'])
  })

  it('starter tiene límite de 100 citas/mes y sin whatsapp', () => {
    expect(PLANS.starter.limits.appointmentsPerMonth).toBe(100)
    expect(PLANS.starter.limits.whatsapp).toBe(false)
  })

  it('pro y business permiten whatsapp', () => {
    expect(PLANS.pro.limits.whatsapp).toBe(true)
    expect(PLANS.business.limits.whatsapp).toBe(true)
  })

  it('getPlan con key inválida cae a trial', () => {
    expect(getPlan('inexistente').key).toBe('trial')
  })
})
