import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { rateLimit, clientIp } from '../../../../lib/rate-limit'
import { signCancelToken } from '../../../../lib/booking-tokens'
import { logger } from '../../../../lib/logger'

// Devuelve las citas futuras activas de un cliente por teléfono + slug.
// No expone datos privados del cliente (email, otras citas en otro salón).
// Sólo data mínima para que el cliente pueda reconocer y cancelar sus reservas.

function normalizePhone(raw) {
  if (!raw) return ''
  return String(raw).replace(/\D+/g, '')
}

export async function POST(request) {
  const ip = clientIp(request)
  const rl = await rateLimit(`bkl:${ip}`, 6, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const { slug, phone } = await request.json().catch(() => ({}))
  if (!slug || !phone) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  if (normalized.length < 7) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: business } = await admin
    .from('businesses')
    .select('id, timezone')
    .eq('organization_id', org.id)
    .eq('active', true)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Buscar clientes con phone que normalice al mismo valor (tolerante a formato)
  const { data: clientRows } = await admin
    .from('clients')
    .select('id, phone')
    .eq('business_id', business.id)
  const clients = (clientRows || []).filter((c) => normalizePhone(c.phone) === normalized)
  if (clients.length === 0) return NextResponse.json({ ok: true, appointments: [] })

  const clientIds = clients.map((c) => c.id)
  const nowIso = new Date().toISOString()

  const { data: appts, error } = await admin
    .from('appointments')
    .select(`
      id, starts_at, ends_at, status,
      services(name, duration_minutes, price),
      staff(name)
    `)
    .in('client_id', clientIds)
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })
    .limit(20)

  if (error) {
    logger.error('bookings_lookup', error, { slug })
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }

  const result = (appts || []).map((a) => ({
    id: a.id,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    status: a.status,
    service_name: a.services?.name || null,
    service_price: a.services?.price ?? null,
    duration: a.services?.duration_minutes || null,
    staff_name: a.staff?.name || null,
    cancel_token: signCancelToken(a.id),
  }))

  return NextResponse.json({ ok: true, timezone: business.timezone || 'America/Mexico_City', appointments: result })
}
