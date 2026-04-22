import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { sendAppointmentConfirmation } from '../../../../lib/email'
import { sendText } from '../../../../lib/whatsapp/send'
import { rateLimit, clientIp } from '../../../../lib/rate-limit'
import { logger } from '../../../../lib/logger'
import { ApiError, BookingError } from '../../../../lib/error-codes'
import { signCancelToken } from '../../../../lib/booking-tokens'
import { getStripe } from '../../../../lib/stripe'

export async function POST(request) {
  const ip = clientIp(request)
  const rl = await rateLimit(`bk:${ip}`, 5, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: ApiError.RATE_LIMITED }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const {
    slug,
    service_id,
    service_ids,
    staff_id,
    starts_at,
    client_name,
    client_phone,
    client_email,
    notes,
  } = body

  const trimmedNotes = typeof notes === 'string' ? notes.trim().slice(0, 500) : null
  const finalNotes = trimmedNotes || null

  // Normalizar a array de IDs preservando orden. Soporta legacy single service_id.
  const requestedServiceIds = Array.isArray(service_ids) && service_ids.length > 0
    ? service_ids
    : (service_id ? [service_id] : [])

  if (!slug || requestedServiceIds.length === 0 || !starts_at || !client_name || !client_phone) {
    return NextResponse.json({ error: ApiError.MISSING_FIELDS }, { status: 400 })
  }

  if (requestedServiceIds.length > 5) {
    return NextResponse.json({ error: 'too_many_services' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('id, vertical')
    .eq('slug', slug)
    .maybeSingle()
  if (!org) return NextResponse.json({ error: ApiError.ORG_NOT_FOUND }, { status: 404 })

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, address, timezone, organization_id, deposit_enabled, deposit_currency')
    .eq('organization_id', org.id)
    .eq('active', true)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: BookingError.BUSINESS_NOT_ACTIVE }, { status: 404 })

  // Cargar todos los servicios solicitados de una vez
  const { data: servicesFound } = await admin
    .from('services')
    .select('id, name, duration_minutes, price, deposit_amount')
    .in('id', requestedServiceIds)
    .eq('business_id', business.id)
  if (!servicesFound || servicesFound.length !== requestedServiceIds.length) {
    return NextResponse.json({ error: ApiError.SERVICE_NOT_FOUND }, { status: 404 })
  }

  // Re-ordenar según el orden del request
  const servicesById = new Map(servicesFound.map((s) => [s.id, s]))
  const services = requestedServiceIds.map((id) => servicesById.get(id)).filter(Boolean)

  const firstStart = new Date(starts_at)
  if (isNaN(firstStart.getTime())) {
    return NextResponse.json({ error: ApiError.INVALID_DATE }, { status: 400 })
  }

  const { data: clientId, error: clientErr } = await admin.rpc('find_or_create_client', {
    p_business_id: business.id,
    p_phone: client_phone.trim(),
    p_name: client_name.trim(),
  })
  if (clientErr) {
    logger.error('bookings_create', clientErr, { scope: 'find_or_create_client', slug })
    return NextResponse.json({ error: ApiError.CLIENT_FAILED }, { status: 500 })
  }

  if (client_email) {
    await admin
      .from('clients')
      .update({ email: client_email.trim().toLowerCase() })
      .eq('id', clientId)
      .is('email', null)
  }

  // La seña total es la suma de deposits de cada servicio seleccionado.
  // Si el salón tiene deposit_enabled=false, se ignoran todos los deposits.
  const totalDeposit = business.deposit_enabled
    ? services.reduce((sum, s) => sum + (Number(s.deposit_amount) || 0), 0)
    : 0

  if (totalDeposit > 0) {
    try {
      const stripe = getStripe()
      const appUrl = process.env.APP_URL || 'http://localhost:3000'
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: business.deposit_currency || 'usd',
            product_data: {
              name: `Seña · ${business.name}`,
              description: services.map((s) => s.name).join(' + '),
            },
            unit_amount: totalDeposit,
          },
          quantity: 1,
        }],
        customer_email: client_email || undefined,
        success_url: `${appUrl}/b/${slug}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/b/${slug}?checkout=cancelled`,
        metadata: {
          type: 'booking_deposit',
          slug,
          org_id: org.id,
          business_id: business.id,
          client_id: clientId,
          service_ids: services.map((s) => s.id).join(','),
          staff_id: staff_id || '',
          starts_at: firstStart.toISOString(),
          client_name: client_name.trim(),
          client_phone: client_phone.trim(),
          client_email: client_email || '',
          notes: finalNotes || '',
        },
        locale: 'es',
      })
      return NextResponse.json({ ok: true, requires_deposit: true, checkout_url: session.url })
    } catch (err) {
      logger.error('bookings_create_checkout', err, { slug })
      return NextResponse.json({ error: 'deposit_session_failed' }, { status: 500 })
    }
  }

  // Reservar cada servicio en cadena. Si alguno falla, cancelar los previos.
  const created = []
  let offset = 0
  for (const svc of services) {
    const sStart = new Date(firstStart.getTime() + offset * 60000)
    const sEnd = new Date(sStart.getTime() + svc.duration_minutes * 60000)

    const { data: apptId, error: bookErr } = await admin.rpc('book_appointment', {
      p_business_id: business.id,
      p_client_id: clientId,
      p_service_id: svc.id,
      p_staff_id: staff_id || null,
      p_starts_at: sStart.toISOString(),
      p_ends_at: sEnd.toISOString(),
      p_status: 'pending',
      p_source: 'web',
      p_notes: finalNotes,
    })

    if (bookErr) {
      // Rollback de lo que ya creamos en este loop
      if (created.length > 0) {
        const ids = created.map((c) => c.id)
        await admin.from('appointments').update({ status: 'cancelled' }).in('id', ids)
      }
      const msg = bookErr.message || ''
      if (msg.includes(BookingError.SLOT_UNAVAILABLE)) {
        return NextResponse.json({ error: BookingError.SLOT_UNAVAILABLE }, { status: 409 })
      }
      if (msg.includes(BookingError.PLAN_LIMIT_REACHED) || msg.includes(BookingError.TRIAL_EXPIRED) || msg.includes(BookingError.NO_ACTIVE_PLAN) || msg.includes(BookingError.BUSINESS_NOT_ACTIVE)) {
        return NextResponse.json({ error: ApiError.NOT_ACCEPTING }, { status: 403 })
      }
      logger.error('bookings_create', bookErr, { scope: 'book_appointment', slug, serviceIndex: created.length })
      return NextResponse.json({ error: ApiError.BOOKING_FAILED }, { status: 500 })
    }

    created.push({
      id: apptId,
      cancel_token: signCancelToken(apptId),
      starts_at: sStart.toISOString(),
      service_id: svc.id,
      service_name: svc.name,
      service_price: svc.price,
    })
    offset += svc.duration_minutes
  }

  const firstAppt = created[0]
  const combinedServiceName = services.map((s) => s.name).join(' + ')

  Promise.allSettled([
    sendAppointmentConfirmation({
      to: client_email,
      clientName: client_name,
      businessName: business.name,
      serviceName: combinedServiceName,
      startsAt: firstAppt.starts_at,
      timezone: business.timezone || 'America/Mexico_City',
      address: business.address,
      vertical: org.vertical,
      appointmentId: firstAppt.id,
      cancelToken: firstAppt.cancel_token,
      slug,
    }),
    (async () => {
      const { data: account } = await admin
        .from('whatsapp_accounts')
        .select('phone_number_id, access_token, enabled')
        .eq('org_id', org.id)
        .maybeSingle()
      if (!account?.enabled) return
      const when = firstStart.toLocaleString('es-MX', {
        timeZone: business.timezone || 'America/Mexico_City',
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit',
      })
      const totalMin = services.reduce((sum, s) => sum + s.duration_minutes, 0)
      const text = `Hola ${client_name.split(' ')[0]} 👋\n\nTu cita en *${business.name}* quedó registrada.\n\n📅 ${when}\n💇 ${combinedServiceName}${services.length > 1 ? `\n⏱ ${totalMin} min total` : ''}\n\n¿Necesitas cambiarla? Responde a este mensaje.`
      await sendText({
        phoneNumberId: account.phone_number_id,
        accessToken: account.access_token,
        to: client_phone.trim(),
        body: text,
      })
    })(),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.error('bookings_notify', r.reason, { channel: i === 0 ? 'email' : 'whatsapp', appointment_id: firstAppt.id })
      }
    })
  })

  return NextResponse.json({
    ok: true,
    appointment_id: firstAppt.id,
    cancel_token: firstAppt.cancel_token,
    appointments: created,
  })
}
