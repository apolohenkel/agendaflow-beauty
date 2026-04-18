import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { rateLimit, clientIp } from '../../../../lib/rate-limit'
import { verifyCancelToken, signCancelToken } from '../../../../lib/booking-tokens'
import { logger } from '../../../../lib/logger'
import { BookingError, ApiError } from '../../../../lib/error-codes'

// Reagendar = actualizar starts_at/ends_at de la cita misma.
// Requiere token HMAC de la cita (mismo que cancel). Verifica disponibilidad
// llamando al mismo RPC de overlap-check (via update con anti-overbooking en SQL).

export async function POST(request) {
  const ip = clientIp(request)
  const rl = await rateLimit(`bkr:${ip}`, 5, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const { appointment_id, token, starts_at } = await request.json().catch(() => ({}))
  if (!appointment_id || !token || !starts_at) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (!verifyCancelToken(appointment_id, token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 })
  }

  const newStart = new Date(starts_at)
  if (isNaN(newStart.getTime())) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: appt } = await admin
    .from('appointments')
    .select('id, business_id, staff_id, starts_at, ends_at, status, service_id, services(duration_minutes)')
    .eq('id', appointment_id)
    .maybeSingle()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (appt.status === 'cancelled') return NextResponse.json({ error: 'cancelled' }, { status: 409 })

  const duration = appt.services?.duration_minutes || Math.round((new Date(appt.ends_at) - new Date(appt.starts_at)) / 60000)
  const newEnd = new Date(newStart.getTime() + duration * 60000)

  // Check overlap (excluyendo la misma cita)
  const { data: overlapping } = await admin
    .from('appointments')
    .select('id')
    .eq('business_id', appt.business_id)
    .neq('id', appointment_id)
    .not('status', 'in', '(cancelled,no_show)')
    .lt('starts_at', newEnd.toISOString())
    .gt('ends_at', newStart.toISOString())
    .limit(1)

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json({ error: BookingError.SLOT_UNAVAILABLE }, { status: 409 })
  }

  const { error: updErr } = await admin
    .from('appointments')
    .update({
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
      status: 'pending', // vuelve a pendiente de confirmación
    })
    .eq('id', appointment_id)

  if (updErr) {
    logger.error('bookings_reschedule', updErr, { appointment_id })
    return NextResponse.json({ error: ApiError.BOOKING_FAILED }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    appointment_id,
    starts_at: newStart.toISOString(),
    cancel_token: signCancelToken(appointment_id),
  })
}
