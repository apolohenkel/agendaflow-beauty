import Stripe from 'stripe'

let _stripe = null

export function getStripe() {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  _stripe = new Stripe(key, { apiVersion: '2025-01-27.acacia' })
  return _stripe
}
