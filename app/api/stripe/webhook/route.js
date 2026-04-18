import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { getStripe } from '../../../../lib/stripe'
import { planByPriceId } from '../../../../lib/plans'
import { sendPaymentFailedEmail } from '../../../../lib/email'
import { logger } from '../../../../lib/logger'

export async function POST(request) {
  const body = await request.text()
  const sig = (await headers()).get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    logger.error('stripe_webhook', 'STRIPE_WEBHOOK_SECRET missing')
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 })
  }

  const stripe = getStripe()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    logger.warn('stripe_webhook', 'invalid_signature', { err: err.message })
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const orgId = sub.metadata?.org_id
        if (!orgId) {
          logger.warn('stripe_webhook', 'sub_without_org_id', { sub_id: sub.id })
          break
        }
        const priceId = sub.items?.data?.[0]?.price?.id
        const plan = planByPriceId(priceId)
        await admin.from('subscriptions').upsert({
          org_id: orgId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan: plan?.key ?? null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        if (plan?.key) {
          await admin.from('organizations').update({ plan: plan.key }).eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const orgId = sub.metadata?.org_id
        if (!orgId) break
        await admin.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subId = invoice.subscription
        if (!subId) break
        await admin.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subId)

        const { data: sub } = await admin
          .from('subscriptions')
          .select('org_id, last_dunning_at, organizations(name, owner_user_id, vertical)')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()

        const recentlySent = sub?.last_dunning_at && (Date.now() - new Date(sub.last_dunning_at).getTime()) < 24 * 3600 * 1000
        if (recentlySent) break

        const ownerId = sub?.organizations?.owner_user_id
        const orgName = sub?.organizations?.name
        const orgVertical = sub?.organizations?.vertical
        if (ownerId) {
          const { data: userRes } = await admin.auth.admin.getUserById(ownerId)
          const email = userRes?.user?.email
          if (email) {
            await sendPaymentFailedEmail({ to: email, orgName: orgName || 'tu organización', vertical: orgVertical })
            await admin.from('subscriptions').update({ last_dunning_at: new Date().toISOString() }).eq('stripe_subscription_id', subId)
          }
        }
        break
      }

      default:
        // ignore
        break
    }
  } catch (err) {
    logger.error('stripe_webhook', err, { event_type: event?.type })
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
