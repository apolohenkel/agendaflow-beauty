import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { createCheckout, variantIdForPlan } from '../../../../lib/lemonsqueezy'
import { PUBLIC_PLANS } from '../../../../lib/plans'
import { rateLimit } from '../../../../lib/rate-limit'
import { logger } from '../../../../lib/logger'
import { getAppUrlFromRequest } from '../../../../lib/app-url'

export async function POST(request) {
  const APP_URL = getAppUrlFromRequest(request)
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await rateLimit(`lsk:${user.id}`, 5, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos, espera un minuto.' }, { status: 429 })

  const { plan: planKey } = await request.json().catch(() => ({}))
  if (!PUBLIC_PLANS.includes(planKey)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }

  const variantId = variantIdForPlan(planKey)
  if (!variantId) {
    return NextResponse.json({ error: 'Plan no configurado en Lemon Squeezy' }, { status: 500 })
  }

  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  if (!storeId) {
    return NextResponse.json({ error: 'Store no configurada' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('organization_members')
    .select('org_id, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
  const orgId = members?.[0]?.org_id
  const orgName = members?.[0]?.organizations?.name
  if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  try {
    const checkout = await createCheckout({
      variantId,
      storeId,
      email: user.email,
      name: orgName || undefined,
      orgId,
      plan: planKey,
      successUrl: `${APP_URL}/dashboard/billing?checkout=success`,
    })
    if (!checkout.url) {
      return NextResponse.json({ error: 'No se pudo crear checkout' }, { status: 500 })
    }
    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    logger.error('ls_checkout', err, { plan: planKey, org_id: orgId })
    return NextResponse.json({ error: 'Error en procesador de pagos' }, { status: 500 })
  }
}
