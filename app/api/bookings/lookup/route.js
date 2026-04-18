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

  const { slug, phone, include_past } = await request.json().catch(() => ({}))
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

  // Futuras activas
  const { data: upcoming, error: upErr } = await admin
    .from('appointments')
    .select(`
      id, starts_at, ends_at, status, notes, service_id, staff_id,
      services(id, name, duration_minutes, price),
      staff(id, name)
    `)
    .in('client_id', clientIds)
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })
    .limit(20)

  if (upErr) {
    logger.error('bookings_lookup', upErr, { slug })
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }

  const mapAppt = (a) => ({
    id: a.id,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    status: a.status,
    notes: a.notes || null,
    service_id: a.service_id || a.services?.id || null,
    service_name: a.services?.name || null,
    service_price: a.services?.price ?? null,
    duration: a.services?.duration_minutes || null,
    staff_id: a.staff_id || null,
    staff_name: a.staff?.name || null,
    cancel_token: signCancelToken(a.id),
  })

  const result = { upcoming: (upcoming || []).map(mapAppt), past: [] }

  if (include_past) {
    const { data: past } = await admin
      .from('appointments')
      .select(`
        id, starts_at, ends_at, status, notes, service_id, staff_id,
        services(id, name, duration_minutes, price),
        staff(id, name)
      `)
      .in('client_id', clientIds)
      .in('status', ['completed', 'confirmed', 'pending'])
      .lt('starts_at', nowIso)
      .order('starts_at', { ascending: false })
      .limit(10)
    result.past = (past || []).map(mapAppt)
  }

  return NextResponse.json({
    ok: true,
    timezone: business.timezone || 'America/Mexico_City',
    appointments: result.upcoming,
    upcoming: result.upcoming,
    past: result.past,
  })
}
