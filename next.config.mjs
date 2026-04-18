/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  async headers() {
    return [
      {
        // Aplicar a todas las rutas excepto webhooks — Stripe/Meta gestionan sus propios headers.
        source: '/((?!api/stripe/webhook|api/whatsapp/webhook).*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
