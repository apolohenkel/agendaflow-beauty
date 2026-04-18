import { describe, it, expect } from 'vitest'
import { effectivePlan, canUseFeature } from '../lib/plan-access.js'

const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
const PAST = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

describe('effectivePlan', () => {
  it('sub activa gana sobre todo lo demás', () => {
    const e = effectivePlan({ plan: 'trial', trialEndsAt: PAST, subscription: { status: 'active', plan: 'pro' } })
    expect(e).toMatchObject({ key: 'pro', active: true })
  })

  it('trial vigente cuando no hay sub', () => {
    const e = effectivePlan({ plan: 'trial', trialEndsAt: FUTURE, subscription: null })
    expect(e).toMatchObject({ key: 'trial', active: true })
  })

  it('trial expirado sin sub → inactive', () => {
    const e = effectivePlan({ plan: 'trial', trialEndsAt: PAST, subscription: null })
    expect(e.active).toBe(false)
  })

  it('past_due no se considera activa', () => {
    const e = effectivePlan({ plan: 'trial', trialEndsAt: PAST, subscription: { status: 'past_due', plan: 'pro' } })
    expect(e.active).toBe(false)
  })

  it('canceled no se considera activa', () => {
    const e = effectivePlan({ plan: 'trial', trialEndsAt: PAST, subscription: { status: 'canceled', plan: 'pro' } })
    expect(e.active).toBe(false)
  })
})

describe('canUseFeature', () => {
  it('pro puede WhatsApp', () => {
    const e = { key: 'pro', active: true }
    expect(canUseFeature(e, 'whatsapp')).toBe(true)
  })

  it('starter no puede WhatsApp', () => {
    const e = { key: 'starter', active: true }
    expect(canUseFeature(e, 'whatsapp')).toBe(false)
  })

  it('plan inactivo bloquea todo', () => {
    const e = { key: 'pro', active: false }
    expect(canUseFeature(e, 'whatsapp')).toBe(false)
  })

  it('null/sin key bloquea todo', () => {
    expect(canUseFeature({ active: true }, 'whatsapp')).toBe(false)
    expect(canUseFeature(null, 'whatsapp')).toBe(false)
  })
})
