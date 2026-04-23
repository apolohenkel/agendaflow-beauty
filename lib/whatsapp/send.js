// Meta WhatsApp Cloud API helper.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

import { logger } from '../logger'

const GRAPH_VERSION = 'v22.0'
// Meta limita cada mensaje de texto a 4096 caracteres. Dejamos margen para
// no chocar con el límite exacto.
const MAX_MSG_LEN = 3800

/**
 * Parte un string largo en chunks respetando límites de párrafo o frase.
 * Evita cortar a mitad de palabra u oración.
 */
function splitForWhatsApp(text, limit = MAX_MSG_LEN) {
  if (!text || text.length <= limit) return [text]
  const chunks = []
  let rest = text
  while (rest.length > limit) {
    // Preferencia de corte: doble newline, newline, final de oración, espacio
    let cut = rest.lastIndexOf('\n\n', limit)
    if (cut < limit * 0.5) cut = rest.lastIndexOf('\n', limit)
    if (cut < limit * 0.5) cut = rest.lastIndexOf('. ', limit)
    if (cut < limit * 0.5) cut = rest.lastIndexOf(' ', limit)
    if (cut <= 0) cut = limit
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trimStart()
  }
  if (rest) chunks.push(rest)
  return chunks
}

// Códigos Meta que son retryable (errores transitorios, rate limits,
// congestión del edge). 429/5xx + 130429 (meta throttle).
function isRetryable(status, code) {
  if (status === 429) return true
  if (status >= 500 && status < 600) return true
  if (code === 130429 || code === 131047) return true // meta rate-limit codes
  return false
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function sendOne({ phoneNumberId, accessToken, to, body }) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`
  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body, preview_url: false },
  })
  const maxAttempts = 3
  let lastErr = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res, data
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      })
      data = await res.json().catch(() => ({}))
    } catch (err) {
      lastErr = err
      if (attempt < maxAttempts) {
        await sleep(300 * Math.pow(2, attempt - 1))
        continue
      }
      throw err
    }
    if (res.ok) return data
    const code = data?.error?.code
    const msg = data?.error?.message || 'wa_send_failed'
    if (!isRetryable(res.status, code) || attempt === maxAttempts) {
      logger.error('wa_send', msg, { meta: data, status: res.status, attempt })
      throw new Error(msg)
    }
    logger.warn('wa_send', `retry_${attempt}`, { status: res.status, code, msg })
    await sleep(300 * Math.pow(2, attempt - 1))
  }
  throw lastErr || new Error('wa_send_exhausted')
}

/**
 * Envía un mensaje. Si excede 3800 chars lo parte en varios mensajes.
 * Retorna el último payload de Meta.
 */
export async function sendText({ phoneNumberId, accessToken, to, body }) {
  const chunks = splitForWhatsApp(body || '')
  let last = null
  for (const chunk of chunks) {
    last = await sendOne({ phoneNumberId, accessToken, to, body: chunk })
  }
  return last
}

/**
 * Marca un mensaje entrante como leído (palomita azul). No bloqueante —
 * si falla, logueamos y seguimos.
 */
export async function markAsRead({ phoneNumberId, accessToken, messageId }) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      logger.warn('wa_read_receipt', data?.error?.message || 'read_failed')
    }
  } catch (err) {
    logger.warn('wa_read_receipt', err?.message || 'read_threw')
  }
}

export async function sendTemplate({ phoneNumberId, accessToken, to, template, language = 'es', components }) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: language },
          components,
        },
      }),
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    logger.error('wa_template', data?.error?.message || 'wa_template_failed', { meta: data })
    throw new Error(data?.error?.message || 'wa_template_failed')
  }
  return data
}
