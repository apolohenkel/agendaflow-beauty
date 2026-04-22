import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { sendWelcomeEmail } from '../../../lib/email'
import { rateLimit } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { VERTICAL_KEYS, DEFAULT_VERTICAL } from '../../../lib/verticals'

const OPENING_HOURS_DEFAULT = {
  1: { start: '09:00', end: '19:00' },
  2: { start: '09:00', end: '19:00' },
  3: { start: '09:00', end: '19:00' },
  4: { start: '09:00', end: '19:00' },
  5: { start: '09:00', end: '19:00' },
  6: { start: '10:00', end: '15:00' },
}

const SERVICES_BY_TYPE = {
  'Barbería': [
    { name: 'Corte de cabello', duration_minutes: 30, price: 200, category: 'Corte' },
    { name: 'Barba', duration_minutes: 20, price: 150, category: 'Barba' },
    { name: 'Corte + Barba', duration_minutes: 45, price: 320, category: 'Combo' },
  ],
  'Salón de belleza': [
    { name: 'Corte de cabello', duration_minutes: 45, price: 350, category: 'Corte' },
    { name: 'Tinte', duration_minutes: 90, price: 800, category: 'Color' },
    { name: 'Manicure', duration_minutes: 30, price: 200, category: 'Uñas' },
  ],
  'Spa': [
    { name: 'Masaje relajante 60 min', duration_minutes: 60, price: 700, category: 'Masaje' },
    { name: 'Facial básico', duration_minutes: 45, price: 500, category: 'Facial' },
    { name: 'Manicure spa', duration_minutes: 40, price: 300, category: 'Uñas' },
  ],
  'Salón de uñas': [
    { name: 'Manicure', duration_minutes: 30, price: 200, category: 'Manos' },
    { name: 'Pedicure', duration_minutes: 45, price: 280, category: 'Pies' },
    { name: 'Uñas acrílicas', duration_minutes: 90, price: 500, category: 'Manos' },
  ],
  'Estética': [
    { name: 'Limpieza facial', duration_minutes: 60, price: 500, category: 'Facial' },
    { name: 'Depilación piernas', duration_minutes: 40, price: 400, category: 'Depilación' },
    { name: 'Facial hidratante', duration_minutes: 50, price: 450, category: 'Facial' },
  ],
  'Otro': [
    { name: 'Servicio estándar', duration_minutes: 60, price: 300, category: null },
  ],
}

export async function POST(request) {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await rateLimit(`on:${user.id}`, 3, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos, espera un minuto.' }, { status: 429 })

  const { name, slug, timezone, type, vertical, seed } = await request.json().catch(() => ({}))
  if (!name || !slug || !timezone) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const verticalKey = VERTICAL_KEYS.includes(vertical) ? vertical : DEFAULT_VERTICAL

  const { data, error } = await supa.rpc('create_organization', {
    p_slug: slug,
    p_name: name,
    p_timezone: timezone,
  })

  if (error) {
    const msg = {
      already_has_org: 'Ya tienes una organización',
      slug_taken: 'Ese slug ya está en uso',
      invalid_slug: 'Slug inválido (a-z, 0-9, guiones; 1-40 chars)',
      not_authenticated: 'No autenticado',
    }[error.message] || 'No se pudo crear la organización'
    const status = error.message === 'slug_taken' || error.message === 'already_has_org' ? 409 : 400
    return NextResponse.json({ error: msg }, { status })
  }

  const row = Array.isArray(data) ? data[0] : data
  const businessId = row?.business_id
  const orgId = row?.org_id

  const admin = createAdminClient()

  if (orgId) {
    await admin.from('organizations').update({ vertical: verticalKey }).eq('id', orgId)
  }

  if (seed && businessId) {
    await admin.from('businesses').update({ opening_hours: OPENING_HOURS_DEFAULT }).eq('id', businessId)
    const services = SERVICES_BY_TYPE[type] || SERVICES_BY_TYPE['Otro']
    await admin.from('services').insert(services.map((s) => ({ ...s, business_id: businessId, active: true })))
  }

  sendWelcomeEmail({ to: user.email, orgName: name, slug, vertical: verticalKey })
    .catch((err) => logger.error('onboarding_email', err, { user_id: user.id, slug }))

  return NextResponse.json({ ok: true, orgId: row?.org_id, slug })
}
