'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import { logger } from '@/lib/logger'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

export default function WhatsAppPage() {
  const supabase = createClient()
  const { orgId, canUseWhatsApp, loading: orgLoading } = useOrg()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ phone_number_id: '', access_token: '', display_phone: '', verify_token: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!orgId) return
    try {
      const { data, error: err } = await supabase
        .from('whatsapp_accounts')
        .select('phone_number_id, display_phone, access_token, verify_token, enabled')
        .eq('org_id', orgId)
        .maybeSingle()
      if (err) throw err
      if (data) {
        setAccount(data)
        setForm({
          phone_number_id: data.phone_number_id,
          access_token: data.access_token,
          display_phone: data.display_phone || '',
          verify_token: data.verify_token,
        })
      } else {
        setForm((f) => ({ ...f, verify_token: 'wa_' + Math.random().toString(36).slice(2, 14) }))
      }
    } catch (err) {
      logger.error('whatsapp', err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { load() }, [load])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.phone_number_id || !form.access_token || !form.verify_token) {
      setError('Completa todos los campos requeridos.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      org_id: orgId,
      phone_number_id: form.phone_number_id.trim(),
      access_token: form.access_token.trim(),
      display_phone: form.display_phone.trim() || null,
      verify_token: form.verify_token.trim(),
      enabled: true,
      updated_at: new Date().toISOString(),
    }
    const { error: err } = await supabase.from('whatsapp_accounts').upsert(payload, { onConflict: 'org_id' })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    setAccount(payload)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleDisconnect() {
    if (!confirm('¿Desconectar WhatsApp? Tendrás que volver a configurarlo.')) return
    await supabase.from('whatsapp_accounts').delete().eq('org_id', orgId)
    setAccount(null)
    setForm({ phone_number_id: '', access_token: '', display_phone: '', verify_token: 'wa_' + Math.random().toString(36).slice(2, 14) })
  }

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  const webhookUrl = `${APP_URL}/api/whatsapp/webhook`

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 max-w-3xl animate-fade-up">
      <div className="space-y-2">
        <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
          Tu asistente
        </p>
        <h1
          className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Asistente WhatsApp
        </h1>
        <p className="text-[var(--dash-text-muted)] text-xs mt-1">Conecta tu número de WhatsApp Business para que el bot agende por ti.</p>
      </div>

      {!canUseWhatsApp && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-amber-300 text-sm">El bot de WhatsApp está disponible en planes <strong>Pro</strong> y <strong>Business</strong>, o durante la prueba gratis.</p>
          <Link href="/dashboard/billing" className="shrink-0 bg-amber-400 hover:bg-amber-300 text-[var(--dash-ink)] text-xs font-semibold px-3 py-1.5 rounded-lg transition-all">
            Mejorar plan
          </Link>
        </div>
      )}

      {/* Status */}
      <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${account?.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <p className="text-[var(--dash-text)] text-sm font-medium">
              {account?.enabled ? `Bot activo en ${account.display_phone || account.phone_number_id}` : 'Bot no configurado'}
            </p>
          </div>
          {account && (
            <button onClick={handleDisconnect} className="text-red-400 hover:text-red-300 text-xs">
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Wizard / Setup */}
      <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-[var(--dash-text)] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Configuración
          </h2>
          <p className="text-[var(--dash-text-soft)] text-xs mt-1">Ingresa los datos de tu WhatsApp Business Cloud API (Meta).</p>
        </div>

        <details className="bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-xl p-4 group">
          <summary className="cursor-pointer text-[var(--dash-text-soft)] text-sm font-medium">¿Cómo obtengo estos datos?</summary>
          <ol className="text-[var(--dash-text-muted)] text-xs mt-3 space-y-2 list-decimal pl-5">
            <li>Crea una cuenta en <a className="text-[var(--dash-primary)] hover:underline" href="https://business.facebook.com" target="_blank">Meta Business</a>.</li>
            <li>En "WhatsApp Business Platform" agrega un número de prueba (gratis) o tu número real.</li>
            <li>Copia el <strong>Phone Number ID</strong> y el <strong>Access Token</strong> permanente.</li>
            <li>Configura el webhook en Meta con la URL y el Verify Token de abajo.</li>
          </ol>
        </details>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest block">Phone Number ID *</label>
            <input
              type="text"
              value={form.phone_number_id}
              onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))}
              placeholder="Ej: 1234567890"
              className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm focus:outline-none focus:border-[var(--dash-primary)]/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest block">Access Token (permanente) *</label>
            <input
              type="text"
              value={form.access_token}
              onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))}
              placeholder="EAAG..."
              className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm font-mono focus:outline-none focus:border-[var(--dash-primary)]/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest block">Número visible (opcional)</label>
            <input
              type="text"
              value={form.display_phone}
              onChange={(e) => setForm((f) => ({ ...f, display_phone: e.target.value }))}
              placeholder="+52 55 1234 5678"
              className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm focus:outline-none focus:border-[var(--dash-primary)]/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest block">Verify Token (úsalo en Meta) *</label>
            <input
              type="text"
              value={form.verify_token}
              onChange={(e) => setForm((f) => ({ ...f, verify_token: e.target.value }))}
              className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm font-mono focus:outline-none focus:border-[var(--dash-primary)]/50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-[var(--dash-primary)] hover:bg-[var(--dash-primary-soft)] text-[var(--dash-ink)] text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-60"
          >
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Conectar WhatsApp'}
          </button>
        </form>
      </div>

      {/* Webhook info */}
      <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl p-6 space-y-3">
        <h2 className="text-[var(--dash-text)] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
          Datos para configurar en Meta
        </h2>
        <div className="space-y-2">
          <div>
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest mb-1">Webhook URL</p>
            <code className="block bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-[var(--dash-text-soft)] text-xs font-mono break-all">{webhookUrl}</code>
          </div>
          <div>
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest mb-1">Verify Token</p>
            <code className="block bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-[var(--dash-text-soft)] text-xs font-mono break-all">{form.verify_token || '(genera uno arriba)'}</code>
          </div>
          <div>
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest mb-1">Eventos a suscribir</p>
            <code className="block bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-xl px-3 py-2 text-[var(--dash-text-soft)] text-xs font-mono">messages</code>
          </div>
        </div>
      </div>
    </div>
  )
}
