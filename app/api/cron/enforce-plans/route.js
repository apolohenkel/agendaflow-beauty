import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  const auth = (await headers()).get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: trialExpired, error: trialErr } = await admin
    .from('organizations')
    .select('id, subscriptions(status)')
    .eq('plan', 'trial')
    .lt('trial_ends_at', now)

  const idsToDowngrade = (trialExpired || [])
    .filter((org) => !['active', 'trialing'].includes(org.subscriptions?.[0]?.status))
    .map((org) => org.id)

  if (idsToDowngrade.length > 0) {
    await admin.from('organizations').update({ plan: 'free' }).in('id', idsToDowngrade)
  }

  return NextResponse.json({
    ok: !trialErr,
    trialExpiredChecked: (trialExpired || []).length,
    downgraded: idsToDowngrade.length,
  })
}
