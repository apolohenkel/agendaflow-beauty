// Helper para resolver la URL base de la app.
// Prioridad:
//   1. NEXT_PUBLIC_APP_URL (explícito en env, ambos lados)
//   2. APP_URL (legacy server-side)
//   3. VERCEL_URL (auto-inyectado por Vercel — https sin prefijo)
//   4. http://localhost:3000 (dev fallback)
//
// En API routes con acceso a `request`, usa getAppUrlFromRequest(request).

export function getAppUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`
  return 'http://localhost:3000'
}

// Versión que prefiere el host del request (útil cuando el dominio custom
// difiere de NEXT_PUBLIC_APP_URL — ej: staging + prod + custom domain).
export function getAppUrlFromRequest(request) {
  try {
    const url = new URL(request.url)
    const hdr = request.headers
    const forwardedHost = hdr.get('x-forwarded-host') || hdr.get('host')
    const proto = hdr.get('x-forwarded-proto') || url.protocol.replace(':', '')
    if (forwardedHost) return `${proto}://${forwardedHost}`
  } catch {}
  return getAppUrl()
}
