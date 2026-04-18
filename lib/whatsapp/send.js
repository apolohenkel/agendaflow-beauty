// Meta WhatsApp Cloud API helper.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

import { logger } from '../logger'

const GRAPH_VERSION = 'v22.0'

export async function sendText({ phoneNumberId, accessToken, to, body }) {
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
        type: 'text',
        text: { body, preview_url: false },
      }),
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    logger.error('wa_send', data?.error?.message || 'wa_send_failed', { meta: data })
    throw new Error(data?.error?.message || 'wa_send_failed')
  }
  return data
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
