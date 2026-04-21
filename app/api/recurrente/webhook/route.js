import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'node:crypto'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { mapRecurrenteStatus, planFromProductId } from '../../../../lib/recurrente'
import { sendPaymentFailedEmail } from '../../../../lib/email'
import { logger } from '../../../../lib/logger'

// Webhook de Recurrente. Eventos soportados:
//  - payment_intent.succeeded / payment_intent.failed
//  - subscription.create / subscription.cancel / subscription.past_due / subscription.paused
//  - setup_intent.succeeded / setup_intent.cancelled
//
// Firma: Recurrente no documenta públicamente el header ni método de firma. Esta
// implementación intenta verificar con HMAC-SHA256 estándar usando el secret del
// webhook. Prueba varios nombres de header comunes. Si todos fallan y
// RECURRENTE_SKIP_SIGNATURE no está seteado, rechaza el request.

const POSSIBLE_SIG_HEADERS = [
  'recurrente-signature',
  'x-recurrente-signature',
  'x-signature',
  'signature',
]

function getSignatureHeader(h) {
  for (const name of POSSIBLE_SIG_HEADERS) {
    const v = h.get(name)
    if (v) return { name, value: v }
  }
  return null
}

function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // Algunos proveedores envían "sha256=xxxx", extraemos la parte hex
  const sig = signatureHeader.value.includes('=')
    ? signatureHeader.value.split('=').pop()
    : signatureHeader.value
  try {
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

export async function POST(request) {
  const rawBody = await request.text()
  const h = await headers()
  const secret = process.env.RECURRENTE_WEBHOOK_SECRET
  const skipSignature = process.env.RECURRENTE_SKIP_SIGNATURE === 'true'

  // Log headers del primer evento para detectar el de firma correcto en prod
  if (!skipSignature) {
    const sigHeader = getSignatureHeader(h)
    if (!sigHeader) {
      logger.error('rec_webhook', 'no_signature_header_found', {
        headers: Array.from(h.keys()),
      })
      return NextResponse.json({ error: 'missing signature' }, { status: 400 })
    }
    if (!secret) {
      logger.error('rec_webhook', 'RECURRENTE_WEBHOOK_SECRET missing')
      return NextResponse.json({ error: 'webhook not configured' }, { status: 500 })
    }
    if (!verifySignature(rawBody, sigHeader, secret)) {
      logger.warn('rec_webhook', 'invalid_signature', { header_used: sigHeader.name })
      return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
    }
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const eventType = event?.event_type || event?.event || event?.type
  const data = event?.data || event
  const meta = data?.metadata || event?.metadata || {}
  const orgIdFromMeta = meta.org_id || event?.checkout?.metadata?.org_id

  const admin = createAdminClient()

  try {
    switch (eventType) {
      case 'subscription.create':
      case 'subscription.update': {
        const subId = data?.id || data?.subscription_id
        const productId = data?.product_id || data?.items?.[0]?.product_id
        const customerId = data?.customer_id || data?.customer?.id
        const planKey = meta.plan || planFromProductId(productId)
        const status = mapRecurrenteStatus(data?.status || 'active')
        const renewsAt = data?.next_billing_at || data?.current_period_end || null

        let orgId = orgIdFromMeta
        if (!orgId) {
          // Fallback: buscar por checkout_id previo
          const checkoutId = event?.checkout?.id || data?.checkout_id
          if (checkoutId) {
            const { data: existing } = await admin
              .from('subscriptions')
              .select('org_id')
              .eq('recurrente_checkout_id', checkoutId)
              .maybeSingle()
            orgId = existing?.org_id
          }
        }

        if (!orgId) {
          logger.warn('rec_webhook', 'sub_without_org_id', { sub_id: subId })
          break
        }

        await admin.from('subscriptions').upsert({
          org_id: orgId,
          recurrente_customer_id: customerId ? String(customerId) : null,
          recurrente_subscription_id: subId ? String(subId) : null,
          status,
          plan: planKey,
          current_period_end: renewsAt ? new Date(renewsAt).toISOString() : null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id' })

        if (planKey && status === 'active') {
          await admin.from('organizations').update({ plan: planKey }).eq('id', orgId)
        }
        break
      }

      case 'subscription.cancel':
      case 'subscription.expired': {
        const subId = data?.id || data?.subscription_id
        if (!subId) break
        await admin.from('subscriptions').update({
          status: 'canceled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        }).eq('recurrente_subscription_id', String(subId))
        break
      }

      case 'subscription.past_due':
      case 'subscription.paused':
      case 'payment_intent.failed': {
        const subId = data?.subscription_id || data?.id
        if (!subId) break

        await admin.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('recurrente_subscription_id', String(subId))

        // Dunning email (con dedup 24h)
        const { data: sub } = await admin
          .from('subscriptions')
          .select('org_id, last_dunning_at, organizations(name, owner_user_id, vertical)')
          .eq('recurrente_subscription_id', String(subId))
          .maybeSingle()

        const recentlySent = sub?.last_dunning_at &&
          (Date.now() - new Date(sub.last_dunning_at).getTime()) < 24 * 3600 * 1000
        if (recentlySent) break

        const ownerId = sub?.organizations?.owner_user_id
        const orgName = sub?.organizations?.name
        const orgVertical = sub?.organizations?.vertical
        if (ownerId) {
          const { data: userRes } = await admin.auth.admin.getUserById(ownerId)
          const email = userRes?.user?.email
          if (email) {
            await sendPaymentFailedEmail({ to: email, orgName: orgName || 'tu organización', vertical: orgVertical })
            await admin.from('subscriptions').update({ last_dunning_at: new Date().toISOString() })
              .eq('recurrente_subscription_id', String(subId))
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        // Renovación OK: asegurar status=active + current_period_end
        const subId = data?.subscription_id
        if (!subId) break
        const renewsAt = data?.next_billing_at || null
        await admin.from('subscriptions').update({
          status: 'active',
          current_period_end: renewsAt ? new Date(renewsAt).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('recurrente_subscription_id', String(subId))
        break
      }

      default:
        logger.info('rec_webhook', 'event_ignored', { event_type: eventType })
        break
    }
  } catch (err) {
    logger.error('rec_webhook', err, { event_type: eventType })
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
