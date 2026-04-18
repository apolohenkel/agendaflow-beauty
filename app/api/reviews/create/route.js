import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { rateLimit, clientIp } from '../../../../lib/rate-limit'
import { verifyCancelToken } from '../../../../lib/booking-tokens'
import { logger } from '../../../../lib/logger'

export async function POST(request) {
  const ip = clientIp(request)
  const rl = await rateLimit(`rv:${ip}`, 5, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const { appointment_id, token, rating, text } = await request.json().catch(() => ({}))
  if (!appointment_id || !token) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (!verifyCancelToken(appointment_id, token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 403 })
  }
  const ratingNum = Number(rating)
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'invalid_rating' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: appt } = await admin
    .from('appointments')
    .select(`
      id, business_id, client_id,
      businesses!inner(organization_id)
    `)
    .eq('id', appointment_id)
    .maybeSingle()

  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const cleanText = typeof text === 'string' ? text.trim().slice(0, 500) : null

  const { error } = await admin.from('reviews').upsert({
    appointment_id,
    business_id: appt.business_id,
    organization_id: appt.businesses.organization_id,
    client_id: appt.client_id,
    rating: ratingNum,
    text: cleanText || null,
    published: true,
  }, { onConflict: 'appointment_id' })

  if (error) {
    logger.error('reviews_create', error, { appointment_id })
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
