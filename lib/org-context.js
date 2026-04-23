'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { effectivePlan, canUseFeature } from './plan-access'

const initial = {
  loading: true,
  user: null,
  orgId: null,
  business: null,
  businessId: null,
  slug: null,
  role: null,
  plan: null,
  trialEndsAt: null,
  subscription: null,
  whatsappConnected: false,
  effective: null,
  canUseWhatsApp: false,
  vertical: null,
  primaryColorOverride: null,
  organizationName: null,
  logoUrl: null,
  refresh: () => {},
}

const OrgContext = createContext(initial)

export function OrgProvider({ children }) {
  const [state, setState] = useState(initial)
  const supa = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supa.auth.getUser()
    if (!user) {
      setState((s) => ({ ...s, loading: false, user: null, orgId: null, business: null, businessId: null }))
      return
    }

    const { data: members } = await supa
      .from('organization_members')
      .select('org_id, role, organizations(id, slug, plan, trial_ends_at, primary_color, logo_url, name, vertical)')
      .eq('user_id', user.id)
      .limit(1)

    const member = members?.[0]
    if (!member) {
      setState((s) => ({ ...s, loading: false, user, orgId: null, business: null, businessId: null }))
      return
    }

    const [{ data: bizs }, { data: subscription }, { data: whatsappAccount }] = await Promise.all([
      supa.from('businesses').select('*').eq('organization_id', member.org_id).limit(1),
      supa.from('subscriptions').select('status, plan, current_period_end, cancel_at_period_end').eq('org_id', member.org_id).maybeSingle(),
      supa.from('whatsapp_accounts').select('enabled').eq('org_id', member.org_id).maybeSingle(),
    ])

    const business = bizs?.[0] ?? null

    const plan = member.organizations?.plan ?? 'trial'
    const trialEndsAt = member.organizations?.trial_ends_at ?? null
    const effective = effectivePlan({ plan, subscription, trialEndsAt })

    setState({
      loading: false,
      user,
      orgId: member.org_id,
      business,
      businessId: business?.id ?? null,
      slug: member.organizations?.slug ?? null,
      role: member.role,
      plan,
      trialEndsAt,
      subscription,
      whatsappConnected: whatsappAccount?.enabled === true,
      effective,
      canUseWhatsApp: canUseFeature(effective, 'whatsapp'),
      vertical: member.organizations?.vertical ?? null,
      primaryColorOverride: member.organizations?.primary_color ?? null,
      organizationName: member.organizations?.name ?? null,
      logoUrl: member.organizations?.logo_url ?? null,
      refresh: load,
    })
  }, [])

  useEffect(() => {
    load()
    const { data: sub } = supa.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setState({ ...initial, loading: false, refresh: load })
      else load()
    })

    // Listener cross-tab: si otra pestaña cambia color/vertical, refrescamos.
    let bc = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('af:org')
        bc.onmessage = (e) => {
          if (e?.data?.type && ['primary_color_changed', 'vertical_changed', 'slug_changed'].includes(e.data.type)) {
            load()
          }
        }
      } catch {}
    }

    return () => {
      sub.subscription.unsubscribe()
      if (bc) bc.close()
    }
  }, [load])

  return <OrgContext.Provider value={state}>{children}</OrgContext.Provider>
}

export function useOrg() {
  return useContext(OrgContext)
}
