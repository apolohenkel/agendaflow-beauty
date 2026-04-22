import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'node:crypto'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { mapLsStatus, planFromVariantId } from '../../../../lib/lemonsqueezy'
import { sendPaymentFailedEmail } from '../../../../lib/email'
import { logger } from '../../../../lib/logger'

// Webhook de Lemon Squeezy. Eventos relevantes para suscripciones:
//  - subscription_created
//  - subscription_updated
//  - subscription_cancelled
//  - subscription_payment_success
//  - subscription_payment_failed
//
// LS firma el body con HMAC-SHA256 usando el signing secret del webhook.
// Header: X-Signature (hex digest).

function verifyLsSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const sigBuf = Buffer.from(signature, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    return crypto.timingSafeEqual(sigBuf, expBuf)
  } catch {
    return false
  }
}

export async function POST(request) {
  const rawBody = await request.text()
  const sig = (await headers()).get('x-signature') || ''
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  if (!secret) {
    logger.error('ls_webhook', 'LEMONSQUEEZY_WEBHOOK_SECRET missing')
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 })
  }

  if (!verifyLsSignature(rawBody, sig, secret)) {
    logger.warn('ls_webhook', 'invalid_signature')
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const eventName = event?.meta?.event_name
  const custom = event?.meta?.custom_data || {}
  const attrs = event?.data?.attributes || {}
  const subId = event?.data?.id

  // Identificar org: 1) custom_data.org_id del checkout, 2) fallback: busca por customer_id
  let orgId = custom.org_id
  const planFromMeta = custom.plan

  const admin = createAdminClient()

  try {
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed': {
        if (!orgId) {
          // Fallback: buscar subscription por lemonsqueezy_subscription_id
          const { data: existing } = await admin
            .from('subscriptions')
            .select('org_id')
            .eq('lemonsqueezy_subscription_id', subId)
            .maybeSingle()
          orgId = existing?.org_id
        }
        if (!orgId) {
          logger.warn('ls_webhook', 'sub_without_org_id', { sub_id: subId, event: eventName })
          break
        }

        const variantId = attrs.variant_id
        const planKey = planFromMeta || planFromVariantId(variantId)
        const status = mapLsStatus(attrs.status)
        const renewsAt = attrs.renews_at ? new Date(attrs.renews_at).toISOString() : null
        const cancelAtPeriodEnd = Boolean(attrs.cancelled)
        const customerId = attrs.customer_id ? String(attrs.customer_id) : null

        await admin.from('subscriptions').upsert({
          org_id: orgId,
          lemonsqueezy_customer_id: customerId,
          lemonsqueezy_subscription_id: String(subId),
          status,
          plan: planKey,
          current_period_end: renewsAt,
          cancel_at_period_end: cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id' })

        if (planKey && status === 'active') {
          await admin.from('organizations').update({ plan: planKey }).eq('id', orgId)
        }
        break
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        if (!orgId) {
          const { data: existing } = await admin
            .from('subscriptions')
            .select('org_id')
            .eq('lemonsqueezy_subscription_id', subId)
            .maybeSingle()
          orgId = existing?.org_id
        }
        if (!orgId) break

        await admin.from('subscriptions').update({
          status: eventName === 'subscription_expired' ? 'canceled' : 'canceled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        }).eq('lemonsqueezy_subscription_id', String(subId))
        break
      }

      case 'subscription_payment_failed': {
        if (!orgId) {
          const { data: existing } = await admin
            .from('subscriptions')
            .select('org_id, last_dunning_at, organizations(name, owner_user_id, vertical)')
            .eq('lemonsqueezy_subscription_id', subId)
            .maybeSingle()
          orgId = existing?.org_id

          await admin.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('lemonsqueezy_subscription_id', String(subId))

          const recentlySent = existing?.last_dunning_at && (Date.now() - new Date(existing.last_dunning_at).getTime()) < 24 * 3600 * 1000
          if (recentlySent) break

          const ownerId = existing?.organizations?.owner_user_id
          const orgName = existing?.organizations?.name
          const orgVertical = existing?.organizations?.vertical
          if (ownerId) {
            const { data: userRes } = await admin.auth.admin.getUserById(ownerId)
            const email = userRes?.user?.email
            if (email) {
              await sendPaymentFailedEmail({ to: email, orgName: orgName || 'tu organización', vertical: orgVertical })
              await admin.from('subscriptions').update({ last_dunning_at: new Date().toISOString() }).eq('lemonsqueezy_subscription_id', String(subId))
            }
          }
        }
        break
      }

      case 'subscription_payment_success': {
        // Renovación exitosa — aseguramos status active + current_period_end actualizado
        if (subId) {
          const renewsAt = attrs.renews_at ? new Date(attrs.renews_at).toISOString() : null
          await admin.from('subscriptions').update({
            status: 'active',
            current_period_end: renewsAt,
            updated_at: new Date().toISOString(),
          }).eq('lemonsqueezy_subscription_id', String(subId))
        }
        break
      }

      default:
        // otros eventos (order_created, etc) — ignorados
        break
    }
  } catch (err) {
    logger.error('ls_webhook', err, { event_name: eventName })
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
