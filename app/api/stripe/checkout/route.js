import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { getStripe } from '../../../../lib/stripe'
import { PLANS, PUBLIC_PLANS, PLAN_PRICES, currencyForCountry, CURRENCY_LOCALES } from '../../../../lib/plans'
import { rateLimit } from '../../../../lib/rate-limit'
import { getAppUrlFromRequest } from '../../../../lib/app-url'

export async function POST(request) {
  const APP_URL = getAppUrlFromRequest(request)
  const supa = await createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await rateLimit(`ck:${user.id}`, 5, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados intentos, espera un minuto.' }, { status: 429 })

  const { plan: planKey, currency: reqCurrency } = await request.json().catch(() => ({}))
  if (!PUBLIC_PLANS.includes(planKey)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }
  const plan = PLANS[planKey]

  // Moneda: 1) body, 2) Vercel geo header, 3) fallback USD
  const h = await headers()
  const country = h.get('x-vercel-ip-country')
  const currency = (reqCurrency && CURRENCY_LOCALES[reqCurrency])
    ? reqCurrency
    : currencyForCountry(country)
  const unitAmount = PLAN_PRICES[planKey]?.[currency]
  if (!unitAmount) {
    return NextResponse.json({ error: 'Moneda no configurada' }, { status: 500 })
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

  const stripe = getStripe()

  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('org_id', orgId)
    .maybeSingle()

  let customerId = existingSub?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: orgName || undefined,
      metadata: { org_id: orgId },
    })
    customerId = customer.id
    await admin.from('subscriptions').upsert({
      org_id: orgId,
      stripe_customer_id: customerId,
      status: 'incomplete',
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{
      price_data: {
        currency,
        product_data: {
          name: `AgendaFlow ${plan.name}`,
        },
        unit_amount: unitAmount,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    success_url: `${APP_URL}/dashboard/billing?checkout=success`,
    cancel_url: `${APP_URL}/dashboard/billing?checkout=cancelled`,
    metadata: { org_id: orgId, plan: planKey, currency },
    subscription_data: { metadata: { org_id: orgId, plan: planKey, currency } },
    allow_promotion_codes: true,
    locale: 'es',
  })

  return NextResponse.json({ url: session.url })
}
