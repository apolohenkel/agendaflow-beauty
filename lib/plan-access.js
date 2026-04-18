import { PLANS } from './plans'

export function effectivePlan({ plan, subscription, trialEndsAt }) {
  const subActive = subscription && ['active', 'trialing'].includes(subscription.status)
  if (subActive && subscription.plan) {
    return { key: subscription.plan, status: subscription.status, active: true }
  }
  const trialActive = trialEndsAt && new Date(trialEndsAt) > new Date()
  if (plan === 'trial' && trialActive) {
    return { key: 'trial', status: 'trialing', active: true }
  }
  return { key: plan ?? null, status: subscription?.status ?? (trialEndsAt ? 'expired' : 'none'), active: false }
}

export function canUseFeature(effective, feature) {
  if (!effective?.active || !effective.key) return false
  const p = PLANS[effective.key]
  return Boolean(p?.limits?.[feature])
}
