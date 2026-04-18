// Definiciones de tools para el agente Claude. Cada handler ejecuta SQL
// filtrado siempre por org_id derivado del webhook (NUNCA confiar en el LLM).

import { dayOfWeekInTz, localToUtcIso, dayBoundsUtcIso } from '../tz'

export const TOOL_DEFS = [
  {
    name: 'list_services',
    description: 'Lista los servicios activos del salón con su nombre, duración y precio.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_business_info',
    description: 'Devuelve nombre del negocio, dirección, horarios de atención (días y horas).',
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
    description: 'Crea una cita confirmada. Llama este tool SOLO cuando el cliente haya elegido fecha, hora exacta y servicio.',
    input_schema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        service_id: { type: 'string' },
        starts_at: { type: 'string', description: 'ISO 8601 con timezone, ej: 2026-04-20T15:00:00-06:00' },
        notes: { type: 'string', description: 'Notas opcionales del cliente.' },
      },
      required: ['client_name', 'service_id', 'starts_at'],
    },
  },
  {
    name: 'list_my_appointments',
    description: 'Lista las próximas citas del cliente que está conversando.',
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

export async function execTool({ name, input, ctx, admin }) {
  const { orgId, businessId, customerPhone } = ctx

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

    case 'get_business_info': {
      const { data } = await admin
        .from('businesses')
        .select('name, address, timezone, opening_hours, whatsapp_number')
        .eq('id', businessId)
        .single()
      return data || {}
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
      const { client_name, service_id, starts_at, notes } = input
      const { data: svc } = await admin
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .eq('business_id', businessId)
        .maybeSingle()
      if (!svc) return { error: 'servicio_no_existe' }

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

      const startsDate = new Date(starts_at)
      const endsDate = new Date(startsDate.getTime() + svc.duration_minutes * 60000)

      const { data: apptId, error } = await admin.rpc('book_appointment', {
        p_business_id: businessId,
        p_client_id: client.id,
        p_service_id: service_id,
        p_staff_id: null,
        p_starts_at: startsDate.toISOString(),
        p_ends_at: endsDate.toISOString(),
        p_status: 'confirmed',
        p_source: 'whatsapp',
        p_notes: notes || null,
      })
      if (error) {
        if (error.message?.includes('slot_unavailable')) return { error: 'horario_no_disponible' }
        return { error: error.message }
      }

      return { appointment: { id: apptId, starts_at: startsDate.toISOString() }, confirmed: true }
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
        .select('id, starts_at, status, services(name)')
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

      const { data: available } = await admin.rpc('check_slot_available', {
        p_business_id: businessId,
        p_staff_id: appt.staff_id,
        p_starts_at: newStart.toISOString(),
        p_ends_at: newEnd.toISOString(),
        p_exclude_id: appointment_id,
      })
      if (!available) return { error: 'horario_no_disponible' }

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
