import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { sendText } from '../../../../lib/whatsapp/send'
import { rateLimit, clientIp } from '../../../../lib/rate-limit'
import { verifyCancelToken } from '../../../../lib/booking-tokens'
import { logger } from '../../../../lib/logger'

export async function POST(request) {
  const ip = clientIp(request)
  const rl = await rateLimit(`bkc:${ip}`, 10, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const { appointment_id, token } = await request.json().catch(() => ({}))
  if (!appointment_id || !token) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (!verifyCancelToken(appointment_id, token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: appt } = await admin
    .from('appointments')
    .select(`
      id, status, starts_at, client_id, business_id,
      services(name),
      clients(name, phone),
      businesses!inner(name, timezone, organization_id)
    `)
    .eq('id', appointment_id)
    .maybeSingle()

  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (appt.status === 'cancelled') return NextResponse.json({ ok: true, alreadyCancelled: true })

  const { error: updErr } = await admin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointment_id)

  if (updErr) {
    logger.error('bookings_cancel', updErr, { appointment_id })
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 })
  }

  // Notificar al dueño vía WhatsApp si hay cuenta conectada (fire-and-forget,
  // pero con .catch() adicional por si algo rechaza fuera del try interno)
  ;(async () => {
    try {
      const orgId = appt.businesses?.organization_id
      if (!orgId) return
      const { data: account } = await admin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token, enabled, notify_phone')
        .eq('org_id', orgId)
        .maybeSingle()
      if (!account?.enabled || !account.notify_phone) return
      const when = new Date(appt.starts_at).toLocaleString('es-MX', {
        timeZone: appt.businesses?.timezone || 'America/Mexico_City',
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit',
      })
      await sendText({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: account.notify_phone,
        body: `⚠️ Cita cancelada por el cliente\n\n👤 ${appt.clients?.name || 'Cliente'}\n💇 ${appt.services?.name || 'Servicio'}\n📅 ${when}`,
      })
    } catch (err) {
      logger.error('bookings_cancel_notify', err, { appointment_id })
    }
  })().catch((err) => logger.error('bookings_cancel_notify_outer', err, { appointment_id }))

  return NextResponse.json({ ok: true })
}
