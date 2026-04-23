// Utilidades para normalizar números de teléfono — sobre todo para matchear
// clientes en la DB sin importar si el dueño los guardó como "+502 1234-5678",
// "5021234568" o "+50212345678".

/**
 * Limpia un número: solo dígitos, opcional '+' inicial.
 * Retorna E.164 (con '+') si puede inferirlo, o null si el input es basura.
 */
export function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.replace(/[^\d+]/g, '')
  if (!cleaned) return null
  // Ya viene con '+': asumimos que está en E.164 y sólo limpiamos.
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1)
    if (digits.length < 7 || digits.length > 15) return null
    return `+${digits}`
  }
  // Sin '+': podría ser internacional sin prefijo (Meta WhatsApp usa este
  // formato) o local. Si tiene 10-15 dígitos y empieza con un country code
  // conocido lo tratamos como internacional.
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  return `+${digits}`
}

/**
 * Genera variantes del mismo número para hacer lookups en DB tolerantes:
 * ["+50255123456", "50255123456", "55123456"].
 * Útil cuando no sabés cómo el dueño guardó el contacto.
 */
export function phoneVariants(raw) {
  const norm = normalizePhone(raw)
  if (!norm) return []
  const digits = norm.slice(1) // sin '+'
  const variants = new Set([norm, digits])
  // También últimos 8 dígitos (número local aprox en muchos países de Latam)
  if (digits.length > 8) variants.add(digits.slice(-8))
  return Array.from(variants)
}

/**
 * Para display: "+502 5512 3456". Agrupa en bloques de 4.
 */
export function formatPhoneDisplay(raw) {
  const norm = normalizePhone(raw)
  if (!norm) return raw || ''
  const digits = norm.slice(1)
  if (digits.length <= 3) return norm
  const cc = digits.slice(0, digits.length > 10 ? 3 : 2)
  const rest = digits.slice(cc.length)
  const groups = rest.match(/.{1,4}/g) || []
  return `+${cc} ${groups.join(' ')}`
}
