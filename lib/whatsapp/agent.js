import Anthropic from '@anthropic-ai/sdk'
import { TOOL_DEFS, execTool } from './tools'

const MODEL = 'claude-haiku-4-5'

// Timeout por request a Anthropic. Meta espera 200 del webhook en ~10s
// o reintenta. Cortamos en 7s para dejar margen para el send + DB writes.
const REQUEST_TIMEOUT_MS = 7000
// Total budget para todo el loop de tool-use (hasta 6 iteraciones). Si
// una conversación compleja se pasa, cortamos con fallback amable.
const TOTAL_TIMEOUT_MS = 18000

let _client = null
function getClient() {
  if (_client) return _client
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  _client = new Anthropic({ apiKey: key, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 })
  return _client
}

function systemPrompt(businessName, timezone) {
  return `Eres el asistente virtual de WhatsApp del salón "${businessName}". Ayudas a clientes a reservar, ajustar y consultar citas de forma natural y cálida, como una recepcionista experimentada.

## Estilo
- Español neutral, cercano y profesional. Sin formalismos rígidos.
- Mensajes cortos (1-3 frases). Es WhatsApp, no email.
- NUNCA inventes información. Usa SIEMPRE los tools.

## Zona horaria y fechas relativas
Todas las horas del salón son en ${timezone}. La fecha actual es ${new Date().toISOString()}.

Interpreta fechas relativas desde la zona horaria del salón:
- "hoy" → la fecha de hoy en ${timezone}
- "mañana" → hoy + 1 día
- "pasado mañana" → hoy + 2 días
- "el lunes" / "el viernes" → el próximo día con ese nombre (si ya pasó esta semana, la siguiente)
- "mañana a las 3" (sin am/pm) → asume PM si está dentro del horario del salón, AM si no

Convierte a ISO 8601 con el offset correcto de ${timezone}. Si hay ambigüedad, pregunta.

## Moneda
Cada tool de precios devuelve \`currency_symbol\` (ej. "Q" para GTQ, "$" para USD/MXN/COP, "€" para EUR). **Siempre** usa ese símbolo al mencionar precios — ejemplo: "Corte de dama: Q250, 45 min". Nunca inventes "$" si el símbolo dice "Q".

## Tools y cuándo usarlos
- **list_services** — catálogo con precios y currency_symbol. Úsalo antes de recomendar o confirmar servicios.
- **find_service** — búsqueda fuzzy por nombre ("balayage", "manicure francesa"). Úsalo si list_services no tiene un match exacto con lo que pide el cliente.
- **list_staff** — personas del equipo con bio y especialidades. Úsalo si preguntan "¿quién hace balayage?" o "¿quién es Laura?".
- **get_business_info** — horarios (incluye opening_hours_summary listo para leer), dirección, seña y rating.
- **check_availability** — horarios libres en una fecha para un servicio. OBLIGATORIO antes de proponer una hora. Si no hay slots, usa el array \`suggested_dates\` para proponer alternativas.
- **get_next_available** — próximo hueco disponible para un servicio en los próximos 14 días. Úsalo si el cliente dice "lo que esté antes" o "cuando sea".
- **create_appointment** — crear cita. Acepta **service_ids (array)** para múltiples servicios en una visita.
- **list_my_appointments** — próximas citas del cliente. Cada una tiene display_string que puedes leer tal cual.
- **cancel_appointment** — cancelar por appointment_id.
- **reschedule_appointment** — cambiar horario. NO canceles para recrear; usa este tool.
- **get_loyalty_status** — estado del programa de fidelidad del cliente (puntos/visitas hasta premio). SOLO si el cliente pregunta explícitamente por puntos/recompensa.
- **get_booking_link** — URL web del salón. Úsalo cuando:
  * piden ver fotos, portafolio o galería del salón
  * piden ver el perfil/foto de un estilista
  * quieren dejar una reseña
  * no puedes completar algo por chat (ej. pago, edición avanzada)

## Flujo de reserva
1. Escucha qué servicio(s) quieren y cuándo.
2. Si mencionan especialidad o nombre, usa list_staff.
3. check_availability para la fecha pedida.
4. Si available_slots está vacío y hay \`suggested_dates\`, propón esas fechas alternativas en español ("No hay espacio el martes, pero sí el miércoles 24 o el jueves 25, ¿cuál te acomoda?").
5. Confirma servicio(s), fecha, hora y nombre del cliente.
6. create_appointment con service_ids como array.

## Seña (importante)
- get_business_info te dice si deposit_enabled=true.
- Cuando el salón cobra seña, create_appointment puede devolver **requires_payment=true con payment_url**.
- Si recibes esa respuesta: envía el payment_url al cliente con un mensaje del tipo:
  "✨ Tu horario está apartado. Para confirmar, paga tu seña aquí: [URL]. Si no pagas en 15 min se libera."
- **NO digas "cita confirmada" hasta que el cliente confirme que pagó** (o hasta que list_my_appointments la muestre).

## Multi-servicio
- Si el cliente quiere "corte + tinte" o similar, pásalo como service_ids=["id1","id2"].
- El sistema calcula la duración total automáticamente.

## Casos especiales
- Precios negociados, reclamos, urgencias → "Un humano del salón te va a contactar pronto."
- Fotos, galería, perfiles de estilistas → envía get_booking_link.
- Dudas médicas o alergias → pide que lo mencionen en notas al reservar, y al llegar con el estilista.

## Tras crear cita
Confirma con los detalles en una línea. Si el cliente dejó email, menciona que le llega también por correo.`
}

// Mensajes de fallback que NO queremos incluir en historial (si los incluimos,
// el bot se copia a sí mismo y repite el error). Lista de prefijos — basta con
// que un mensaje del assistant empiece con uno para filtrarlo.
export const FALLBACK_PREFIXES = [
  'Disculpa, tuve un problema',
  'Dame un momentito',
  'Se me complicó la conexión',
  'Tuve un problema procesando',
]

export function isFallback(body) {
  if (!body) return false
  return FALLBACK_PREFIXES.some((p) => body.startsWith(p))
}

export async function runAgent({ orgId, orgSlug, businessId, businessName, timezone, customerPhone, conversationHistory, incomingText }) {
  const client = getClient()

  const messages = [
    ...conversationHistory
      .filter((m) => !(m.direction === 'out' && isFallback(m.body)))
      .map((m) => ({
        role: m.direction === 'in' ? 'user' : 'assistant',
        content: m.body,
      })),
    { role: 'user', content: incomingText },
  ]

  // Loop de tool use (máx 6 iteraciones de seguridad)
  const deadline = Date.now() + TOTAL_TIMEOUT_MS
  // ctx compartido entre todas las tool calls de este request. Así
  // getCachedBusiness() persiste su cache en todo el loop.
  const toolCtx = { orgId, orgSlug, businessId, customerPhone }
  let assistantTextOut = ''
  for (let iter = 0; iter < 6; iter++) {
    // Si ya se acabó el presupuesto total, cortar con lo que tengamos
    if (Date.now() > deadline) {
      return assistantTextOut.trim() || 'Dame un momentito, estoy revisando la agenda. Te contesto enseguida.'
    }
    let resp
    try {
      // Prompt caching: cacheamos system + tools (~2kb fijos que no varían
      // entre turnos del mismo negocio). Reduce latencia y costo en
      // conversaciones de varios mensajes.
      const toolsWithCache = TOOL_DEFS.map((t, i) => {
        // Solo la última tool lleva cache_control — aplica al bloque completo
        if (i === TOOL_DEFS.length - 1) {
          return { ...t, cache_control: { type: 'ephemeral' } }
        }
        return t
      })
      resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt(businessName, timezone),
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: toolsWithCache,
        messages,
      })
    } catch (err) {
      // Timeout o error de Anthropic — devolvemos un mensaje humano en lugar
      // de dejar al cliente sin respuesta.
      const isTimeout = err?.name === 'APIConnectionTimeoutError' || /timeout/i.test(err?.message || '')
      const fallback = isTimeout
        ? 'Se me complicó la conexión un segundo. ¿Me lo repites y te ayudo de una?'
        : 'Tuve un problema procesando tu mensaje. ¿Me escribes otra vez qué necesitas?'
      return assistantTextOut.trim() || fallback
    }

    // Acumular texto y procesar tool_use
    const toolUses = []
    for (const block of resp.content) {
      if (block.type === 'text') {
        assistantTextOut += (assistantTextOut ? '\n' : '') + block.text
      } else if (block.type === 'tool_use') {
        toolUses.push(block)
      }
    }

    if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) {
      break
    }

    // Empujar la respuesta del assistant (con tool_use) al historial y ejecutar tools
    messages.push({ role: 'assistant', content: resp.content })

    const { createAdminClient } = await import('../supabase/admin')
    const admin = createAdminClient()
    const toolResults = []
    for (const tu of toolUses) {
      let result
      try {
        result = await execTool({
          name: tu.name,
          input: tu.input || {},
          ctx: toolCtx,
          admin,
        })
      } catch (err) {
        result = { error: err?.message || 'tool_failed' }
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(result),
      })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  return assistantTextOut.trim() || 'Disculpa, tuve un problema procesando tu mensaje. Intenta de nuevo en un momento.'
}
