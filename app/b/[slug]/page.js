'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function fmtDuration(min) {
  if (!min) return ''
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

function fmtDate(d) {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function generateSlots(openingHours, date, duration) {
  const day = date.getDay()
  const horario = openingHours?.[day]
  if (!horario) return []
  const [startH, startM] = horario.start.split(':').map(Number)
  const [endH, endM] = horario.end.split(':').map(Number)
  const slots = []
  let cur = startH * 60 + startM
  const end = endH * 60 + endM
  while (cur + duration <= end) {
    const h = Math.floor(cur / 60).toString().padStart(2, '0')
    const m = (cur % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += 30
  }
  return slots
}

function StepDot({ n, current, label }) {
  const done = n < current
  const active = n === current
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
        done ? 'bg-[#C8A96E] text-[#080808]' :
        active ? 'bg-[#C8A96E]/20 border-2 border-[#C8A96E] text-[#C8A96E]' :
        'bg-[#111] border border-[#222] text-[#444]'
      }`}>
        {done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : n + 1}
      </div>
      <p className={`text-[10px] uppercase tracking-wider hidden sm:block ${active ? 'text-[#C8A96E]' : done ? 'text-[#555]' : 'text-[#333]'}`}>
        {label}
      </p>
    </div>
  )
}

function Row({ label, value, gold = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[#444] text-xs">{label}</p>
      <p className={`text-sm font-medium text-right ${gold ? 'text-[#C8A96E]' : 'text-[#C8C3BC]'}`}>{value}</p>
    </div>
  )
}

export default function BookPage({ params }) {
  const { slug } = use(params)
  const supabase = createClient()

  const [org, setOrg] = useState(null)
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState({ service: null, staffId: '', date: null, time: '' })
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: orgs } = await supabase.rpc('get_public_org', { p_slug: slug })
      const orgRow = orgs?.[0]
      if (!orgRow) { setNotFound(true); setLoading(false); return }
      setOrg(orgRow)

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, address, whatsapp_number, opening_hours')
        .eq('organization_id', orgRow.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (!biz) { setNotFound(true); setLoading(false); return }
      setBusiness(biz)

      const [{ data: svcs }, { data: stf }] = await Promise.all([
        supabase.from('services').select('id, name, duration_minutes, price, category')
          .eq('business_id', biz.id).eq('active', true).order('name'),
        supabase.from('staff').select('id, name, role')
          .eq('business_id', biz.id).eq('active', true).order('name'),
      ])
      setServices(svcs || [])
      setStaff(stf || [])
      setLoading(false)
    }
    load()
  }, [slug])

  const availableDays = (() => {
    if (!business?.opening_hours) return []
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 1; i <= 21; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      if (business.opening_hours[d.getDay()]) days.push(d)
      if (days.length >= 14) break
    }
    return days
  })()

  const slots = selected.date && selected.service
    ? generateSlots(business?.opening_hours, selected.date, selected.service.duration_minutes)
    : []

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim()) { setError('Completa tu nombre y teléfono.'); return }
    setSubmitting(true)
    setError(null)

    try {
      const [h, m] = selected.time.split(':').map(Number)
      const startsAt = new Date(selected.date)
      startsAt.setHours(h, m, 0, 0)

      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          service_id: selected.service.id,
          staff_id: selected.staffId || null,
          starts_at: startsAt.toISOString(),
          client_name: form.name.trim(),
          client_phone: form.phone.trim(),
          client_email: form.email.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.error === 'slot_unavailable') {
          setError('Ese horario acaba de ocuparse. Elige otro, por favor.')
        } else if (data.error === 'not_accepting' || data.error === 'business_not_active') {
          setError('Este negocio no está aceptando reservas en este momento.')
        } else if (data.error === 'rate_limited') {
          setError('Demasiados intentos. Espera un minuto y vuelve a intentar.')
        } else {
          setError('Ocurrió un error. Por favor intenta de nuevo.')
        }
        return
      }

      setDone(true)
    } catch {
      setError('Ocurrió un error. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-4">
          <h1 className="text-[#F0EBE3] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Negocio no encontrado
          </h1>
          <p className="text-[#555] text-sm">El enlace que abriste no corresponde a ningún negocio activo.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#C8A96E]/15 border border-[#C8A96E]/30 flex items-center justify-center mx-auto">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-[#F0EBE3] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
              ¡Cita agendada!
            </h2>
            <p className="text-[#555] text-sm">
              Tu cita en <span className="text-[#C8C3BC]">{business?.name}</span> ha sido registrada.
            </p>
          </div>
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5 text-left space-y-3">
            <Row label="Servicio" value={selected.service?.name} />
            <Row label="Fecha" value={fmtDate(selected.date)} />
            <Row label="Hora" value={selected.time} />
            {selected.staffId && (
              <Row label="Con" value={staff.find(s => s.id === selected.staffId)?.name} />
            )}
          </div>
          <p className="text-[#383430] text-xs">Te contactaremos para confirmar tu cita.</p>
        </div>
      </div>
    )
  }

  const brand = org?.primary_color || '#C8A96E'

  return (
    <div className="min-h-screen bg-[#080808]" style={{ '--brand': brand }}>

      <style>{`:root { --brand: ${brand}; }`}</style>

      <div className="border-b border-[#111] px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={business?.name} className="w-10 h-10 rounded-xl object-contain bg-white/5" />
            ) : null}
            <div>
              <h1 className="text-[#F0EBE3] text-xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                {business?.name}
              </h1>
              {business?.address && (
                <p className="text-[#444] text-xs mt-0.5">{business.address}</p>
              )}
            </div>
          </div>
          {!org?.logo_url && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: brand }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-8">

        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-[#1A1A1A] z-0" />
          {['Servicio', 'Fecha y hora', 'Tus datos', 'Confirmar'].map((label, i) => (
            <div key={i} className="z-10 bg-[#080808] px-1">
              <StepDot n={i} current={step} label={label} />
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-[#D4CFC8] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
              ¿Qué servicio deseas?
            </h2>
            <div className="space-y-2">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setSelected((s) => ({ ...s, service: svc }))}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all ${
                    selected.service?.id === svc.id
                      ? 'border-[#C8A96E]/50 bg-[#C8A96E]/8'
                      : 'border-[#1A1A1A] bg-[#0D0D0D] hover:border-[#2A2A2A]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[#E8E3DC] text-sm font-medium">{svc.name}</p>
                    <p className="text-[#444] text-xs mt-0.5">{fmtDuration(svc.duration_minutes)}{svc.category ? ` · ${svc.category}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {svc.price != null && (
                      <p className="text-sm font-medium" style={{ color: brand }}>${Number(svc.price).toFixed(0)}</p>
                    )}
                    {selected.service?.id === svc.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: brand }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {services.length === 0 && (
                <p className="text-[#555] text-sm text-center py-8">
                  Este negocio aún no ha publicado servicios.
                </p>
              )}
            </div>

            {staff.length > 0 && (
              <div className="space-y-2">
                <p className="text-[#555] text-[10px] uppercase tracking-widest">Colaborador (opcional)</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelected((s) => ({ ...s, staffId: '' }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      !selected.staffId ? 'bg-[#C8A96E]/15 text-[#C8A96E] border-[#C8A96E]/30' : 'text-[#555] border-[#1E1E1E] hover:border-[#333]'
                    }`}
                  >
                    Sin preferencia
                  </button>
                  {staff.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelected((s) => ({ ...s, staffId: m.id }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selected.staffId === m.id ? 'bg-[#C8A96E]/15 text-[#C8A96E] border-[#C8A96E]/30' : 'text-[#555] border-[#1E1E1E] hover:border-[#333]'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(1)}
              disabled={!selected.service}
              style={{ backgroundColor: brand }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[#080808] transition-all disabled:opacity-30 hover:brightness-110"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-[#D4CFC8] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
              ¿Cuándo te viene bien?
            </h2>

            <div className="space-y-2">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Fecha</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableDays.map((d, i) => {
                  const isSelected = selected.date?.toDateString() === d.toDateString()
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected((s) => ({ ...s, date: d, time: '' }))}
                      className={`py-3 px-2 rounded-xl border text-center transition-all ${
                        isSelected ? 'border-[#C8A96E]/50 bg-[#C8A96E]/10' : 'border-[#1A1A1A] bg-[#0D0D0D] hover:border-[#2A2A2A]'
                      }`}
                    >
                      <p className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-[#C8A96E]' : 'text-[#444]'}`}>
                        {d.toLocaleDateString('es-MX', { weekday: 'short' })}
                      </p>
                      <p className={`text-base font-medium mt-0.5 ${isSelected ? 'text-[#C8A96E]' : 'text-[#C8C3BC]'}`}>
                        {d.getDate()}
                      </p>
                      <p className={`text-[9px] ${isSelected ? 'text-[#C8A96E]/70' : 'text-[#333]'}`}>
                        {d.toLocaleDateString('es-MX', { month: 'short' })}
                      </p>
                    </button>
                  )
                })}
                {availableDays.length === 0 && (
                  <p className="col-span-full text-[#555] text-sm text-center py-4">
                    El negocio aún no ha configurado horarios.
                  </p>
                )}
              </div>
            </div>

            {selected.date && (
              <div className="space-y-2">
                <p className="text-[#555] text-[10px] uppercase tracking-widest">Hora disponible</p>
                {slots.length === 0 ? (
                  <p className="text-[#383430] text-sm py-4 text-center">No hay horarios disponibles este día</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelected((s) => ({ ...s, time: slot }))}
                        className={`py-2.5 rounded-xl border text-xs font-medium tabular-nums transition-all ${
                          selected.time === slot
                            ? 'border-[#C8A96E]/50 bg-[#C8A96E]/10 text-[#C8A96E]'
                            : 'border-[#1A1A1A] bg-[#0D0D0D] text-[#888] hover:border-[#2A2A2A]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl text-sm text-[#555] border border-[#1E1E1E] hover:border-[#333] transition-all">
                Atrás
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selected.date || !selected.time}
                style={{ backgroundColor: brand }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#080808] transition-all disabled:opacity-30 hover:brightness-110"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-[#D4CFC8] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
              ¿Cómo te llamamos?
            </h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-[#555] text-[10px] uppercase tracking-widest">Nombre completo *</p>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: María García"
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[#555] text-[10px] uppercase tracking-widest">WhatsApp / Teléfono *</p>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Ej: +52 55 1234 5678"
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[#555] text-[10px] uppercase tracking-widest">Correo (opcional)</p>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@correo.com"
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl text-sm text-[#555] border border-[#1E1E1E] hover:border-[#333] transition-all">
                Atrás
              </button>
              <button
                onClick={() => { if (form.name.trim() && form.phone.trim()) setStep(3) }}
                disabled={!form.name.trim() || !form.phone.trim()}
                style={{ backgroundColor: brand }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#080808] transition-all disabled:opacity-30 hover:brightness-110"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-[#D4CFC8] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
              Confirma tu cita
            </h2>
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5 space-y-3.5">
              <Row label="Servicio" value={selected.service?.name} />
              <Row label="Duración" value={fmtDuration(selected.service?.duration_minutes)} />
              {selected.service?.price != null && (
                <Row label="Precio" value={`$${Number(selected.service.price).toFixed(0)}`} gold />
              )}
              <div className="border-t border-[#161616]" />
              <Row label="Fecha" value={fmtDate(selected.date)} />
              <Row label="Hora" value={selected.time} />
              {selected.staffId && (
                <Row label="Con" value={staff.find(s => s.id === selected.staffId)?.name} />
              )}
              <div className="border-t border-[#161616]" />
              <Row label="Nombre" value={form.name} />
              <Row label="Teléfono" value={form.phone} />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-3 rounded-xl text-sm text-[#555] border border-[#1E1E1E] hover:border-[#333] transition-all">
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ backgroundColor: brand }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#080808] transition-all disabled:opacity-60 hover:brightness-110 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border border-[#080808]/20 border-t-[#080808]/70 rounded-full animate-spin" />
                    Agendando...
                  </>
                ) : 'Agendar cita'}
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="text-center py-8 border-t border-[#0F0F0F]">
        <p className="text-[#2A2A2A] text-[10px] tracking-widest uppercase">
          Powered by AgendaFlow Beauty
        </p>
      </div>
    </div>
  )
}
