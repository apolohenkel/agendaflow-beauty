import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { createCheckout, productIdForPlan } from '../../../../lib/recurrente'
import { PUBLIC_PLANS } from '../../../../lib/plans'
import { rateLimit } from '../../../../lib/rate-limit'
import { logger } from '../../../../lib/logger'
import { getAppUrlFromRequest } from '../../../../lib/app-url'

export async function POST(request) {
  const APP_URL = getAppUrlFromRequest(request)
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await rateLimit(`rck:${user.id}`, 5, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos, espera un minuto.' }, { status: 429 })

  const { plan: planKey } = await request.json().catch(() => ({}))
  if (!PUBLIC_PLANS.includes(planKey)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }

  const productId = productIdForPlan(planKey)
  if (!productId) {
    return NextResponse.json({ error: 'Plan no configurado en Recurrente' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  try {
    const checkout = await createCheckout({
      productId,
      userId: user.id,
      orgId: member.org_id,
      plan: planKey,
      successUrl: `${APP_URL}/dashboard/billing?checkout=success`,
      cancelUrl: `${APP_URL}/dashboard/billing?checkout=cancelled`,
    })
    if (!checkout.url) {
      return NextResponse.json({ error: 'No se pudo crear checkout' }, { status: 500 })
    }
    // Persistimos el checkout_id para correlacionar con el webhook
    if (checkout.id) {
      await admin.from('subscriptions').upsert({
        org_id: member.org_id,
        recurrente_checkout_id: checkout.id,
        status: 'incomplete',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id' })
    }
    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    logger.error('rec_checkout', err, { plan: planKey, org_id: member.org_id })
    return NextResponse.json({ error: 'Error en procesador de pagos' }, { status: 500 })
  }
}
