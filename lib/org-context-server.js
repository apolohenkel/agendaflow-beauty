import { createClient } from './supabase/server'

export async function getOrgContext() {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return { user: null, orgId: null, businessId: null, slug: null, role: null, plan: null }

  const { data: members } = await supa
    .from('organization_members')
    .select('org_id, role, organizations(id, slug, plan)')
    .eq('user_id', user.id)
    .limit(1)

  const member = members?.[0]
  if (!member) return { user, orgId: null, businessId: null, slug: null, role: null, plan: null }

  const { data: bizs } = await supa
    .from('businesses')
    .select('id')
    .eq('organization_id', member.org_id)
    .limit(1)

  return {
    user,
    orgId: member.org_id,
    businessId: bizs?.[0]?.id ?? null,
    slug: member.organizations?.slug ?? null,
    role: member.role,
    plan: member.organizations?.plan ?? 'trial',
  }
}
