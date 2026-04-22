import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { sendText } from '../../../../lib/whatsapp/send'
import { runAgent } from '../../../../lib/whatsapp/agent'
import { rateLimit } from '../../../../lib/rate-limit'
import { logger } from '../../../../lib/logger'

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
    if (message.type !== 'text') {
      return NextResponse.json({ ok: true, ignored: 'non-text' })
    }

    const { data: account } = await admin
      .from('whatsapp_accounts')
      .select('org_id, access_token, enabled')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle()
    if (!account || !account.enabled) {
      return NextResponse.json({ ok: true, ignored: 'no-account' })
    }

    const orgId = account.org_id
    const customerPhone = message.from
    const incomingText = message.text.body

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
    await sendText({
      phoneNumberId,
      accessToken: account.access_token,
      to: customerPhone,
      body: reply,
    })

    await admin.from('whatsapp_messages').insert({
      conversation_id: conv.id,
      direction: 'out',
      body: reply,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('wa_webhook', err)
    return NextResponse.json({ error: 'handler_error' }, { status: 500 })
  }
}
