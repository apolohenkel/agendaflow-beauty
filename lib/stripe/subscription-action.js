import { createAdminClient } from '../supabase/admin'
import { getStripe } from '../stripe'

export async function setCancelAtPeriodEnd(userId, value) {
  const admin = createAdminClient()
  const { data: members } = await admin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
  const orgId = members?.[0]?.org_id
  if (!orgId) return { error: 'no_org', status: 400 }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!sub?.stripe_subscription_id) return { error: 'no_subscription', status: 400 }

  const stripe = getStripe()
  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: value,
  })

  await admin.from('subscriptions').update({
    cancel_at_period_end: value,
    updated_at: new Date().toISOString(),
  }).eq('org_id', orgId)

  return {
    ok: true,
    cancel_at: updated.current_period_end ? new Date(updated.current_period_end * 1000).toISOString() : null,
  }
}
