// Definiciones de tools para el agente Claude. Cada handler ejecuta SQL
// filtrado siempre por org_id derivado del webhook (NUNCA confiar en el LLM).

import { dayOfWeekInTz, localToUtcIso, dayBoundsUtcIso } from '../tz'
import { getStripe } from '../stripe'

export const TOOL_DEFS = [
  {
    name: 'list_services',
    description: 'Lista los servicios activos del salón con su nombre, duración y precio.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_staff',
    description: 'Lista las personas del equipo del salón con nombre, rol, bio y especialidades. Úsalo si preguntan por alguien específico o por una especialidad ("¿quién hace balayage?").',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_business_info',
    description: 'Devuelve nombre, dirección, horarios, si el salón cobra seña al reservar (deposit_enabled + monto), y rating promedio con cantidad de reseñas.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_booking_link',
    description: 'Devuelve la URL web del salón con descripción de lo que se puede hacer allí (ver fotos, pagar seña, dejar reseña, gestionar citas). Úsalo cuando el cliente pida algo que no puedes hacer en chat.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'check_availability',
    description: 'Devuelve los horarios disponibles para una fecha y servicio específicos. Usa este tool ANTES de proponer un horario al cliente.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        service_id: { type: 'string', description: 'ID del servicio (uuid). Obtén con list_services.' },
      },
      required: ['date', 'service_id'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Crea una cita confirmada. Llama este tool SOLO cuando el cliente haya elegido fecha, hora exacta y servicio(s). Si el salón tiene seña activa, la respuesta traerá requires_payment=true con payment_url — envía ese URL al cliente y NO digas "cita confirmada" aún.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        service_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs de servicio(s). Acepta 1-5 servicios consecutivos en la misma visita.',
        },
        starts_at: { type: 'string', description: 'ISO 8601 con timezone del primer servicio, ej: 2026-04-20T15:00:00-06:00' },
        notes: { type: 'string', description: 'Notas opcionales del cliente (alergias, preferencias, referencias).' },
      },
      required: ['client_name', 'service_ids', 'starts_at'],
    },
  },
  {
    name: 'list_my_appointments',
    description: 'Lista las próximas citas del cliente que está conversando, incluyendo notas.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancela una cita por su id (que obtienes de list_my_appointments).',
    input_schema: {
      type: 'object',
      properties: { appointment_id: { type: 'string' } },
      required: ['appointment_id'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Cambia el horario de una cita existente. Valida disponibilidad antes de confirmar.',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: { type: 'string' },
        new_starts_at: { type: 'string', description: 'ISO 8601 con timezone, ej: 2026-04-20T15:00:00-06:00' },
      },
      required: ['appointment_id', 'new_starts_at'],
    },
  },
]

function appUrl() {
  return process.env.APP_URL || 'http://localhost:3000'
}

export async function execTool({ name, input, ctx, admin }) {
  const { orgId, orgSlug, businessId, customerPhone } = ctx

  switch (name) {
    case 'list_services': {
      const { data } = await admin
        .from('services')
        .select('id, name, duration_minutes, price, category')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')
      return { services: data || [] }
    }

    case 'list_staff': {
      const { data } = await admin
        .from('staff')
        .select('id, name, role, bio, specialties')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')
      return { staff: data || [] }
    }

    case 'get_business_info': {
      const { data: biz } = await admin
        .from('businesses')
        .select('name, address, timezone, opening_hours, whatsapp_number, deposit_enabled, deposit_amount, deposit_currency')
        .eq('id', businessId)
        .single()
      if (!biz) return {}

      // Rating + review count (no bloqueante si falla)
      let rating_avg = null
      let review_count = 0
      try {
        const { data: rstats } = await admin
          .from('reviews')
          .select('rating', { count: 'exact' })
          .eq('business_id', businessId)
          .eq('published', true)
        if (rstats && rstats.length > 0) {
          rating_avg = Number((rstats.reduce((s, r) => s + r.rating, 0) / rstats.length).toFixed(1))
          review_count = rstats.length
        }
      } catch {}

      return {
        ...biz,
        deposit_display: biz.deposit_enabled && biz.deposit_amount > 0
          ? `${(biz.deposit_amount / 100).toFixed(2)} ${biz.deposit_currency?.toUpperCase() || 'USD'}`
          : null,
        rating_avg,
        review_count,
      }
    }

    case 'get_booking_link': {
      if (!orgSlug) return { error: 'slug_no_disponible' }
      const url = `${appUrl()}/b/${orgSlug}`
      return {
        url,
        description: 'Link web del salón. El cliente puede: ver fotos y perfil del staff, ver reseñas, pagar seña, reservar, consultar "Mis citas" para cancelar/reprogramar, y después de la visita dejar su reseña.',
      }
    }

    case 'check_availability': {
      const { date, service_id } = input
      const { data: svc } = await admin
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .eq('business_id', businessId)
        .maybeSingle()
      if (!svc) return { error: 'servicio_no_existe' }

      const { data: biz } = await admin
        .from('businesses')
        .select('opening_hours, timezone')
        .eq('id', businessId)
        .single()
      if (!biz?.opening_hours) return { available_slots: [], note: 'sin_horarios_configurados' }

      const tz = biz.timezone || 'America/Mexico_City'
      const dow = dayOfWeekInTz(date, tz)
      const horario = biz.opening_hours[dow]
      if (!horario) return { available_slots: [], note: 'cerrado_ese_dia' }

      const { start: dayStart, end: dayEnd } = dayBoundsUtcIso(date, tz)
      const { data: existing } = await admin
        .from('appointments')
        .select('starts_at, ends_at')
        .eq('business_id', businessId)
        .gte('starts_at', dayStart)
        .lt('starts_at', dayEnd)
        .neq('status', 'cancelled')

      const taken = (existing || []).map((a) => ({
        start: new Date(a.starts_at).getTime(),
        end: new Date(a.ends_at).getTime(),
      }))

      const [sH, sM] = horario.start.split(':').map(Number)
      const [eH, eM] = horario.end.split(':').map(Number)
      const slots = []
      let cur = sH * 60 + sM
      const end = eH * 60 + eM
      while (cur + svc.duration_minutes <= end) {
        const hh = Math.floor(cur / 60)
        const mm = cur % 60
        const slotStartUtc = new Date(localToUtcIso(date, hh, mm, tz)).getTime()
        const slotEndUtc = slotStartUtc + svc.duration_minutes * 60000
        const overlap = taken.some((t) => slotStartUtc < t.end && slotEndUtc > t.start)
        if (!overlap) {
          slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
        }
        cur += 30
      }
      return { available_slots: slots, timezone: tz }
    }

    case 'create_appointment': {
      const { client_name, service_ids, service_id, starts_at, notes } = input
      // Compat: service_id singular → array
      const requestedIds = Array.isArray(service_ids) && service_ids.length > 0
        ? service_ids
        : (service_id ? [service_id] : [])
      if (requestedIds.length === 0) return { error: 'faltan_servicios' }
      if (requestedIds.length > 5) return { error: 'maximo_5_servicios' }

      // Cargar servicios (preservando orden del request)
      const { data: svcRows } = await admin
        .from('services')
        .select('id, name, duration_minutes, price')
        .in('id', requestedIds)
        .eq('business_id', businessId)
      if (!svcRows || svcRows.length !== requestedIds.length) return { error: 'servicio_no_existe' }
      const svcById = new Map(svcRows.map((s) => [s.id, s]))
      const services = requestedIds.map((id) => svcById.get(id))

      // Cliente
      let { data: client } = await admin
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', customerPhone)
        .maybeSingle()
      if (!client) {
        const { data: newClient } = await admin
          .from('clients')
          .insert({ business_id: businessId, name: client_name, phone: customerPhone, whatsapp_phone: customerPhone })
          .select('id')
          .single()
        client = newClient
      }

      // Info de negocio para saber si tiene seña
      const { data: biz } = await admin
        .from('businesses')
        .select('name, deposit_enabled, deposit_amount, deposit_currency, organization_id')
        .eq('id', businessId)
        .single()

      const startsDate = new Date(starts_at)
      if (isNaN(startsDate.getTime())) return { error: 'fecha_invalida' }

      // Si hay seña → crear Stripe Checkout Session y devolver URL (NO crear cita aún)
      if (biz?.deposit_enabled && biz.deposit_amount > 0 && orgSlug) {
        try {
          const stripe = getStripe()
          const totalDuration = services.reduce((s, svc) => s + svc.duration_minutes, 0)
          const combined = services.map((s) => s.name).join(' + ')
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{
              price_data: {
                currency: biz.deposit_currency || 'usd',
                product_data: {
                  name: `Seña · ${biz.name}`,
                  description: combined,
                },
                unit_amount: biz.deposit_amount,
              },
              quantity: 1,
            }],
            success_url: `${appUrl()}/b/${orgSlug}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl()}/b/${orgSlug}?checkout=cancelled`,
            metadata: {
              type: 'booking_deposit',
              slug: orgSlug,
              org_id: orgId,
              business_id: businessId,
              client_id: client.id,
              service_ids: requestedIds.join(','),
              staff_id: '',
              starts_at: startsDate.toISOString(),
              client_name: client_name,
              client_phone: customerPhone,
              client_email: '',
              notes: notes || '',
            },
            locale: 'es',
          })
          return {
            requires_payment: true,
            payment_url: session.url,
            deposit_amount: `${(biz.deposit_amount / 100).toFixed(2)} ${biz.deposit_currency?.toUpperCase() || 'USD'}`,
            services_summary: combined,
            duration_minutes: totalDuration,
          }
        } catch (err) {
          return { error: 'no_se_pudo_crear_pago', detail: err?.message }
        }
      }

      // Sin seña: crear citas consecutivas (N llamadas a book_appointment con offset)
      let offset = 0
      const created = []
      for (const svc of services) {
        const sStart = new Date(startsDate.getTime() + offset * 60000)
        const sEnd = new Date(sStart.getTime() + svc.duration_minutes * 60000)
        const { data: apptId, error } = await admin.rpc('book_appointment', {
          p_business_id: businessId,
          p_client_id: client.id,
          p_service_id: svc.id,
          p_staff_id: null,
          p_starts_at: sStart.toISOString(),
          p_ends_at: sEnd.toISOString(),
          p_status: 'confirmed',
          p_source: 'whatsapp',
          p_notes: notes || null,
        })
        if (error) {
          // Rollback
          if (created.length > 0) {
            await admin.from('appointments').update({ status: 'cancelled' }).in('id', created.map((c) => c.id))
          }
          if (error.message?.includes('slot_unavailable')) return { error: 'horario_no_disponible' }
          return { error: error.message }
        }
        created.push({ id: apptId, service: svc.name, starts_at: sStart.toISOString() })
        offset += svc.duration_minutes
      }

      return {
        confirmed: true,
        appointments: created,
        services_summary: services.map((s) => s.name).join(' + '),
      }
    }

    case 'list_my_appointments': {
      const { data } = await admin
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', customerPhone)
        .maybeSingle()
      if (!data) return { appointments: [] }

      const { data: appts } = await admin
        .from('appointments')
        .select('id, starts_at, status, notes, services(name)')
        .eq('client_id', data.id)
        .gte('starts_at', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('starts_at')
      return { appointments: appts || [] }
    }

    case 'cancel_appointment': {
      const { appointment_id } = input
      const { data: client } = await admin
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', customerPhone)
        .maybeSingle()
      if (!client) return { error: 'cliente_no_encontrado' }

      const { error } = await admin
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment_id)
        .eq('client_id', client.id)
      if (error) return { error: error.message }
      return { cancelled: true }
    }

    case 'reschedule_appointment': {
      const { appointment_id, new_starts_at } = input
      const { data: client } = await admin
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', customerPhone)
        .maybeSingle()
      if (!client) return { error: 'cliente_no_encontrado' }

      const { data: appt } = await admin
        .from('appointments')
        .select('id, starts_at, ends_at, staff_id, service_id, business_id, services(duration_minutes)')
        .eq('id', appointment_id)
        .eq('client_id', client.id)
        .eq('business_id', businessId)
        .maybeSingle()
      if (!appt) return { error: 'cita_no_encontrada' }

      const duration = appt.services?.duration_minutes
        || Math.round((new Date(appt.ends_at) - new Date(appt.starts_at)) / 60000)
      const newStart = new Date(new_starts_at)
      if (isNaN(newStart.getTime())) return { error: 'fecha_invalida' }
      const newEnd = new Date(newStart.getTime() + duration * 60000)

      // Check overlap excluyendo la misma cita (sin RPC para evitar dependencia)
      const { data: overlapping } = await admin
        .from('appointments')
        .select('id')
        .eq('business_id', businessId)
        .neq('id', appointment_id)
        .not('status', 'in', '(cancelled,no_show)')
        .lt('starts_at', newEnd.toISOString())
        .gt('ends_at', newStart.toISOString())
        .limit(1)
      if (overlapping && overlapping.length > 0) return { error: 'horario_no_disponible' }

      const { error } = await admin
        .from('appointments')
        .update({ starts_at: newStart.toISOString(), ends_at: newEnd.toISOString(), reminder_24h_sent_at: null, reminder_2h_sent_at: null })
        .eq('id', appointment_id)
        .eq('client_id', client.id)
      if (error) return { error: error.message }

      return { rescheduled: true, starts_at: newStart.toISOString() }
    }

    default:
      return { error: 'tool_no_implementada' }
  }
}
