import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { sendText } from '../../../../lib/whatsapp/send'
import { logger } from '../../../../lib/logger'

export async function GET() {
  const auth = (await headers()).get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = Date.now()
  const in24h = new Date(now + 24 * 3600 * 1000)
  const in2h = new Date(now + 2 * 3600 * 1000)
  const window = 30 * 60 * 1000

  const selectShape = `
    id, starts_at, business_id, reminder_24h_sent_at, reminder_2h_sent_at,
    services(name),
    clients(phone, name),
    businesses!inner(name, timezone, organization_id)
  `

  const [{ data: appts24 }, { data: appts2 }] = await Promise.all([
    admin.from('appointments').select(selectShape)
      .eq('status', 'confirmed').is('reminder_24h_sent_at', null)
      .gte('starts_at', new Date(in24h.getTime() - window).toISOString())
      .lt('starts_at', new Date(in24h.getTime() + window).toISOString()),
    admin.from('appointments').select(selectShape)
      .eq('status', 'confirmed').is('reminder_2h_sent_at', null)
      .gte('starts_at', new Date(in2h.getTime() - window).toISOString())
      .lt('starts_at', new Date(in2h.getTime() + window).toISOString()),
  ])

  const allAppts = [...(appts24 || []), ...(appts2 || [])]
  const orgIds = [...new Set(allAppts.map((a) => a.businesses?.organization_id).filter(Boolean))]
  const accountsByOrg = new Map()

  if (orgIds.length > 0) {
    const { data: accounts } = await admin
      .from('whatsapp_accounts')
      .select('org_id, phone_number_id, access_token, enabled')
      .in('org_id', orgIds)
      .eq('enabled', true)
    for (const acc of accounts || []) accountsByOrg.set(acc.org_id, acc)
  }

  let sent24 = 0, sent2 = 0, errors = 0

  for (const a of appts24 || []) {
    try {
      const ok = await sendReminder(a, '24h', accountsByOrg)
      if (ok) {
        await admin.from('appointments').update({ reminder_24h_sent_at: new Date().toISOString() }).eq('id', a.id)
        sent24++
      }
    } catch (e) { logger.error('cron_reminders', e, { kind: '24h', appointment_id: a.id }); errors++ }
  }

  for (const a of appts2 || []) {
    try {
      const ok = await sendReminder(a, '2h', accountsByOrg)
      if (ok) {
        await admin.from('appointments').update({ reminder_2h_sent_at: new Date().toISOString() }).eq('id', a.id)
        sent2++
      }
    } catch (e) { logger.error('cron_reminders', e, { kind: '2h', appointment_id: a.id }); errors++ }
  }

  return NextResponse.json({ ok: true, sent24, sent2, errors })
}

async function sendReminder(appt, kind, accountsByOrg) {
  const business = appt.businesses
  if (!business) return false
  const account = accountsByOrg.get(business.organization_id)
  if (!account) return false

  const date = new Date(appt.starts_at).toLocaleString('es-MX', {
    timeZone: business.timezone || 'America/Mexico_City',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })

  const greeting = kind === '24h' ? 'Recordatorio: tu cita es mañana' : 'Tu cita es en 2 horas'
  const body = `Hola ${appt.clients?.name?.split(' ')[0] || ''} 👋\n\n${greeting}.\n📅 ${date}\n💇 ${appt.services?.name || 'Servicio'}\n📍 ${business.name}\n\n¿Confirmas? Responde "sí" o "cancelar".`

  await sendText({
    phoneNumberId: account.phone_number_id,
    accessToken: account.access_token,
    to: appt.clients?.phone,
    body,
  })
  return true
}
