import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { cancelSubscription } from '../../../../lib/recurrente'
import { rateLimit } from '../../../../lib/rate-limit'
import { logger } from '../../../../lib/logger'

export async function POST() {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await rateLimit(`rcx:${user.id}`, 5, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos, espera un minuto.' }, { status: 429 })

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const { data: sub } = await admin
    .from('subscriptions')
    .select('recurrente_subscription_id')
    .eq('org_id', member.org_id)
    .maybeSingle()
  if (!sub?.recurrente_subscription_id) {
    return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 })
  }

  try {
    await cancelSubscription(sub.recurrente_subscription_id)
    await admin.from('subscriptions').update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq('recurrente_subscription_id', sub.recurrente_subscription_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('rec_cancel', err, { org_id: member.org_id })
    return NextResponse.json({ error: 'No se pudo cancelar' }, { status: 500 })
  }
}
