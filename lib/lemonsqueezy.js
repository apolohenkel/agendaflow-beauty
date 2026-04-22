// Cliente helper para Lemon Squeezy API v1.
// Lemon Squeezy es Merchant of Record: ellos cobran al cliente final, manejan
// impuestos globales (VAT, sales tax, etc) y nos pagan el neto a nuestra cuenta.
// Útil cuando Stripe no opera en el país del negocio (ej. Guatemala).

const API_BASE = 'https://api.lemonsqueezy.com/v1'

function getApiKey() {
  const key = process.env.LEMONSQUEEZY_API_KEY
  if (!key) throw new Error('LEMONSQUEEZY_API_KEY missing')
  return key
}

async function lsFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${getApiKey()}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`LemonSqueezy ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

// Crea una checkout URL para una suscripción. Hosted en LS (ellos cobran).
// Pasamos metadata { org_id, plan } para identificar el cliente en el webhook.
export async function createCheckout({ variantId, storeId, email, name, orgId, plan, successUrl }) {
  if (!variantId || !storeId) throw new Error('variantId y storeId son requeridos')

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
        },
        checkout_data: {
          email: email || undefined,
          name: name || undefined,
          custom: {
            org_id: orgId,
            plan,
          },
        },
        product_options: {
          enabled_variants: [Number(variantId)],
          redirect_url: successUrl,
          receipt_button_text: 'Ir a mi panel',
          receipt_thank_you_note: '¡Gracias por suscribirte a AgendaFlow!',
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  }

  const res = await lsFetch('/checkouts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return {
    id: res.data?.id,
    url: res.data?.attributes?.url,
  }
}

// Cancelar suscripción al final del período actual.
export async function cancelSubscription(subscriptionId) {
  return lsFetch(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'subscriptions',
        id: String(subscriptionId),
        attributes: { cancelled: true },
      },
    }),
  })
}

// Reanudar suscripción cancelada (si aún no expiró).
export async function resumeSubscription(subscriptionId) {
  return lsFetch(`/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'subscriptions',
        id: String(subscriptionId),
        attributes: { cancelled: false },
      },
    }),
  })
}

// Genera URL del customer portal (update payment method, invoices).
export async function getCustomerPortalUrl(subscriptionId) {
  const res = await lsFetch(`/subscriptions/${subscriptionId}`)
  return res.data?.attributes?.urls?.customer_portal || null
}

// Mapea status de LS a nuestro modelo (alineado con el anterior de Stripe).
// LS statuses: on_trial, active, paused, past_due, unpaid, cancelled, expired
export function mapLsStatus(lsStatus) {
  switch (lsStatus) {
    case 'active':
    case 'on_trial': return 'active'
    case 'past_due': return 'past_due'
    case 'cancelled': return 'canceled'
    case 'expired': return 'canceled'
    case 'paused':
    case 'unpaid': return 'past_due'
    default: return lsStatus || 'incomplete'
  }
}

// Devuelve el variantId correspondiente al plan key (starter/pro/business).
// Los IDs vienen de env vars (se configuran una vez tras crear productos en LS).
export function variantIdForPlan(planKey) {
  const map = {
    starter: process.env.LEMONSQUEEZY_VARIANT_STARTER,
    pro: process.env.LEMONSQUEEZY_VARIANT_PRO,
    business: process.env.LEMONSQUEEZY_VARIANT_BUSINESS,
  }
  return map[planKey] || null
}

// Mapea variantId → plan key (para el webhook, que recibe el variantId).
export function planFromVariantId(variantId) {
  if (!variantId) return null
  const id = String(variantId)
  if (id === process.env.LEMONSQUEEZY_VARIANT_STARTER) return 'starter'
  if (id === process.env.LEMONSQUEEZY_VARIANT_PRO) return 'pro'
  if (id === process.env.LEMONSQUEEZY_VARIANT_BUSINESS) return 'business'
  return null
}
