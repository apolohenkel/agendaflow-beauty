import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { setCancelAtPeriodEnd } from '../../../../lib/stripe/subscription-action'
import { rateLimit } from '../../../../lib/rate-limit'

export async function POST() {
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await rateLimit(`cx:${user.id}`, 3, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 })

  const result = await setCancelAtPeriodEnd(user.id, true)
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}
