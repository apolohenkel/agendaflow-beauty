import Stripe from 'stripe'

let _stripe = null

export function getStripe() {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  _stripe = new Stripe(key, { apiVersion: '2025-01-27.acacia' })
  return _stripe
}

/**
 * ¿Está Stripe configurado? Usado por paths que quieren ofrecer seña sólo
 * si hay API key, sin crashear cuando no (el bot WhatsApp puede estar en
 * negocios sin Stripe todavía).
 */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
