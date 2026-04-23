import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { sendText, markAsRead } from '../../../../lib/whatsapp/send'
import { runAgent } from '../../../../lib/whatsapp/agent'
import { rateLimit } from '../../../../lib/rate-limit'
import { logger } from '../../../../lib/logger'
import { normalizePhone } from '../../../../lib/phone'

function verifyMetaSignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET
  // Fail-closed: sin secret nunca aceptamos firmas (ni en dev). Si no hay
  // secret configurado, el webhook no puede ser confiado y debe rechazarse.
  if (!secret) {
    logger.warn('whatsapp_webhook', 'missing_app_secret')
    return false
  }
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try { return crypto.timingSafeEqual(a, b) } catch { return false }
}

// GET: handshake de Meta
export async function GET(request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  // Acepta tanto el verify token global como el de cada org
  if (mode === 'subscribe' && token) {
    if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 })
    }
    const admin = createAdminClient()
    const { data } = await admin
      .from('whatsapp_accounts')
      .select('org_id')
      .eq('verify_token', token)
      .maybeSingle()
    if (data) return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('forbidden', { status: 403 })
}

// POST: mensaje entrante
export async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let body
  try { body = JSON.parse(rawBody) } catch { body = {} }
  const admin = createAdminClient()

  try {
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const phoneNumberId = value?.metadata?.phone_number_id
    const message = value?.messages?.[0]
    if (!phoneNumberId || !message) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const { data: account } = await admin
      .from('whatsapp_accounts')
      .select('org_id, access_token, enabled')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle()
    if (!account || !account.enabled) {
      return NextResponse.json({ ok: true, ignored: 'no-account' })
    }

    // Mensajes non-text: respondemos con un mensaje amigable explicando que
    // aún no procesamos imágenes/audio/stickers. No procesamos la conversación
    // pero sí dejamos un registro (sin agente).
    if (message.type !== 'text') {
      const fromNormalized = normalizePhone(message.from) || `+${message.from}`
      const friendly = {
        image: 'Gracias por la foto 🌷 Por ahora sólo puedo ayudarte por mensaje de texto. ¿Me cuentas qué necesitas?',
        audio: 'Recibí tu audio 🎧 Por ahora sólo entiendo texto. ¿Me escribes qué necesitas y te ayudo al momento?',
        video: 'Recibí tu video. Por ahora sólo puedo ayudarte por texto, ¿me cuentas qué necesitas?',
        sticker: 'Jaja gracias 😊 ¿En qué te puedo ayudar? Escríbeme qué necesitas y lo coordinamos.',
        location: 'Recibí tu ubicación 📍 Déjame saber con texto qué necesitas y te ayudo.',
        document: 'Recibí el archivo. Por favor escríbeme qué necesitas y lo resolvemos por aquí.',
      }[message.type] || 'Gracias por escribir. Por ahora sólo puedo ayudarte por mensaje de texto. ¿Me cuentas qué necesitas?'
      try {
        await sendText({
          phoneNumberId,
          accessToken: account.access_token,
          to: fromNormalized,
          body: friendly,
        })
      } catch (err) {
        logger.warn('wa_webhook', 'non_text_reply_failed', { err: err?.message, type: message.type })
      }
      return NextResponse.json({ ok: true, handled: 'non-text' })
    }

    const orgId = account.org_id
    // Meta manda el número sin '+'. Normalizamos a E.164 con '+' para ser
    // consistentes con cómo los dueños guardan los teléfonos en el CRM.
    const customerPhone = normalizePhone(message.from) || `+${message.from}`
    const incomingText = message.text.body

    // Idempotencia: Meta reintenta el webhook si tardamos > unos segundos en
    // responder 200. Si el mismo wa_message_id ya fue procesado, salimos
    // para no duplicar la respuesta al cliente.
    if (message.id) {
      const { data: dup } = await admin
        .from('whatsapp_messages')
        .select('id')
        .contains('meta', { wa_message_id: message.id })
        .limit(1)
      if (dup && dup.length > 0) {
        return NextResponse.json({ ok: true, ignored: 'duplicate_wa_message_id' })
      }
    }

    const rl = await rateLimit(`wa:${orgId}:${customerPhone}`, 30, 60)
    if (!rl.allowed) {
      return NextResponse.json({ ok: true, ignored: 'rate_limited' })
    }

    // Lookup business + name + tz + slug del org para la conversación
    const { data: business } = await admin
      .from('businesses')
      .select('id, name, timezone, organizations!inner(slug)')
      .eq('organization_id', orgId)
      .single()
    if (!business) return NextResponse.json({ ok: true, ignored: 'no-business' })
    const orgSlug = business.organizations?.slug

    // Conversación + persistir mensaje entrante
    const { data: conv } = await admin
      .from('whatsapp_conversations')
      .upsert(
        { org_id: orgId, customer_phone: customerPhone, last_message_at: new Date().toISOString() },
        { onConflict: 'org_id,customer_phone' }
      )
      .select('id')
      .single()

    await admin.from('whatsapp_messages').insert({
      conversation_id: conv.id,
      direction: 'in',
      body: incomingText,
      meta: { wa_message_id: message.id },
    })

    // Palomita azul inmediata (fire-and-forget) — mejora percepción del bot.
    if (message.id) {
      markAsRead({
        phoneNumberId,
        accessToken: account.access_token,
        messageId: message.id,
      }).catch(() => {})
    }

    // Cargar últimos 12 turnos para contexto
    const { data: history } = await admin
      .from('whatsapp_messages')
      .select('direction, body')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(12)
    const trimmedHistory = (history || []).slice(0, -1) // sin el último que es el actual

    // Llamar al agente
    const reply = await runAgent({
      orgId,
      orgSlug,
      businessId: business.id,
      businessName: business.name,
      timezone: business.timezone || 'America/Mexico_City',
      customerPhone,
      conversationHistory: trimmedHistory,
      incomingText,
    })

    // Enviar respuesta
    try {
      await sendText({
        phoneNumberId,
        accessToken: account.access_token,
        to: customerPhone,
        body: reply,
      })
    } catch (err) {
      logger.error('wa_webhook', 'send_failed', {
        err: err?.message,
        orgId,
        wa_message_id: message.id,
        conv_id: conv.id,
      })
      // Aún devolvemos 200 para que Meta no reintente — el log captura el fallo.
      return NextResponse.json({ ok: true, send_failed: true })
    }

    await admin.from('whatsapp_messages').insert({
      conversation_id: conv.id,
      direction: 'out',
      body: reply,
    })

    logger.info('wa_webhook', 'reply_sent', {
      orgId,
      wa_message_id: message.id,
      conv_id: conv.id,
      reply_len: reply.length,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('wa_webhook', err)
    return NextResponse.json({ error: 'handler_error' }, { status: 500 })
  }
}
