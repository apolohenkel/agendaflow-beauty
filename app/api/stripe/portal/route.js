import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { getStripe } from '../../../../lib/stripe'
import { rateLimit } from '../../../../lib/rate-limit'
import { getAppUrl } from '../../../../lib/app-url'

export async function POST() {
  const APP_URL = getAppUrl()
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await rateLimit(`pt:${user.id}`, 5, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos, espera un minuto.' }, { status: 429 })

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
  const orgId = members?.[0]?.org_id
  if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 })
  }

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${APP_URL}/dashboard/billing`,
  })

  return NextResponse.json({ url: session.url })
}
