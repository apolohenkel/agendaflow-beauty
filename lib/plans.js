// Config central de planes. Los priceId vienen de Stripe (env vars).
// Usamos NEXT_PUBLIC_* para que el cliente pueda detectar planes sin configurar y avisar.
// Los price IDs no son sensibles (Stripe los expone en la URL de checkout).

export const PLANS = {
  trial: {
    key: 'trial',
    name: 'Prueba',
    price: 0,
    priceId: null,
    limits: { appointmentsPerMonth: 999999, staff: 999999, whatsapp: true },
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    price: 19,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || null,
    limits: { appointmentsPerMonth: 100, staff: 1, whatsapp: false },
    features: ['1 negocio', '1 usuario', '100 citas/mes', 'Booking público'],
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || null,
    limits: { appointmentsPerMonth: 999999, staff: 5, whatsapp: true },
    features: ['1 negocio', '5 usuarios', 'Citas ilimitadas', 'Bot WhatsApp con IA', 'Recordatorios automáticos'],
  },
  business: {
    key: 'business',
    name: 'Business',
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS || null,
    limits: { appointmentsPerMonth: 999999, staff: 999999, whatsapp: true },
    features: ['Hasta 3 sucursales', 'Usuarios ilimitados', 'Citas ilimitadas', 'Bot WhatsApp con IA', 'Analytics avanzado', 'Soporte prioritario'],
  },
}

export const PUBLIC_PLANS = ['starter', 'pro', 'business']

export function getPlan(key) {
  return PLANS[key] || PLANS.trial
}

export function planByPriceId(priceId) {
  return Object.values(PLANS).find((p) => p.priceId === priceId) || null
}
