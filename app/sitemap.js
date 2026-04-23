// Sitemap dinámico para Google / Bing / LLMs.
// Incluye:
//   - Rutas estáticas principales (landing, pricing, legales, auth).
//   - Todos los negocios públicos (/b/[slug]) activos — buena para SEO
//     local de cada salón/barbería suscrito.
// No incluye /dashboard/* (requiere auth, no indexable).

import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = 'https://agendaes.com'

export default async function sitemap() {
  const now = new Date()

  const staticRoutes = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/signup', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/login', priority: 0.6, changeFrequency: 'yearly' },
    { path: '/forgot-password', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/legal/terminos', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/legal/privacidad', priority: 0.4, changeFrequency: 'yearly' },
  ]

  // Rutas por vertical (mismas pero con ?v= para que Google indexe variantes)
  const verticalRoutes = [
    { path: '/?v=beauty_salon', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/?v=barbershop', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/?v=nail_salon', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/?v=spa', priority: 0.8, changeFrequency: 'weekly' },
  ]

  // Negocios públicos activos
  let businessRoutes = []
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('organizations')
      .select('slug, id, businesses!inner(id, active, updated_at)')
      .eq('businesses.active', true)
      .not('slug', 'is', null)
    businessRoutes = (data || []).map((org) => ({
      path: `/b/${org.slug}`,
      priority: 0.7,
      changeFrequency: 'weekly',
      lastModified: org.businesses?.[0]?.updated_at ? new Date(org.businesses[0].updated_at) : now,
    }))
  } catch {
    // Si falla el fetch (sin service role en build, etc), seguimos sin negocios.
  }

  return [...staticRoutes, ...verticalRoutes, ...businessRoutes].map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: r.lastModified || now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
