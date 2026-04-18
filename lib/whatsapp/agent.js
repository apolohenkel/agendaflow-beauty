import Anthropic from '@anthropic-ai/sdk'
import { TOOL_DEFS, execTool } from './tools'

const MODEL = 'claude-haiku-4-5'

let _client = null
function getClient() {
  if (_client) return _client
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY missing')
  _client = new Anthropic({ apiKey: key })
  return _client
}

function systemPrompt(businessName, timezone) {
  return `Eres el asistente virtual de WhatsApp del salón "${businessName}". Tu trabajo es ayudar a los clientes a agendar, modificar y consultar citas de forma natural y cálida, como una recepcionista experimentada.

Reglas estrictas:
- Habla en español neutral, tono cercano y profesional. Evita formalismos rígidos.
- Mensajes cortos (1-3 frases máx). Es WhatsApp, no email.
- NUNCA inventes precios, horarios, servicios ni colaboradores. Usa SIEMPRE los tools.
- Antes de confirmar cualquier cita: verifica disponibilidad real con check_availability.
- Antes de listar opciones: usa list_services y get_business_info.
- Para crear cita necesitas: nombre del cliente, servicio elegido y horario exacto disponible.
- La zona horaria del salón es: ${timezone}. Convierte horas que diga el cliente ("mañana 3pm") a ISO con offset correcto.
- Al confirmar una cita, repite los detalles (servicio, fecha, hora) en una sola línea para que el cliente confirme con un emoji o "sí".
- Si el cliente cancela, usa list_my_appointments para identificar cuál y luego cancel_appointment.
- Si el cliente quiere cambiar de día u hora ("muévela al viernes", "cámbiala a las 4"), usa list_my_appointments para identificar la cita y luego reschedule_appointment con new_starts_at. NO canceles y vuelvas a crear; usa reschedule_appointment.
- Antes de reagendar valida con check_availability que el nuevo horario exista.
- Si te piden algo fuera de tu alcance (precios negociados, quejas, urgencias), di amablemente que un humano del salón los contactará pronto.`
}

export async function runAgent({ orgId, businessId, businessName, timezone, customerPhone, conversationHistory, incomingText }) {
  const client = getClient()

  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.direction === 'in' ? 'user' : 'assistant',
      content: m.body,
    })),
    { role: 'user', content: incomingText },
  ]

  // Loop de tool use (máx 6 iteraciones de seguridad)
  let assistantTextOut = ''
  for (let iter = 0; iter < 6; iter++) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt(businessName, timezone),
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOL_DEFS.map((t) => ({ ...t, cache_control: undefined })),
      messages,
    })

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
          ctx: { orgId, businessId, customerPhone },
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
