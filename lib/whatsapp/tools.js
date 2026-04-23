// Definiciones de tools para el agente Claude. Cada handler ejecuta SQL
// filtrado siempre por org_id derivado del webhook (NUNCA confiar en el LLM).

import { dayOfWeekInTz, localToUtcIso, dayBoundsUtcIso } from '../tz'
import { getStripe, isStripeConfigured } from '../stripe'
import { phoneVariants } from '../phone'
import { logger } from '../logger'

// Símbolos de moneda por código ISO — para que el bot diga "Q150" en GTQ,
// "$150" en USD/MXN/COP y "€50" en EUR.
const CURRENCY_SYMBOLS = {
  gtq: 'Q',
  usd: '$',
  mxn: '$',
  cop: '$',
  pen: 'S/',
  clp: '$',
  ars: '$',
  eur: '€',
}

function currencySymbol(code) {
  return CURRENCY_SYMBOLS[(code || 'gtq').toLowerCase()] || (code || '').toUpperCase()
}

// Orden de días (cómo los almacena Supabase — lowercase en inglés)
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAYS_ES = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom',
}

/**
 * Convierte opening_hours (objeto { monday: {start,end}, ... }) a un resumen
 * humano en español, agrupando días consecutivos con el mismo horario.
 * Ej: "Lun-Vie 9:00-19:00, Sáb 10:00-17:00, Dom cerrado"
 */
export function formatOpeningHours(hours) {
  if (!hours || typeof hours !== 'object') return null
  const ranges = DAYS_ORDER.map((day) => {
    const h = hours[day]
    if (!h || !h.start || !h.end) return { day, label: 'cerrado' }
    return { day, label: `${h.start}-${h.end}` }
  })

  // Agrupar rangos consecutivos con el mismo label
  const groups = []
  let cur = { start: 0, end: 0, label: ranges[0].label }
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].label === cur.label) {
      cur.end = i
    } else {
      groups.push(cur)
      cur = { start: i, end: i, label: ranges[i].label }
    }
  }
  groups.push(cur)

  return groups
    .map((g) => {
      const dayLabel = g.start === g.end
        ? DAYS_ES[DAYS_ORDER[g.start]]
        : `${DAYS_ES[DAYS_ORDER[g.start]]}-${DAYS_ES[DAYS_ORDER[g.end]]}`
      return g.label === 'cerrado' ? `${dayLabel} cerrado` : `${dayLabel} ${g.label}`
    })
    .join(', ')
}

export const TOOL_DEFS = [
  {
    name: 'list_services',
    description: 'Lista los servicios activos del salón con su nombre, duración y precio. El resultado incluye currency_symbol (ej. "Q" para GTQ) que DEBES usar al decir precios al cliente.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'find_service',
    description: 'Busca servicios por nombre aproximado ("corte", "balayage", "manicure francesa"). Úsalo si el cliente menciona un servicio con un nombre que no coincide exactamente con list_services. Devuelve hasta 5 coincidencias por similitud.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Palabras clave del servicio a buscar.' },
      },
      required: ['query'],
    },
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
    description: 'Lista las próximas citas del cliente que está conversando, incluyendo notas. Cada cita tiene un display_string con la fecha formateada que puedes leer al cliente tal cual.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_loyalty_status',
    description: 'Verifica si el salón tiene programa de fidelidad activo y cuántas visitas le faltan al cliente para ganar la recompensa. Usa esto SOLO si el cliente pregunta por puntos, recompensa, "¿me falta para mi corte gratis?".',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_next_available',
    description: 'Devuelve el próximo hueco disponible a partir de hoy para un servicio específico. Útil cuando el cliente dice "lo que esté antes" o "cuando sea". Busca hasta 14 días hacia adelante.',
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string' },
      },
      required: ['service_id'],
    },
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
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000'
  )
}

// Cache de business por businessId dentro del request (los tools se llaman
// varias veces por request; cachear evita 5-6 queries redundantes).
async function getCachedBusiness(admin, businessId, ctx) {
  if (ctx._bizCache) return ctx._bizCache
  const { data: biz } = await admin
    .from('businesses')
    .select('id, name, address, currency, timezone, opening_hours, whatsapp_number, deposit_enabled, deposit_currency, organization_id')
    .eq('id', businessId)
    .maybeSingle()
  ctx._bizCache = biz
  return biz
}

export async function execTool({ name, input, ctx, admin }) {
  const { orgId, orgSlug, businessId, customerPhone } = ctx

  switch (name) {
    case 'find_service': {
      const { query } = input
      if (!query || typeof query !== 'string') return { matches: [] }
      const biz = await getCachedBusiness(admin, businessId, ctx)
      const currency = biz?.currency || 'gtq'
      const { data: all } = await admin
        .from('services')
        .select('id, name, duration_minutes, price, category, deposit_amount')
        .eq('business_id', businessId)
        .eq('active', true)
      if (!all || all.length === 0) return { matches: [], currency, currency_symbol: currencySymbol(currency) }

      // Score por coincidencia de tokens normalizados
      const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const qTokens = norm(query).split(/\s+/).filter(Boolean)
      const scored = all.map((svc) => {
        const hay = norm(`${svc.name} ${svc.category || ''}`)
        let score = 0
        for (const tok of qTokens) {
          if (hay.includes(tok)) score += 2
          else if (tok.length > 3 && hay.includes(tok.slice(0, -1))) score += 1
        }
        return { svc, score }
      })
      scored.sort((a, b) => b.score - a.score)
      const matches = scored.filter((s) => s.score > 0).slice(0, 5).map((s) => s.svc)
      return {
        matches,
        currency,
        currency_symbol: currencySymbol(currency),
      }
    }

    case 'list_services': {
      // Currency del negocio va incluido para que el bot pueda formatear
      // los precios correctamente (Q vs $ vs €) sin adivinar.
      const biz = await getCachedBusiness(admin, businessId, ctx)
      const currency = biz?.currency || 'gtq'
      const { data } = await admin
        .from('services')
        .select('id, name, duration_minutes, price, category, deposit_amount')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')
      return {
        services: data || [],
        currency,
        currency_symbol: currencySymbol(currency),
        note: `Precios en ${currency.toUpperCase()} (${currencySymbol(currency)}). price es el valor completo; deposit_amount está en centavos (dividir /100 para mostrar).`,
      }
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
      const biz = await getCachedBusiness(admin, businessId, ctx)
      if (!biz) return { error: 'negocio_no_encontrado' }

      // Para seña preferimos deposit_currency si está seteada (Stripe puede
      // cobrar en otra moneda), pero fallback a business.currency.
      const displayCurrency = biz.currency || 'gtq'
      const depositCurrency = biz.deposit_currency || displayCurrency
      const sym = currencySymbol(depositCurrency)

      // Resumen de seña: si está habilitada, cuántos servicios tienen y el rango
      let deposit_summary = null
      if (biz.deposit_enabled) {
        const { data: svcs } = await admin
          .from('services')
          .select('deposit_amount')
          .eq('business_id', businessId)
          .eq('active', true)
          .gt('deposit_amount', 0)
        if (svcs && svcs.length > 0) {
          const amounts = svcs.map((s) => s.deposit_amount)
          const min = Math.min(...amounts)
          const max = Math.max(...amounts)
          deposit_summary = min === max
            ? `Algunos servicios requieren seña de ${sym}${(min / 100).toFixed(2)}.`
            : `Algunos servicios requieren seña entre ${sym}${(min / 100).toFixed(2)} y ${sym}${(max / 100).toFixed(2)}.`
        }
      }

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

      // Retornamos sólo los campos que el bot puede mencionar (sin
      // organization_id ni whatsapp_number). Agregamos un resumen de horarios
      // listo para leer en voz alta.
      return {
        name: biz.name,
        address: biz.address,
        timezone: biz.timezone,
        opening_hours: biz.opening_hours,
        opening_hours_summary: formatOpeningHours(biz.opening_hours),
        deposit_enabled: biz.deposit_enabled,
        display_currency: displayCurrency,
        currency_symbol: sym,
        deposit_summary,
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
      // Validar fecha: formato YYYY-MM-DD, no en pasado, no más de 180 días futuro
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
        return { error: 'fecha_invalida', message: 'La fecha debe estar en formato AAAA-MM-DD.' }
      }
      const dateObj = new Date(`${date}T12:00:00Z`)
      if (isNaN(dateObj.getTime())) return { error: 'fecha_invalida' }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (dateObj < new Date(today.getTime() - 24 * 3600 * 1000)) {
        return { error: 'fecha_en_pasado', message: 'Esa fecha ya pasó. Propón una futura.' }
      }
      const maxFuture = new Date()
      maxFuture.setDate(maxFuture.getDate() + 180)
      if (dateObj > maxFuture) {
        return { error: 'fecha_muy_lejana', message: 'Solo agendamos hasta 6 meses en adelante.' }
      }

      const { data: svc } = await admin
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .eq('business_id', businessId)
        .maybeSingle()
      if (!svc) return { error: 'servicio_no_existe' }

      const biz = await getCachedBusiness(admin, businessId, ctx)
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
        // Además: filtrar slots en el pasado si la fecha es hoy
        if (!overlap && slotStartUtc > Date.now()) {
          slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`)
        }
        cur += 30
      }

      // Si no hay slots en la fecha pedida, proponer los próximos 5 días con
      // al menos un slot — evita que el bot diga "no hay" y el cliente se
      // vaya; le damos opciones concretas.
      let suggestion = null
      if (slots.length === 0) {
        suggestion = []
        const baseDate = new Date(`${date}T12:00:00Z`)
        for (let offset = 1; offset <= 7 && suggestion.length < 3; offset++) {
          const next = new Date(baseDate)
          next.setUTCDate(next.getUTCDate() + offset)
          const nextStr = next.toISOString().slice(0, 10)
          const nextDow = dayOfWeekInTz(nextStr, tz)
          const nextHorario = biz.opening_hours[nextDow]
          if (nextHorario) {
            suggestion.push(nextStr)
          }
        }
      }

      return {
        available_slots: slots,
        timezone: tz,
        date,
        suggested_dates: suggestion,
      }
    }

    case 'create_appointment': {
      const { client_name: rawName, service_ids, service_id, starts_at, notes: rawNotes } = input
      // Sanitizar nombre: trim + cap a 80 chars. Rechazar si vacío.
      const client_name = (rawName || '').trim().slice(0, 80)
      if (!client_name) return { error: 'falta_nombre', message: 'Necesito el nombre del cliente.' }
      // Sanitizar notas: cap a 500 chars.
      const notes = rawNotes ? String(rawNotes).trim().slice(0, 500) : null

      // Compat: service_id singular → array
      const requestedIds = Array.isArray(service_ids) && service_ids.length > 0
        ? service_ids
        : (service_id ? [service_id] : [])
      if (requestedIds.length === 0) return { error: 'faltan_servicios' }
      if (requestedIds.length > 5) return { error: 'maximo_5_servicios' }

      // Cargar servicios (preservando orden del request)
      const { data: svcRows } = await admin
        .from('services')
        .select('id, name, duration_minutes, price, deposit_amount')
        .in('id', requestedIds)
        .eq('business_id', businessId)
      if (!svcRows || svcRows.length !== requestedIds.length) return { error: 'servicio_no_existe' }
      const svcById = new Map(svcRows.map((s) => [s.id, s]))
      const services = requestedIds.map((id) => svcById.get(id))

      // Cliente — intentamos variantes del teléfono (con/sin '+', últimos 8
      // dígitos) para matchear contactos que el dueño guardó en otro formato.
      const variants = phoneVariants(customerPhone)
      let client = null
      if (variants.length > 0) {
        const { data: rows } = await admin
          .from('clients')
          .select('id, name, email')
          .eq('business_id', businessId)
          .or(variants.map((v) => `phone.eq.${v}`).join(','))
          .limit(1)
        client = rows?.[0] || null
      }
      if (!client) {
        const { data: newClient } = await admin
          .from('clients')
          .insert({ business_id: businessId, name: client_name, phone: customerPhone, whatsapp_phone: customerPhone })
          .select('id, name, email')
          .single()
        client = newClient
      } else if (client.name !== client_name && client_name) {
        // Actualizar nombre si el cliente dio uno más específico en esta conversación
        // (no sobrescribimos si el nombre actual es más largo/detallado)
        if (!client.name || client_name.length > client.name.length) {
          await admin.from('clients').update({ name: client_name }).eq('id', client.id)
        }
      }
      if (!client) return { error: 'no_se_pudo_crear_cliente' }

      // Info de negocio para saber si tiene seña
      const biz = await getCachedBusiness(admin, businessId, ctx)
      if (!biz) return { error: 'negocio_no_encontrado' }

      const startsDate = new Date(starts_at)
      if (isNaN(startsDate.getTime())) return { error: 'fecha_invalida' }
      // No permitir citas en pasado (con margen de 5 min para race conditions)
      if (startsDate.getTime() < Date.now() - 5 * 60000) {
        return { error: 'fecha_en_pasado', message: 'No puedo agendar en el pasado. Propón otra fecha.' }
      }
      // No permitir más de 6 meses en adelante
      const maxFuture = new Date()
      maxFuture.setDate(maxFuture.getDate() + 180)
      if (startsDate > maxFuture) {
        return { error: 'fecha_muy_lejana', message: 'Solo agendamos hasta 6 meses en adelante.' }
      }

      // Seña total = suma de deposits de los servicios (si el negocio la tiene habilitada)
      const totalDeposit = biz?.deposit_enabled
        ? services.reduce((s, svc) => s + (Number(svc.deposit_amount) || 0), 0)
        : 0

      // Si hay seña → crear Stripe Checkout Session y devolver URL (NO crear cita aún)
      if (totalDeposit > 0 && orgSlug) {
        // Stripe cobra en deposit_currency; si no está seteada usamos la del
        // negocio (business.currency). Fallback final a 'gtq' ya que
        // AgendaFlow default es Guatemala.
        const chargeCurrency = (biz.deposit_currency || biz.currency || 'gtq').toLowerCase()
        const sym = currencySymbol(chargeCurrency)
        // Si el negocio tiene deposit_enabled pero Stripe no está configurado
        // a nivel plataforma, avisamos claro en lugar de crashear.
        if (!isStripeConfigured()) {
          logger.warn('wa_tool_create_appt', 'stripe_not_configured', { businessId })
          return {
            error: 'pago_no_disponible',
            message: 'El salón tiene seña activada pero el procesador de pagos no está configurado. Por favor coordina con el salón.',
          }
        }
        try {
          const stripe = getStripe()
          const totalDuration = services.reduce((s, svc) => s + svc.duration_minutes, 0)
          const combined = services.map((s) => s.name).join(' + ')
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{
              price_data: {
                currency: chargeCurrency,
                product_data: {
                  name: `Seña · ${biz.name}`,
                  description: combined,
                },
                unit_amount: totalDeposit,
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
            deposit_amount: `${sym}${(totalDeposit / 100).toFixed(2)}`,
            deposit_currency: chargeCurrency,
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
          const msg = error.message || ''
          // Mapear errores de book_appointment RPC a mensajes claros en español.
          if (msg.includes('slot_unavailable')) {
            return { error: 'horario_no_disponible', message: 'Ese horario ya no está libre. Propón otro.' }
          }
          if (msg.includes('plan_limit_reached')) {
            return { error: 'limite_de_citas_alcanzado', message: 'El salón alcanzó el límite de citas de su plan este mes. Escríbeles directo para ver opciones.' }
          }
          if (msg.includes('trial_expired')) {
            return { error: 'prueba_vencida', message: 'El período de prueba del salón venció. Escríbeles directo para agendar.' }
          }
          if (msg.includes('no_active_plan')) {
            return { error: 'plan_inactivo', message: 'El salón no tiene plan activo. Escríbeles directo.' }
          }
          if (msg.includes('business_not_active')) {
            return { error: 'salon_inactivo', message: 'El salón no está aceptando reservas por aquí ahora mismo.' }
          }
          return { error: msg }
        }
        created.push({ id: apptId, service: svc.name, starts_at: sStart.toISOString() })
        offset += svc.duration_minutes
      }

      // Enviar email de confirmación si el cliente tiene email guardado
      // (fire-and-forget, no bloqueamos la respuesta al bot)
      if (client.email && created.length > 0) {
        import('../email').then(({ sendAppointmentConfirmation }) => {
          sendAppointmentConfirmation({
            to: client.email,
            clientName: client_name,
            businessName: biz.name,
            serviceName: services.map((s) => s.name).join(' + '),
            startsAt: created[0].starts_at,
            timezone: biz.timezone,
            address: biz.address,
            vertical: biz.vertical,
            appointmentId: created[0].id,
            slug: orgSlug,
          }).catch(() => {})
        }).catch(() => {})
      }

      return {
        confirmed: true,
        appointments: created,
        services_summary: services.map((s) => s.name).join(' + '),
        email_sent: Boolean(client.email),
      }
    }

    case 'get_loyalty_status': {
      const { data: rule } = await admin
        .from('loyalty_rules')
        .select('id, name, visits_required, counted_service_ids, reward_type, reward_value, reward_service_id, reward_description, active')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!rule) return { has_program: false }

      // Buscar cliente por variantes de teléfono
      const variants = phoneVariants(customerPhone)
      const { data: clientRows } = variants.length > 0
        ? await admin
            .from('clients')
            .select('id')
            .eq('business_id', businessId)
            .or(variants.map((v) => `phone.eq.${v}`).join(','))
            .limit(1)
        : { data: [] }
      const client = clientRows?.[0]
      if (!client) {
        return {
          has_program: true,
          program_name: rule.name,
          visits_required: rule.visits_required,
          visits_completed: 0,
          visits_remaining: rule.visits_required,
          reward_description: rule.reward_description,
          note: 'Cliente nuevo — contará sus visitas a partir de la primera cita.',
        }
      }

      // Contar visitas completadas — filtramos por counted_service_ids si hay restricción
      let apptsQuery = admin
        .from('appointments')
        .select('id, service_id', { count: 'exact' })
        .eq('client_id', client.id)
        .eq('business_id', businessId)
        .eq('status', 'completed')
      if (rule.counted_service_ids && rule.counted_service_ids.length > 0) {
        apptsQuery = apptsQuery.in('service_id', rule.counted_service_ids)
      }
      const { count: visits_completed } = await apptsQuery
      const remaining = Math.max(0, rule.visits_required - (visits_completed || 0))
      const canRedeem = remaining === 0 && (visits_completed || 0) >= rule.visits_required

      return {
        has_program: true,
        program_name: rule.name,
        visits_required: rule.visits_required,
        visits_completed: visits_completed || 0,
        visits_remaining: remaining,
        can_redeem: canRedeem,
        reward_type: rule.reward_type,
        reward_description: rule.reward_description,
      }
    }

    case 'get_next_available': {
      const { service_id } = input
      const { data: svc } = await admin
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .eq('business_id', businessId)
        .maybeSingle()
      if (!svc) return { error: 'servicio_no_existe' }

      const biz = await getCachedBusiness(admin, businessId, ctx)
      if (!biz?.opening_hours) return { found: false, note: 'sin_horarios_configurados' }

      const tz = biz.timezone || 'America/Guatemala'
      const today = new Date()
      for (let offset = 0; offset < 14; offset++) {
        const day = new Date(today)
        day.setDate(day.getDate() + offset)
        const dateStr = day.toISOString().slice(0, 10)
        const dow = dayOfWeekInTz(dateStr, tz)
        const horario = biz.opening_hours[dow]
        if (!horario) continue

        const { start: dayStart, end: dayEnd } = dayBoundsUtcIso(dateStr, tz)
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
        let cur = sH * 60 + sM
        const end = eH * 60 + eM
        while (cur + svc.duration_minutes <= end) {
          const hh = Math.floor(cur / 60)
          const mm = cur % 60
          const slotStartUtc = new Date(localToUtcIso(dateStr, hh, mm, tz)).getTime()
          const slotEndUtc = slotStartUtc + svc.duration_minutes * 60000
          const overlap = taken.some((t) => slotStartUtc < t.end && slotEndUtc > t.start)
          if (!overlap && slotStartUtc > Date.now()) {
            return {
              found: true,
              date: dateStr,
              time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
              starts_at_iso: new Date(slotStartUtc).toISOString(),
              timezone: tz,
            }
          }
          cur += 30
        }
      }
      return { found: false, note: 'sin_huecos_14_dias' }
    }

    case 'list_my_appointments': {
      const variants = phoneVariants(customerPhone)
      if (variants.length === 0) return { appointments: [] }
      const { data: clientRows } = await admin
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .or(variants.map((v) => `phone.eq.${v}`).join(','))
        .limit(1)
      const client = clientRows?.[0]
      if (!client) return { appointments: [] }

      const biz = await getCachedBusiness(admin, businessId, ctx)
      const tz = biz?.timezone || 'America/Guatemala'

      const { data: appts } = await admin
        .from('appointments')
        .select('id, starts_at, ends_at, status, notes, services(name, duration_minutes)')
        .eq('client_id', client.id)
        .gte('starts_at', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('starts_at')

      // Agregamos un display_string por cita para que el bot pueda citarlo
      // tal cual sin tener que parsear ISO dates manualmente.
      const enriched = (appts || []).map((a) => ({
        id: a.id,
        service_name: a.services?.name || 'Servicio',
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        notes: a.notes,
        display_string: new Date(a.starts_at).toLocaleString('es-GT', {
          timeZone: tz,
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
      return { appointments: enriched, timezone: tz }
    }

    case 'cancel_appointment': {
      const { appointment_id } = input
      const variants = phoneVariants(customerPhone)
      const { data: clientRows } = await admin
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .or(variants.map((v) => `phone.eq.${v}`).join(','))
        .limit(1)
      const client = clientRows?.[0]
      if (!client) return { error: 'cliente_no_encontrado' }

      // Cargar la cita antes de cancelar para devolver detalle útil
      const { data: apptBefore } = await admin
        .from('appointments')
        .select('id, starts_at, services(name)')
        .eq('id', appointment_id)
        .eq('client_id', client.id)
        .maybeSingle()
      if (!apptBefore) return { error: 'cita_no_encontrada', message: 'No encuentro esa cita. Usa list_my_appointments para ver tus citas.' }

      const { error } = await admin
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment_id)
        .eq('client_id', client.id)
      if (error) return { error: error.message }
      return {
        cancelled: true,
        service_name: apptBefore.services?.name,
        was_at: apptBefore.starts_at,
      }
    }

    case 'reschedule_appointment': {
      const { appointment_id, new_starts_at } = input
      const variants = phoneVariants(customerPhone)
      const { data: clientRows } = await admin
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .or(variants.map((v) => `phone.eq.${v}`).join(','))
        .limit(1)
      const client = clientRows?.[0]
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
      // No permitir reschedule a pasado ni más de 6 meses
      if (newStart.getTime() < Date.now() - 5 * 60000) {
        return { error: 'fecha_en_pasado', message: 'No puedo mover la cita al pasado.' }
      }
      const maxFuture = new Date()
      maxFuture.setDate(maxFuture.getDate() + 180)
      if (newStart > maxFuture) {
        return { error: 'fecha_muy_lejana', message: 'Solo agendamos hasta 6 meses en adelante.' }
      }
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
        .update({
          starts_at: newStart.toISOString(),
          ends_at: newEnd.toISOString(),
          status: 'rescheduled',
          reminder_24h_sent_at: null,
          reminder_2h_sent_at: null,
        })
        .eq('id', appointment_id)
        .eq('client_id', client.id)
      if (error) return { error: error.message }

      return {
        rescheduled: true,
        starts_at: newStart.toISOString(),
        previous_starts_at: appt.starts_at,
        duration_minutes: duration,
      }
    }

    default:
      return { error: 'tool_no_implementada' }
  }
}
