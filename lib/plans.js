// Config central de planes. Los priceId de Stripe siguen como fallback legacy,
// pero con precios multi-moneda el checkout usa price_data dinámico (no price ID).
// Los price IDs no son sensibles (Stripe los expone en la URL de checkout).

// Precios por moneda en CENTAVOS (Stripe usa minor units).
// USD/EUR/MXN/PEN/GTQ: centavos. COP/CLP/ARS: sin decimales pero mantenemos *100
// para consistencia; Stripe ajusta automáticamente (zero-decimal currencies).
export const PLAN_PRICES = {
  starter: {
    usd: 1900, eur: 1800, mxn: 39900, cop: 79900_00, pen: 7200,
    clp: 18900_00, ars: 19900_00, gtq: 14900,
  },
  pro: {
    usd: 4900, eur: 4500, mxn: 99900, cop: 199900_00, pen: 18900,
    clp: 46900_00, ars: 49900_00, gtq: 37900,
  },
  business: {
    usd: 9900, eur: 8900, mxn: 199900, cop: 399900_00, pen: 37900,
    clp: 94900_00, ars: 99900_00, gtq: 74900,
  },
}

// Mapeo país ISO-2 → moneda. Países no listados → USD.
export const COUNTRY_CURRENCY = {
  MX: 'mxn', CO: 'cop', PE: 'pen', CL: 'clp', AR: 'ars', GT: 'gtq',
  ES: 'eur', FR: 'eur', DE: 'eur', IT: 'eur', PT: 'eur', NL: 'eur',
  BE: 'eur', AT: 'eur', IE: 'eur', GR: 'eur', FI: 'eur', LU: 'eur',
}

export const CURRENCY_LOCALES = {
  usd: { locale: 'en-US', symbol: '$', code: 'USD' },
  eur: { locale: 'es-ES', symbol: '€', code: 'EUR' },
  mxn: { locale: 'es-MX', symbol: '$', code: 'MXN' },
  cop: { locale: 'es-CO', symbol: '$', code: 'COP' },
  pen: { locale: 'es-PE', symbol: 'S/', code: 'PEN' },
  clp: { locale: 'es-CL', symbol: '$', code: 'CLP' },
  ars: { locale: 'es-AR', symbol: '$', code: 'ARS' },
  gtq: { locale: 'es-GT', symbol: 'Q', code: 'GTQ' },
}

// Zero-decimal currencies: el entero en PLAN_PRICES/100 es el monto real.
const ZERO_DECIMAL = new Set(['clp', 'cop', 'jpy', 'krw'])

export function currencyForCountry(country) {
  if (!country) return 'usd'
  return COUNTRY_CURRENCY[country.toUpperCase()] || 'usd'
}

export function formatPlanPrice(planKey, currency) {
  const amountMinor = PLAN_PRICES[planKey]?.[currency] ?? PLAN_PRICES[planKey]?.usd
  if (amountMinor == null) return ''
  const amount = ZERO_DECIMAL.has(currency) ? amountMinor / 100 : amountMinor / 100
  const loc = CURRENCY_LOCALES[currency] || CURRENCY_LOCALES.usd
  return new Intl.NumberFormat(loc.locale, {
    style: 'currency',
    currency: loc.code,
    maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : (amount >= 100 ? 0 : 2),
    minimumFractionDigits: 0,
  }).format(amount)
}

export function planAmountMinor(planKey, currency) {
  return PLAN_PRICES[planKey]?.[currency] ?? PLAN_PRICES[planKey]?.usd ?? 0
}

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
    price: 19, // USD referencia — la UI usa formatPlanPrice()
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
