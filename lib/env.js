// Helper para validar que las variables de entorno críticas estén definidas.
// Úsalo en rutas que dependen de un servicio externo: si falta la var,
// el endpoint falla con 500 temprano y loggea qué vars faltan,
// en vez de romper silenciosamente aguas abajo.

import { logger } from './logger'

const GROUPS = {
  supabase: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  stripe_prices: ['NEXT_PUBLIC_STRIPE_PRICE_STARTER', 'NEXT_PUBLIC_STRIPE_PRICE_PRO', 'NEXT_PUBLIC_STRIPE_PRICE_BUSINESS'],
  anthropic: ['ANTHROPIC_API_KEY'],
  whatsapp: ['WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'],
  resend: ['RESEND_API_KEY'],
  cron: ['CRON_SECRET'],
}

export function missingEnv(group) {
  const required = GROUPS[group]
  if (!required) return []
  return required.filter((k) => !process.env[k])
}

export function requireEnv(group, scope) {
  const missing = missingEnv(group)
  if (missing.length > 0) {
    logger.error(scope || 'env', 'missing_env_vars', { group, missing })
    const err = new Error(`missing_env:${group}:${missing.join(',')}`)
    err.code = 'missing_env'
    err.missing = missing
    throw err
  }
}
