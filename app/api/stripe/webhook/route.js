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

      case 'checkout.session.completed': {
        const session = event.data.object
        const meta = session.metadata || {}
        if (meta.type !== 'booking_deposit') break
        if (session.payment_status !== 'paid') break

        const serviceIds = (meta.service_ids || '').split(',').filter(Boolean)
        const startsAt = new Date(meta.starts_at)
        if (!meta.business_id || !meta.client_id || serviceIds.length === 0 || isNaN(startsAt.getTime())) {
          logger.error('stripe_webhook', 'booking_deposit_invalid_metadata', { session_id: session.id })
          break
        }

        // Cargar servicios para saber duraciones
        const { data: svcs } = await admin
          .from('services')
          .select('id, duration_minutes')
          .in('id', serviceIds)
        const svcById = new Map((svcs || []).map((s) => [s.id, s]))
        const orderedSvcs = serviceIds.map((id) => svcById.get(id)).filter(Boolean)
        if (orderedSvcs.length !== serviceIds.length) {
          logger.error('stripe_webhook', 'booking_deposit_service_missing', { session_id: session.id })
          break
        }

        // Crear cada cita secuencialmente vía RPC
        let offset = 0
        const createdAppts = []
        for (const svc of orderedSvcs) {
          const sStart = new Date(startsAt.getTime() + offset * 60000)
          const sEnd = new Date(sStart.getTime() + svc.duration_minutes * 60000)
          const { data: apptId, error: bErr } = await admin.rpc('book_appointment', {
            p_business_id: meta.business_id,
            p_client_id: meta.client_id,
            p_service_id: svc.id,
            p_staff_id: meta.staff_id || null,
            p_starts_at: sStart.toISOString(),
            p_ends_at: sEnd.toISOString(),
            p_status: 'confirmed',
            p_source: 'web',
            p_notes: meta.notes || null,
          })
          if (bErr) {
            logger.error('stripe_webhook', bErr, { scope: 'book_appointment_deposit', session_id: session.id })
            // Rollback cancelando los ya creados
            if (createdAppts.length > 0) {
              await admin.from('appointments').update({ status: 'cancelled' }).in('id', createdAppts.map((c) => c.id))
            }
            break
          }
          createdAppts.push({ id: apptId })
          offset += svc.duration_minutes
        }

        // Marcar la seña en el primer appointment
        if (createdAppts.length > 0) {
          await admin
            .from('appointments')
            .update({
              deposit_payment_intent: session.payment_intent,
              deposit_paid_at: new Date().toISOString(),
              deposit_amount: session.amount_total,
            })
            .eq('id', createdAppts[0].id)
          logger.info('stripe_webhook', 'booking_deposit_confirmed', { session_id: session.id, appointments: createdAppts.length })
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
