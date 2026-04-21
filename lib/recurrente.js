// Cliente para la API de Recurrente (procesador guatemalteco).
// Docs: https://docs.recurrente.com
// Base URL: https://app.recurrente.com/api
// Auth: headers X-PUBLIC-KEY + X-SECRET-KEY

const API_BASE = 'https://app.recurrente.com/api'

function getHeaders() {
  const pub = process.env.NEXT_PUBLIC_RECURRENTE_PUBLIC_KEY
  const sec = process.env.RECURRENTE_SECRET_KEY
  if (!pub || !sec) throw new Error('Recurrente keys missing')
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-PUBLIC-KEY': pub,
    'X-SECRET-KEY': sec,
  }
}

async function recFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Recurrente ${res.status}: ${body.slice(0, 400)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Crea un checkout hosted. Si pasas product_id (recomendado), Recurrente usa
// ese producto ya creado en el dashboard con su configuración de suscripción.
// Alternativa: pasar un item inline con charge_type=recurring + billing_interval.
export async function createCheckout({ productId, userId, orgId, plan, successUrl, cancelUrl }) {
  if (!productId) throw new Error('productId es requerido')

  const body = {
    items: [{ product_id: productId, quantity: 1 }],
    user_id: userId || undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { org_id: orgId, plan },
  }

  const res = await recFetch('/checkouts', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return {
    id: res?.id,
    url: res?.checkout_url || res?.url,
  }
}

// Cancela una suscripción de forma permanente (al final del período actual).
export async function cancelSubscription(subscriptionId) {
  return recFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

// Obtiene una suscripción (para mostrar datos actuales en el dashboard).
export async function getSubscription(subscriptionId) {
  return recFetch(`/subscriptions/${subscriptionId}`, { method: 'GET' })
}

// Mapea el estado de Recurrente al modelo unificado interno.
// Estados típicos: active, past_due, paused, cancelled
export function mapRecurrenteStatus(raw) {
  if (!raw) return 'incomplete'
  const s = String(raw).toLowerCase()
  if (s === 'active' || s === 'trialing') return 'active'
  if (s === 'past_due') return 'past_due'
  if (s === 'paused') return 'past_due'
  if (s === 'cancelled' || s === 'canceled' || s === 'expired') return 'canceled'
  return s
}

// Mapea plan key → product_id (configurado en env vars).
export function productIdForPlan(planKey) {
  const map = {
    starter: process.env.RECURRENTE_PRODUCT_STARTER,
    pro: process.env.RECURRENTE_PRODUCT_PRO,
    business: process.env.RECURRENTE_PRODUCT_BUSINESS,
  }
  return map[planKey] || null
}

// Mapea product_id → plan key (para webhook).
export function planFromProductId(productId) {
  if (!productId) return null
  const id = String(productId)
  if (id === process.env.RECURRENTE_PRODUCT_STARTER) return 'starter'
  if (id === process.env.RECURRENTE_PRODUCT_PRO) return 'pro'
  if (id === process.env.RECURRENTE_PRODUCT_BUSINESS) return 'business'
  return null
}
