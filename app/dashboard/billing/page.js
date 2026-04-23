'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import { PLANS, PUBLIC_PLANS, formatPlanPrice } from '@/lib/plans'
import { logger } from '@/lib/logger'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function StatusBadge({ status, trialActive }) {
  let label = 'Inactivo', color = 'bg-zinc-500/10 text-zinc-400'
  if (status === 'active') { label = 'Activo'; color = 'bg-emerald-500/10 text-emerald-400' }
  else if (status === 'trialing' || trialActive) { label = 'Prueba gratis'; color = 'bg-[var(--dash-primary)]/10 text-[var(--dash-primary)]' }
  else if (status === 'past_due') { label = 'Pago fallido'; color = 'bg-red-500/10 text-red-400' }
  else if (status === 'canceled') { label = 'Cancelado'; color = 'bg-zinc-500/10 text-zinc-400' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${color}`}>{label}</span>
}

export default function BillingPage() {
  const supabase = createClient()
  const router = useRouter()
  const search = useSearchParams()
  const { orgId, plan: orgPlan, trialEndsAt, loading: orgLoading } = useOrg()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [currency, setCurrency] = useState('usd')

  // Detectar moneda del usuario vía /api/locale (geo-IP)
  useEffect(() => {
    fetch('/api/locale', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d?.currency) setCurrency(d.currency) })
      .catch(() => {})
  }, [])

  const checkoutResult = search.get('checkout')

  useEffect(() => {
    if (checkoutResult === 'success') setNotice({ type: 'success', text: '¡Suscripción activada! Puede tomar unos segundos en reflejarse.' })
    else if (checkoutResult === 'cancelled') setNotice({ type: 'info', text: 'Checkout cancelado. Puedes intentar de nuevo cuando quieras.' })
  }, [checkoutResult])

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const { data, error: err } = await supabase
        .from('subscriptions')
        .select('status, plan, current_period_end, cancel_at_period_end')
        .eq('org_id', orgId)
        .maybeSingle()
      if (err) throw err
      setSub(data)
    } catch (err) {
      logger.error('billing', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { load() }, [load])

  // Tras ?checkout=success el webhook de Stripe tarda ~1-3s en actualizar la suscripción.
  // Poll 2s x 5 ticks para que la UI refleje el plan activo sin refresh manual.
  useEffect(() => {
    if (checkoutResult !== 'success') return
    let ticks = 0
    const id = setInterval(() => {
      load()
      if (++ticks >= 5) clearInterval(id)
    }, 2000)
    return () => clearInterval(id)
  }, [checkoutResult, load])

  async function handleCheckout(planKey) {
    setBusy(planKey)
    setNotice(null)
    let currency
    try {
      const locale = await fetch('/api/locale').then((r) => r.json()).catch(() => null)
      currency = locale?.currency
    } catch {}
    const res = await fetch('/api/recurrente/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planKey, currency }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      let msg = data.error || 'No se pudo iniciar checkout.'
      // Mensajes específicos para escenarios comunes
      if (msg === 'Plan no configurado en Recurrente') {
        msg = 'El procesador de pagos aún no está configurado. Estamos trabajando en ello — intenta más tarde o escríbenos por WhatsApp.'
      } else if (msg === 'Error en procesador de pagos') {
        msg = 'El procesador de pagos rechazó la solicitud. Espera unos minutos e intenta de nuevo. Si persiste, contáctanos.'
      } else if (msg === 'Sin organización') {
        msg = 'Tu cuenta aún no está vinculada a un negocio. Completa el registro primero.'
      }
      setNotice({ type: 'error', text: msg })
      setBusy(null)
      return
    }
    if (!data.url) {
      setNotice({ type: 'error', text: 'Respuesta inválida del procesador. Intenta de nuevo.' })
      setBusy(null)
      return
    }
    window.location.href = data.url
  }

  async function handlePortal() {
    setBusy('portal')
    const res = await fetch('/api/recurrente/cancel', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setNotice({ type: 'error', text: data.error || 'No se pudo abrir el portal.' })
      setBusy(null)
      return
    }
    window.location.href = data.url
  }

  async function handleCancel() {
    if (!confirm('¿Cancelar tu suscripción al final del período actual?')) return
    setBusy('cancel')
    const res = await fetch('/api/recurrente/cancel', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setNotice({ type: 'error', text: data.error || 'No se pudo cancelar.' })
    } else {
      setNotice({ type: 'info', text: 'Tu suscripción se cancelará al final del período actual.' })
      await load()
    }
    setBusy(null)
  }

  async function handleResume() {
    setBusy('resume')
    const res = await fetch('/api/recurrente/cancel', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setNotice({ type: 'error', text: data.error || 'No se pudo reanudar.' })
    } else {
      setNotice({ type: 'success', text: 'Suscripción reanudada.' })
      await load()
    }
    setBusy(null)
  }

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  const trialActive = trialEndsAt && new Date(trialEndsAt) > new Date()
  const status = sub?.status ?? (trialActive ? 'trialing' : 'expired')
  const currentPlanKey = sub?.plan ?? (trialActive ? 'trial' : null)
  const currentPlan = currentPlanKey ? PLANS[currentPlanKey] : null
  const periodEnd = sub?.current_period_end ?? trialEndsAt

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 animate-fade-up">

      <div className="space-y-2">
        <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
          Tu suscripción
        </p>
        <h1
          className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Facturación
        </h1>
      </div>

      {notice && (
        <div className={`px-4 py-3 rounded-xl border text-sm ${
          notice.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          notice.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          'bg-[var(--dash-border)] border-[var(--dash-border)] text-[var(--dash-text-muted)]'
        }`}>
          {notice.text}
        </div>
      )}

      {/* Plan actual */}
      <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest font-medium">Plan actual</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-[var(--dash-text)] text-2xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                {currentPlan?.name || 'Sin plan'}
              </h2>
              <StatusBadge status={status} trialActive={trialActive} />
            </div>
            {periodEnd && (
              <p className="text-[var(--dash-text-soft)] text-xs mt-2">
                {sub?.cancel_at_period_end ? 'Termina el ' : (status === 'trialing' || trialActive ? 'Prueba termina el ' : 'Próxima factura el ')}
                <span className="text-[var(--dash-text-muted)]">{fmtDate(periodEnd)}</span>
              </p>
            )}
          </div>
          {currentPlan && currentPlan.price > 0 && currentPlanKey && (
            <p className="text-[var(--dash-primary-soft)] text-2xl tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}>
              {formatPlanPrice(currentPlanKey, currency)}<span className="text-[var(--dash-text-muted)] text-sm">/mes</span>
            </p>
          )}
        </div>

        {sub && status !== 'expired' ? (
          <div className="flex gap-3 pt-2 border-t border-[var(--dash-border)] flex-wrap">
            <button
              onClick={handlePortal}
              disabled={busy === 'portal'}
              className="px-4 py-2 rounded-xl text-sm bg-[var(--dash-border)] border border-[var(--dash-border)] text-[var(--dash-text-soft)] hover:border-[#3A3A3A] disabled:opacity-50 transition-all"
            >
              {busy === 'portal' ? 'Abriendo…' : 'Gestionar suscripción'}
            </button>
            {sub.cancel_at_period_end ? (
              <button
                onClick={handleResume}
                disabled={busy === 'resume'}
                className="px-4 py-2 rounded-xl text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
              >
                {busy === 'resume' ? 'Reanudando…' : 'Reanudar suscripción'}
              </button>
            ) : (status === 'active' || status === 'trialing') && (
              <button
                onClick={handleCancel}
                disabled={busy === 'cancel'}
                className="px-4 py-2 rounded-xl text-sm bg-transparent border border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-red-500/40 hover:text-red-300 disabled:opacity-50 transition-all"
              >
                {busy === 'cancel' ? 'Cancelando…' : 'Cancelar suscripción'}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Planes disponibles */}
      <div className="space-y-3">
        <h2 className="text-[var(--dash-text)] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
          {currentPlan && status === 'active' ? 'Cambiar de plan' : 'Elige tu plan'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PUBLIC_PLANS.map((key) => {
            const p = PLANS[key]
            const isCurrent = currentPlanKey === key && status === 'active'
            const highlighted = key === 'pro'
            return (
              <div
                key={key}
                className={`relative bg-[var(--dash-ink-raised)] border rounded-2xl p-6 flex flex-col gap-4 ${
                  highlighted ? 'border-[var(--dash-primary)]/40' : 'border-[var(--dash-border)]'
                }`}
              >
                {highlighted && (
                  <span className="absolute -top-2 left-6 bg-[var(--dash-primary)] text-[var(--dash-ink)] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Más popular
                  </span>
                )}
                <div>
                  <p className="text-[var(--dash-text)] text-lg font-medium">{p.name}</p>
                  <p className="text-[var(--dash-primary-soft)] text-3xl mt-2 tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}>
                    {formatPlanPrice(key, currency)}<span className="text-[var(--dash-text-muted)] text-sm">/mes</span>
                  </p>
                </div>

                <ul className="space-y-2 flex-1">
                  {p.features?.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[var(--dash-text-soft)] text-xs">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(key)}
                  disabled={busy === key || isCurrent}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                    isCurrent
                      ? 'bg-[var(--dash-border)] text-[var(--dash-text-dim)] cursor-default'
                      : 'bg-[var(--dash-primary)] text-[var(--dash-ink)] hover:bg-[var(--dash-primary-soft)]'
                  }`}
                >
                  {isCurrent ? 'Plan actual' : busy === key ? 'Cargando…' : 'Suscribirme'}
                </button>
              </div>
            )
          })}
        </div>

        {(!PLANS.starter.priceId || !PLANS.pro.priceId || !PLANS.business.priceId) && (
          <p className="text-amber-400/70 text-xs bg-amber-500/5 border border-amber-500/20 px-4 py-2.5 rounded-xl">
            ⚠️ Algunos planes aún no tienen precio configurado en Stripe. Define las variables `STRIPE_PRICE_*` en tu entorno.
          </p>
        )}
      </div>
    </div>
  )
}
