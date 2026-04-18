import crypto from 'node:crypto'

// Firma un token HMAC corto para acciones públicas sobre una cita (cancelar,
// reprogramar). Válido mientras el SECRET no cambie. Evita columna en DB
// manteniendo el token no-predecible — requiere conocer el SECRET para forjarlo.

function getSecret() {
  return process.env.BOOKING_TOKEN_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.CRON_SECRET
    || 'dev-only-fallback-change-me'
}

export function signCancelToken(appointmentId) {
  const h = crypto.createHmac('sha256', getSecret())
  h.update(`cancel:${appointmentId}`)
  return h.digest('hex').slice(0, 24)
}

export function verifyCancelToken(appointmentId, token) {
  if (!appointmentId || !token) return false
  const expected = signCancelToken(appointmentId)
  if (token.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}
