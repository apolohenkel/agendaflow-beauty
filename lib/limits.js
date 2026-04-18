import { createAdminClient } from './supabase/admin'
import { getPlan } from './plans'
import { effectivePlan, canUseFeature } from './plan-access'

export async function getEffectivePlan(orgId) {
  const admin = createAdminClient()

  const [{ data: org }, { data: subscription }] = await Promise.all([
    admin.from('organizations').select('plan, trial_ends_at').eq('id', orgId).maybeSingle(),
    admin.from('subscriptions').select('status, plan, current_period_end, cancel_at_period_end').eq('org_id', orgId).maybeSingle(),
  ])

  const effective = effectivePlan({ plan: org?.plan, subscription, trialEndsAt: org?.trial_ends_at })

  return {
    planKey: effective.key,
    plan: effective.key ? getPlan(effective.key) : null,
    status: effective.status,
    currentPeriodEnd: subscription?.current_period_end ?? org?.trial_ends_at,
    trialActive: org?.plan === 'trial' && org?.trial_ends_at && new Date(org.trial_ends_at) > new Date(),
    subActive: subscription && ['active', 'trialing'].includes(subscription.status),
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    effective,
  }
}

export async function canCreateAppointment(orgId) {
  const { plan, effective } = await getEffectivePlan(orgId)
  if (!effective.active || !plan) return { ok: false, reason: 'no_active_plan' }

  const admin = createAdminClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: bizs } = await admin.from('businesses').select('id').eq('organization_id', orgId)
  const businessIds = (bizs || []).map((b) => b.id)
  if (businessIds.length === 0) return { ok: true }

  const { count } = await admin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .in('business_id', businessIds)
    .gte('starts_at', monthStart.toISOString())

  if ((count ?? 0) >= plan.limits.appointmentsPerMonth) {
    return { ok: false, reason: 'monthly_limit_reached', limit: plan.limits.appointmentsPerMonth }
  }
  return { ok: true }
}

export async function canUseWhatsApp(orgId) {
  const { effective } = await getEffectivePlan(orgId)
  return canUseFeature(effective, 'whatsapp')
}
