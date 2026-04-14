'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-[#161616]">
        <h2 className="text-[#D4CFC8] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        {description && <p className="text-[#383430] text-xs mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[#555] text-[10px] uppercase tracking-widest">{label}</p>
      {children}
    </div>
  )
}

function SaveButton({ saving, saved, label = 'Guardar cambios' }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] transition-all disabled:opacity-60"
    >
      {saving ? (
        <>
          <span className="w-3.5 h-3.5 border border-[#080808]/20 border-t-[#080808]/70 rounded-full animate-spin" />
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

  const [infoForm, setInfoForm] = useState({
    name:             '',
    phone:            '',
    whatsapp_number:  '',
    address:          '',
    timezone:         'America/Guatemala',
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
    setLoading(true)
    const { data: biz } = await supabase
      .from('businesses')
      .select('*')
      .limit(1)
      .single()

    if (biz) {
      setBusiness(biz)
      setInfoForm({
        name:            biz.name            || '',
        phone:           biz.phone           || '',
        whatsapp_number: biz.whatsapp_number || '',
        address:         biz.address         || '',
        timezone:        biz.timezone        || 'America/Guatemala',
      })
      if (biz.opening_hours) {
        setSchedule(biz.opening_hours)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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
    }).eq('id', business.id)
    setSavingInfo(false)
    setSavedInfo(true)
    setTimeout(() => setSavedInfo(false), 2500)
  }

  async function handleSaveHorario(e) {
    e.preventDefault()
    setSavingHorario(true)
    await supabase.from('businesses').update({ opening_hours: schedule }).eq('id', business.id)
    setSavingHorario(false)
    setSavedHorario(true)
    setTimeout(() => setSavedHorario(false), 2500)
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
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] p-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
          Configuración
        </h1>
        <p className="text-[#383430] text-xs mt-1">Personaliza tu negocio y preferencias</p>
      </div>

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
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="text"
                value={infoForm.phone}
                onChange={(e) => setInfo('phone', e.target.value)}
                placeholder="Ej: +502 2222-3333"
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
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
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </Field>
            <Field label="Zona horaria">
              <select
                value={infoForm.timezone}
                onChange={(e) => setInfo('timezone', e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors appearance-none cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} style={{ background: '#111' }}>
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
              className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
            />
          </Field>

          <div className="flex justify-end pt-1">
            <SaveButton saving={savingInfo} saved={savedInfo} />
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
                  active ? 'border-[#2A2A2A] bg-[#111]' : 'border-[#161616] bg-transparent'
                }`}
              >
                <div className="flex items-center gap-4 px-4 py-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDia(key)}
                    className={`relative w-8 h-5 rounded-full transition-colors shrink-0 ${
                      active ? 'bg-[#C8A96E]' : 'bg-[#2A2A2A]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        active ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </button>

                  {/* Día */}
                  <p className={`text-sm font-medium w-24 ${active ? 'text-[#C8C3BC]' : 'text-[#333]'}`}>
                    {label}
                  </p>

                  {/* Horas */}
                  {active ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={schedule[key]?.start || '09:00'}
                        onChange={(e) => setHorario(key, 'start', e.target.value)}
                        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-[#E8E3DC] text-xs focus:outline-none focus:border-[#C8A96E]/50 w-28"
                      />
                      <span className="text-[#2E2E2E] text-sm">—</span>
                      <input
                        type="time"
                        value={schedule[key]?.end || '18:00'}
                        onChange={(e) => setHorario(key, 'end', e.target.value)}
                        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-[#E8E3DC] text-xs focus:outline-none focus:border-[#C8A96E]/50 w-28"
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
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </Field>
            <Field label="Confirmar contraseña">
              <input
                type="password"
                value={pwForm.confirmar}
                onChange={(e) => setPwForm((f) => ({ ...f, confirmar: e.target.value }))}
                placeholder="Repite la contraseña"
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
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
          <div className="flex items-center justify-between px-4 py-3.5 bg-[#111] rounded-xl border border-[#1C1C1C]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#3DBA6E]/10 border border-[#3DBA6E]/20 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3DBA6E" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[#C8C3BC] text-sm font-medium">WhatsApp Business</p>
                <p className="text-[#444] text-xs mt-0.5">
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
          <div className="flex items-center justify-between px-4 py-3.5 bg-[#111] rounded-xl border border-[#1C1C1C]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C8A96E]/10 border border-[#C8A96E]/20 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div>
                <p className="text-[#C8C3BC] text-sm font-medium">Recordatorios automáticos</p>
                <p className="text-[#444] text-xs mt-0.5">24h y 1h antes de cada cita</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C8A96E]" />
              <span className="text-[#C8A96E] text-xs font-medium">Activo</span>
            </div>
          </div>

        </div>
      </Section>

    </div>
  )
}
