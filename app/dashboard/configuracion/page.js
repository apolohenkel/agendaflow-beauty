'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import { VERTICALS, VERTICAL_KEYS, DEFAULT_VERTICAL } from '@/lib/verticals'
import { logger } from '@/lib/logger'

const DIAS = [
  { key: 0, label: 'Domingo' },
  { key: 1, label: 'Lunes' },
  { key: 2, label: 'Martes' },
  { key: 3, label: 'Miércoles' },
  { key: 4, label: 'Jueves' },
  { key: 5, label: 'Viernes' },
  { key: 6, label: 'Sábado' },
]

const DEFAULT_HORARIO = { start: '09:00', end: '18:00' }

const TIMEZONES = [
  { value: 'America/Guatemala',              label: 'Guatemala (UTC-6)' },
  { value: 'America/Mexico_City',            label: 'México (UTC-6)' },
  { value: 'America/Bogota',                 label: 'Colombia (UTC-5)' },
  { value: 'America/Lima',                   label: 'Perú (UTC-5)' },
  { value: 'America/Santiago',               label: 'Chile (UTC-3/-4)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3)' },
]

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--dash-border)]">
        <h2 className="text-[var(--dash-text)] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        {description && <p className="text-[var(--dash-text-muted)] text-xs mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">{label}</p>
      {children}
    </div>
  )
}

function SaveButton({ saving, saved, label = 'Guardar cambios', disabled = false }) {
  return (
    <button
      type="submit"
      disabled={saving || disabled}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--dash-primary)] hover:bg-[var(--dash-primary-soft)] text-[var(--dash-ink)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {saving ? (
        <>
          <span className="w-3.5 h-3.5 border border-[var(--dash-ink)]/20 border-t-[var(--dash-ink)]/70 rounded-full animate-spin" />
          Guardando...
        </>
      ) : saved ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Guardado
        </>
      ) : label}
    </button>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const supabase = createClient()
  const { orgId, slug: orgSlug, business: orgBusiness, refresh: refreshOrg, loading: orgLoading } = useOrg()
  const [business, setBusiness]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [savingInfo, setSavingInfo]       = useState(false)
  const [savedInfo, setSavedInfo]         = useState(false)
  const [savingHorario, setSavingHorario] = useState(false)
  const [savedHorario, setSavedHorario]   = useState(false)
  const [pwForm, setPwForm]   = useState({ nueva: '', confirmar: '' })
  const [savingPw, setSavingPw]   = useState(false)
  const [savedPw, setSavedPw]     = useState(false)
  const [errorPw, setErrorPw]     = useState(null)
  const [brandForm, setBrandForm] = useState({ primary_color: '#C8A96E', logo_url: null })
  const [savingBrand, setSavingBrand] = useState(false)
  const [savedBrand, setSavedBrand] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [brandError, setBrandError] = useState(null)
  const [vertical, setVertical] = useState(DEFAULT_VERTICAL)
  const [savedVertical, setSavedVertical] = useState(false)
  const [savingVertical, setSavingVertical] = useState(false)

  // Seña
  const [depositForm, setDepositForm] = useState({ enabled: false, currency: 'usd' })
  const [savingDeposit, setSavingDeposit] = useState(false)
  const [savedDeposit, setSavedDeposit] = useState(false)

  // Link público (slug)
  const [slugDraft, setSlugDraft] = useState('')
  const [slugState, setSlugState] = useState('idle') // idle|checking|available|taken|invalid|same
  const [savingSlug, setSavingSlug] = useState(false)
  const [savedSlug, setSavedSlug] = useState(false)
  const [slugError, setSlugError] = useState(null)

  // Inicializar slugDraft cuando cargue el orgSlug
  useEffect(() => {
    if (orgSlug && !slugDraft) setSlugDraft(orgSlug)
  }, [orgSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Validación live con debounce 400ms
  useEffect(() => {
    if (!slugDraft) { setSlugState('idle'); return }
    const clean = slugDraft.toLowerCase().trim()
    if (clean === orgSlug) { setSlugState('same'); return }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(clean)) {
      setSlugState('invalid'); return
    }
    setSlugState('checking')
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('check_slug_available', { p_slug: clean })
      if (error) { setSlugState('invalid'); return }
      setSlugState(data ? 'available' : 'taken')
    }, 400)
    return () => clearTimeout(t)
  }, [slugDraft, orgSlug, supabase])

  async function handleSaveSlug(e) {
    e.preventDefault()
    setSlugError(null)
    if (slugState !== 'available') return
    setSavingSlug(true)
    const { error: err } = await supabase.rpc('rename_org_slug', { p_new_slug: slugDraft.toLowerCase().trim() })
    setSavingSlug(false)
    if (err) {
      const msg = err.message || ''
      if (msg.includes('slug_taken')) setSlugError('Ese link ya está en uso. Prueba otro.')
      else if (msg.includes('invalid_slug')) setSlugError('El link sólo puede tener letras, números y guiones.')
      else if (msg.includes('not_owner')) setSlugError('Sólo el dueño puede cambiar el link.')
      else if (msg.includes('same_slug')) setSlugError('Elige un nombre distinto al actual.')
      else setSlugError('No se pudo cambiar el link. Intenta de nuevo.')
      return
    }
    setSavedSlug(true)
    await refreshOrg()
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('af:org')
        bc.postMessage({ type: 'slug_changed', value: slugDraft.toLowerCase().trim() })
        bc.close()
      } catch {}
    }
    setTimeout(() => setSavedSlug(false), 2500)
  }

  const [infoForm, setInfoForm] = useState({
    name:             '',
    phone:            '',
    whatsapp_number:  '',
    address:          '',
    timezone:         'America/Guatemala',
    currency:         'gtq',
  })

  const [schedule, setSchedule] = useState({
    1: DEFAULT_HORARIO,
    2: DEFAULT_HORARIO,
    3: DEFAULT_HORARIO,
    4: DEFAULT_HORARIO,
    5: DEFAULT_HORARIO,
    6: DEFAULT_HORARIO,
  })

  const load = useCallback(async () => {
    if (!orgBusiness || !orgId) return
    setBusiness(orgBusiness)
    setInfoForm({
      name:            orgBusiness.name            || '',
      phone:           orgBusiness.phone           || '',
      whatsapp_number: orgBusiness.whatsapp_number || '',
      address:         orgBusiness.address         || '',
      timezone:        orgBusiness.timezone        || 'America/Guatemala',
      currency:        orgBusiness.currency        || 'gtq',
    })
    if (orgBusiness.opening_hours) {
      setSchedule(orgBusiness.opening_hours)
    }
    setDepositForm({
      enabled: Boolean(orgBusiness.deposit_enabled),
      currency: orgBusiness.deposit_currency || 'usd',
    })
    try {
      const { data: org, error: err } = await supabase
        .from('organizations')
        .select('primary_color, logo_url, vertical')
        .eq('id', orgId)
        .maybeSingle()
      if (err) throw err
      if (org) {
        setBrandForm({
          primary_color: org.primary_color || '#C8A96E',
          logo_url: org.logo_url,
        })
        if (VERTICAL_KEYS.includes(org.vertical)) setVertical(org.vertical)
      }
    } catch (err) {
      logger.error('configuracion', err)
    } finally {
      setLoading(false)
    }
  }, [orgBusiness, orgId])

  useEffect(() => {
    if (orgLoading) return
    load()
  }, [load, orgLoading])

  function setInfo(k, v) { setInfoForm((f) => ({ ...f, [k]: v })) }

  function toggleDia(key) {
    setSchedule((prev) => {
      const next = { ...prev }
      if (next[key]) { delete next[key] } else { next[key] = DEFAULT_HORARIO }
      return next
    })
  }

  function setHorario(dia, field, val) {
    setSchedule((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: val },
    }))
  }

  async function handleSaveInfo(e) {
    e.preventDefault()
    setSavingInfo(true)
    await supabase.from('businesses').update({
      name:            infoForm.name.trim(),
      phone:           infoForm.phone.trim()           || null,
      whatsapp_number: infoForm.whatsapp_number.trim() || null,
      address:         infoForm.address.trim()         || null,
      timezone:        infoForm.timezone,
      currency:        infoForm.currency,
    }).eq('id', business.id)
    await refreshOrg()
    setSavingInfo(false)
    setSavedInfo(true)
    setTimeout(() => setSavedInfo(false), 2500)
  }

  async function handleSaveHorario(e) {
    e.preventDefault()
    setSavingHorario(true)
    await supabase.from('businesses').update({ opening_hours: schedule }).eq('id', business.id)
    await refreshOrg()
    setSavingHorario(false)
    setSavedHorario(true)
    setTimeout(() => setSavedHorario(false), 2500)
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !orgId) return
    if (file.size > 2 * 1024 * 1024) { setBrandError('El archivo supera los 2 MB.'); return }
    setUploadingLogo(true)
    setBrandError(null)

    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${orgId}/logo.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setBrandError('No se pudo subir el logo. Intenta de nuevo.')
      setUploadingLogo(false)
      return
    }

    const { data: pub } = supabase.storage.from('logos').getPublicUrl(path)
    const cacheBustedUrl = `${pub.publicUrl}?v=${Date.now()}`

    await supabase.from('organizations').update({ logo_url: cacheBustedUrl }).eq('id', orgId)
    setBrandForm((f) => ({ ...f, logo_url: cacheBustedUrl }))
    await refreshOrg()
    setUploadingLogo(false)
  }

  async function handleSaveBrand(e) {
    e.preventDefault()
    setSavingBrand(true)
    setBrandError(null)
    const { error: err } = await supabase
      .from('organizations')
      .update({ primary_color: brandForm.primary_color })
      .eq('id', orgId)
    if (err) {
      setBrandError('No se pudo guardar el color.')
      setSavingBrand(false)
      return
    }
    await refreshOrg()
    // Broadcast a otras pestañas abiertas del mismo dashboard
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('af:org')
        bc.postMessage({ type: 'primary_color_changed', value: brandForm.primary_color })
        bc.close()
      } catch {}
    }
    setSavingBrand(false)
    setSavedBrand(true)
    setTimeout(() => setSavedBrand(false), 2500)
  }

  async function handleRemoveLogo() {
    if (!orgId || !brandForm.logo_url) return
    setUploadingLogo(true)
    const url = brandForm.logo_url.split('?')[0]
    const path = url.split('/logos/')[1]
    if (path) await supabase.storage.from('logos').remove([path])
    await supabase.from('organizations').update({ logo_url: null }).eq('id', orgId)
    setBrandForm((f) => ({ ...f, logo_url: null }))
    await refreshOrg()
    setUploadingLogo(false)
  }

  async function handleSaveDeposit(e) {
    e.preventDefault()
    setSavingDeposit(true)
    await supabase.from('businesses').update({
      deposit_enabled: depositForm.enabled,
      deposit_currency: depositForm.currency,
    }).eq('id', business.id)
    await refreshOrg()
    setSavingDeposit(false)
    setSavedDeposit(true)
    setTimeout(() => setSavedDeposit(false), 2500)
  }

  async function handleSaveVertical(newVertical) {
    if (!orgId || newVertical === vertical) return
    setSavingVertical(true)
    await supabase.from('organizations').update({ vertical: newVertical }).eq('id', orgId)
    setVertical(newVertical)
    await refreshOrg()
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('af:org')
        bc.postMessage({ type: 'vertical_changed', value: newVertical })
        bc.close()
      } catch {}
    }
    setSavingVertical(false)
    setSavedVertical(true)
    setTimeout(() => setSavedVertical(false), 2500)
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    setErrorPw(null)
    if (pwForm.nueva.length < 8) { setErrorPw('La contraseña debe tener al menos 8 caracteres.'); return }
    if (pwForm.nueva !== pwForm.confirmar) { setErrorPw('Las contraseñas no coinciden.'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.nueva })
    setSavingPw(false)
    if (error) { setErrorPw('Error al cambiar la contraseña. Intenta de nuevo.'); return }
    setSavedPw(true)
    setPwForm({ nueva: '', confirmar: '' })
    setTimeout(() => setSavedPw(false), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 animate-fade-up">

      {/* Header */}
      <div className="space-y-2">
        <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
          Tu negocio
        </p>
        <h1
          className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Ajustes
        </h1>
        <p className="text-[var(--dash-text-muted)] text-xs mt-1">Personaliza tu negocio y preferencias</p>
      </div>

      {/* ── Link público ── */}
      <Section
        title="Tu link público"
        description="La dirección donde tus clientes reservan. Cámbialo cuando quieras — valida que no esté en uso."
      >
        <form onSubmit={handleSaveSlug} className="space-y-3">
          <div className="flex items-stretch rounded-xl overflow-hidden border border-[#222] bg-[var(--dash-ink-raised)]">
            <span className="px-3 py-3 text-xs flex items-center whitespace-nowrap text-[var(--dash-text-muted)] bg-[var(--dash-ink-sunken)]">
              agendaflow.beauty/b/
            </span>
            <input
              type="text"
              value={slugDraft}
              onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
              pattern="[a-z0-9-]+"
              placeholder="tu-negocio"
              className="flex-1 px-3 py-3 text-sm bg-transparent text-[var(--dash-text)] placeholder-[var(--dash-border)] focus:outline-none"
            />
            <div className="flex items-center px-3 shrink-0">
              {slugState === 'checking' && (
                <span className="w-3.5 h-3.5 border border-[var(--dash-text-muted)]/30 border-t-[var(--dash-text-muted)] rounded-full animate-spin" />
              )}
              {slugState === 'available' && (
                <span className="flex items-center gap-1 text-emerald-400 text-xs">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Disponible
                </span>
              )}
              {slugState === 'taken' && (
                <span className="text-red-400 text-xs">Ocupado</span>
              )}
              {slugState === 'invalid' && (
                <span className="text-[#E89B7A] text-xs">Inválido</span>
              )}
              {slugState === 'same' && (
                <span className="text-[var(--dash-text-muted)] text-xs">Actual</span>
              )}
            </div>
          </div>

          {orgSlug && (
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={`/b/${orgSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--dash-primary)] text-xs hover:underline"
              >
                Abrir tu link actual →
              </a>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/b/${orgSlug}`
                    navigator.clipboard.writeText(url).catch(() => {})
                  }
                }}
                className="text-[var(--dash-text-muted)] text-xs hover:text-[var(--dash-text-soft)]"
              >
                Copiar URL
              </button>
            </div>
          )}

          <p className="text-[var(--dash-text-dim)] text-[11px] leading-relaxed">
            Solo letras minúsculas, números y guiones. 2 a 40 caracteres. Ejemplo: <code className="text-[var(--dash-primary)]">salon-bella</code>
          </p>

          {slugError && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{slugError}</p>
          )}

          <SaveButton saving={savingSlug} saved={savedSlug} label="Cambiar link" disabled={slugState !== 'available'} />
          {slugState !== 'available' && slugDraft && slugDraft !== orgSlug && (
            <p className="text-[var(--dash-text-dim)] text-[11px]">
              {slugState === 'checking' ? 'Verificando disponibilidad...'
                : slugState === 'taken' ? 'Elige otro link.'
                : slugState === 'invalid' ? 'Usa letras, números o guiones.'
                : ''}
            </p>
          )}
        </form>
      </Section>

      {/* ── Información del negocio ── */}
      <Section title="Información del negocio" description="Datos generales de tu salón">
        <form onSubmit={handleSaveInfo} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre del negocio *">
              <input
                type="text"
                value={infoForm.name}
                onChange={(e) => setInfo('name', e.target.value)}
                placeholder="Ej: Salón Bella"
                required
                className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="text"
                value={infoForm.phone}
                onChange={(e) => setInfo('phone', e.target.value)}
                placeholder="Ej: +502 2222-3333"
                className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Número de WhatsApp">
              <input
                type="text"
                value={infoForm.whatsapp_number}
                onChange={(e) => setInfo('whatsapp_number', e.target.value)}
                placeholder="Ej: +502 5555-1234"
                className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
              />
            </Field>
            <Field label="Zona horaria">
              <select
                value={infoForm.timezone}
                onChange={(e) => setInfo('timezone', e.target.value)}
                className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors appearance-none cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} style={{ background: 'var(--dash-ink-sunken)' }}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Dirección">
            <input
              type="text"
              value={infoForm.address}
              onChange={(e) => setInfo('address', e.target.value)}
              placeholder="Ej: 5a Av 10-05, Zona 1, Guatemala"
              className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
            />
          </Field>

          <Field label="Moneda de tus servicios">
            <select
              value={infoForm.currency}
              onChange={(e) => setInfo('currency', e.target.value)}
              className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="gtq" style={{ background: 'var(--dash-ink-sunken)' }}>Q — Quetzal guatemalteco (GTQ)</option>
              <option value="usd" style={{ background: 'var(--dash-ink-sunken)' }}>$ — Dólar (USD)</option>
              <option value="mxn" style={{ background: 'var(--dash-ink-sunken)' }}>$ — Peso mexicano (MXN)</option>
              <option value="cop" style={{ background: 'var(--dash-ink-sunken)' }}>$ — Peso colombiano (COP)</option>
              <option value="pen" style={{ background: 'var(--dash-ink-sunken)' }}>S/ — Sol peruano (PEN)</option>
              <option value="clp" style={{ background: 'var(--dash-ink-sunken)' }}>$ — Peso chileno (CLP)</option>
              <option value="ars" style={{ background: 'var(--dash-ink-sunken)' }}>$ — Peso argentino (ARS)</option>
              <option value="eur" style={{ background: 'var(--dash-ink-sunken)' }}>€ — Euro (EUR)</option>
            </select>
            <p className="text-[var(--dash-text-dim)] text-[11px] mt-1">
              Se usa en los precios de servicios, señas, citas y en tu link público de reservas.
            </p>
          </Field>

          <div className="flex justify-end pt-1">
            <SaveButton saving={savingInfo} saved={savedInfo} />
          </div>
        </form>
      </Section>

      {/* ── Tipo de negocio ── */}
      <Section title="Tipo de negocio" description="Define la paleta, copy y servicios sugeridos que verán tus clientes">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {VERTICAL_KEYS.map((key) => {
              const v = VERTICALS[key]
              const active = vertical === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSaveVertical(key)}
                  disabled={savingVertical}
                  className="flex flex-col items-center gap-2 rounded-2xl py-5 px-3 transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: active ? `${v.theme.primary}15` : 'var(--dash-ink-sunken)',
                    borderWidth: active ? 2 : 1,
                    borderStyle: 'solid',
                    borderColor: active ? v.theme.primary : 'var(--dash-border)',
                  }}
                >
                  <span className="text-3xl">{v.emoji}</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: active ? v.theme.primary : 'var(--dash-text-muted)' }}
                  >
                    {v.name}
                  </span>
                  {active && (
                    <div className="flex gap-1 mt-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.theme.primary }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.theme.accent }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.theme.success }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-[var(--dash-ink-sunken)] border border-[#1C1C1C] rounded-xl">
            <div className="flex items-center gap-2 text-xs">
              {savingVertical ? (
                <>
                  <span className="w-3 h-3 border border-[var(--dash-primary)]/30 border-t-[var(--dash-primary)] rounded-full animate-spin" />
                  <span className="text-[var(--dash-text-muted)]">Aplicando cambio…</span>
                </>
              ) : savedVertical ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3DBA6E" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[#3DBA6E]">Guardado · el booking y emails ya usan el nuevo tema</span>
                </>
              ) : (
                <span className="text-[var(--dash-text-muted)]">
                  Actualmente: <span className="text-[var(--dash-text)] font-medium">{VERTICALS[vertical].emoji} {VERTICALS[vertical].name}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Marca ── */}
      <Section title="Marca" description="Logo y color que verán tus clientes en el booking público">
        <div className="space-y-5">

          {/* Logo */}
          <div className="space-y-2">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Logo</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] flex items-center justify-center overflow-hidden shrink-0">
                {brandForm.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brandForm.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E2E2E" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[var(--dash-border)] border border-[var(--dash-border)] text-[var(--dash-text-soft)] hover:border-[#3A3A3A] transition-all w-fit">
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  {uploadingLogo ? 'Subiendo…' : (brandForm.logo_url ? 'Cambiar logo' : 'Subir logo')}
                </label>
                {brandForm.logo_url && (
                  <button type="button" onClick={handleRemoveLogo} disabled={uploadingLogo}
                    className="text-[var(--dash-text-dim)] hover:text-red-400 text-xs text-left transition-colors w-fit">
                    Eliminar logo
                  </button>
                )}
                <p className="text-[var(--dash-text-muted)] text-[10px]">PNG, JPG, WEBP o SVG · máx 2 MB</p>
              </div>
            </div>
          </div>

          {/* Color primario */}
          <form onSubmit={handleSaveBrand} className="space-y-3">
            <Field label="Color primario">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl border border-[var(--dash-border)] overflow-hidden">
                  <input
                    type="color"
                    value={brandForm.primary_color}
                    onChange={(e) => setBrandForm((f) => ({ ...f, primary_color: e.target.value }))}
                    className="absolute inset-0 w-full h-full cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={brandForm.primary_color}
                  onChange={(e) => setBrandForm((f) => ({ ...f, primary_color: e.target.value }))}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="w-32 bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm tabular-nums focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
                />
                <div
                  className="flex-1 h-10 rounded-xl border border-[var(--dash-border)] flex items-center justify-center text-xs font-semibold"
                  style={{ backgroundColor: brandForm.primary_color, color: 'var(--dash-ink)' }}
                >
                  Vista previa
                </div>
              </div>
            </Field>

            {brandError && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{brandError}</p>
            )}

            <div className="flex justify-end pt-1">
              <SaveButton saving={savingBrand} saved={savedBrand} label="Guardar color" />
            </div>
          </form>
        </div>
      </Section>

      {/* ── Seña (depósito) ── */}
      <Section title="Seña / depósito" description="Cobra un anticipo sólo en los servicios que elijas. Reduces ausencias sin pedirle seña al corte rápido.">
        <form onSubmit={handleSaveDeposit} className="space-y-4">
          <label className="flex items-start gap-3 px-4 py-3 bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-xl cursor-pointer hover:border-[var(--dash-border)] transition-colors">
            <input
              type="checkbox"
              checked={depositForm.enabled}
              onChange={(e) => setDepositForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="mt-0.5 accent-[var(--dash-primary)]"
            />
            <span>
              <p className="text-[var(--dash-text)] text-sm font-medium">Activar cobro de seña en el salón</p>
              <p className="text-[var(--dash-text-muted)] text-xs mt-0.5">El monto se define por servicio en <span className="text-[var(--dash-primary)]">Servicios → Seña</span>. Si un servicio tiene seña 0, no se cobra al reservar.</p>
            </span>
          </label>

          {depositForm.enabled && (
            <Field label="Moneda">
              <select
                value={depositForm.currency}
                onChange={(e) => setDepositForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="usd">USD · Dólar</option>
                <option value="mxn">MXN · Peso mexicano</option>
                <option value="gtq">GTQ · Quetzal</option>
                <option value="cop">COP · Peso colombiano</option>
                <option value="pen">PEN · Sol peruano</option>
                <option value="clp">CLP · Peso chileno</option>
                <option value="ars">ARS · Peso argentino</option>
                <option value="eur">EUR · Euro</option>
              </select>
            </Field>
          )}

          <div className="flex justify-end pt-1">
            <SaveButton saving={savingDeposit} saved={savedDeposit} label="Guardar" />
          </div>
        </form>
      </Section>

      {/* ── Horario de atención ── */}
      <Section title="Horario de atención" description="Días y horas en que el salón recibe citas">
        <form onSubmit={handleSaveHorario} className="space-y-3">
          {DIAS.map(({ key, label }) => {
            const active = Boolean(schedule[key])
            return (
              <div
                key={key}
                className={`rounded-xl border transition-colors ${
                  active ? 'border-[var(--dash-border)] bg-[var(--dash-ink-sunken)]' : 'border-[var(--dash-border)] bg-transparent'
                }`}
              >
                <div className="flex items-center gap-4 px-4 py-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDia(key)}
                    className={`relative w-8 h-5 rounded-full transition-colors shrink-0 ${
                      active ? 'bg-[var(--dash-primary)]' : 'bg-[var(--dash-border)]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        active ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </button>

                  {/* Día */}
                  <p className={`text-sm font-medium w-24 ${active ? 'text-[var(--dash-text-soft)]' : 'text-[var(--dash-border)]'}`}>
                    {label}
                  </p>

                  {/* Horas */}
                  {active ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={schedule[key]?.start || '09:00'}
                        onChange={(e) => setHorario(key, 'start', e.target.value)}
                        className="bg-[var(--dash-border)] border border-[var(--dash-border)] rounded-lg px-3 py-1.5 text-[var(--dash-text)] text-xs focus:outline-none focus:border-[var(--dash-primary)]/50 w-28"
                      />
                      <span className="text-[#2E2E2E] text-sm">—</span>
                      <input
                        type="time"
                        value={schedule[key]?.end || '18:00'}
                        onChange={(e) => setHorario(key, 'end', e.target.value)}
                        className="bg-[var(--dash-border)] border border-[var(--dash-border)] rounded-lg px-3 py-1.5 text-[var(--dash-text)] text-xs focus:outline-none focus:border-[var(--dash-primary)]/50 w-28"
                      />
                    </div>
                  ) : (
                    <p className="ml-auto text-[#2E2E2E] text-xs">Cerrado</p>
                  )}
                </div>
              </div>
            )
          })}

          <div className="flex justify-end pt-2">
            <SaveButton saving={savingHorario} saved={savedHorario} label="Guardar horario" />
          </div>
        </form>
      </Section>

      {/* ── Cuenta ── */}
      <Section title="Cuenta" description="Credenciales de acceso al panel">
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nueva contraseña">
              <input
                type="password"
                value={pwForm.nueva}
                onChange={(e) => setPwForm((f) => ({ ...f, nueva: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
              />
            </Field>
            <Field label="Confirmar contraseña">
              <input
                type="password"
                value={pwForm.confirmar}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmar: e.target.value }))}
                placeholder="Repite la contraseña"
                className="w-full bg-[var(--dash-ink-sunken)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
              />
            </Field>
          </div>

          {errorPw && (
            <div className="flex items-center gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-red-400 text-xs">{errorPw}</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <SaveButton saving={savingPw} saved={savedPw} label="Cambiar contraseña" />
          </div>
        </form>
      </Section>

      {/* ── Integraciones ── */}
      <Section title="Integraciones" description="Canales conectados a tu negocio">
        <div className="space-y-3">

          {/* WhatsApp */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-[var(--dash-ink-sunken)] rounded-xl border border-[#1C1C1C]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#3DBA6E]/10 border border-[#3DBA6E]/20 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3DBA6E" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[var(--dash-text-soft)] text-sm font-medium">WhatsApp Business</p>
                <p className="text-[var(--dash-text-muted)] text-xs mt-0.5">
                  {infoForm.whatsapp_number || 'Sin número configurado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3DBA6E] animate-pulse" />
              <span className="text-[#3DBA6E] text-xs font-medium">Bot activo</span>
            </div>
          </div>

          {/* Recordatorios */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-[var(--dash-ink-sunken)] rounded-xl border border-[#1C1C1C]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--dash-primary)]/10 border border-[var(--dash-primary)]/20 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div>
                <p className="text-[var(--dash-text-soft)] text-sm font-medium">Recordatorios automáticos</p>
                <p className="text-[var(--dash-text-muted)] text-xs mt-0.5">24h y 1h antes de cada cita</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--dash-primary)]" />
              <span className="text-[var(--dash-primary)] text-xs font-medium">Activo</span>
            </div>
          </div>

        </div>
      </Section>

    </div>
  )
}
