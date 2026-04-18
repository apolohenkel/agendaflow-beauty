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

function StepDot({ n, current, label, brand }) {
  const done = n < current
  const active = n === current
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
          done ? 'text-white' : active ? 'text-[#2B1810] bg-white' : 'bg-[#F4EADB] text-[#A89582]'
        }`}
        style={{
          backgroundColor: done ? brand : undefined,
          borderWidth: active ? 2 : done ? 0 : 1,
          borderStyle: 'solid',
          borderColor: active ? brand : '#EDE5DB',
        }}
      >
        {done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : n + 1}
      </div>
      <p
        className="text-[10px] uppercase tracking-wider hidden sm:block font-medium"
        style={{ color: active ? brand : done ? '#6B5A4F' : '#A89582' }}
      >
        {label}
      </p>
    </div>
  )
}

function Row({ label, value, accentColor }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[#6B5A4F] text-xs">{label}</p>
      <p className="text-sm font-medium text-right" style={accentColor ? { color: accentColor } : { color: '#2B1810' }}>
        {value}
      </p>
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
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#EDE5DB] border-t-[#B8824B] rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-6" style={{ fontFamily: 'var(--font-body)' }}>
        <div className="text-center max-w-sm space-y-4">
          <h1 className="text-[#2B1810] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Negocio no encontrado
          </h1>
          <p className="text-[#6B5A4F] text-sm">El enlace que abriste no corresponde a ningún negocio activo.</p>
        </div>
      </div>
    )
  }

  const brand = org?.primary_color || '#B8824B'

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-6" style={{ fontFamily: 'var(--font-body)' }}>
        <div className="text-center max-w-sm w-full space-y-6">
          <div
            className="w-20 h-20 rounded-full border flex items-center justify-center mx-auto"
            style={{ backgroundColor: `${brand}1A`, borderColor: `${brand}4D` }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="1.8" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-[#2B1810] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
              ¡Cita agendada!
            </h2>
            <p className="text-[#6B5A4F] text-sm">
              Tu cita en <span className="text-[#2B1810] font-medium">{business?.name}</span> quedó registrada.
            </p>
          </div>
          <div className="bg-white border border-[#EDE5DB] rounded-3xl p-6 text-left space-y-3 shadow-sm">
            <Row label="Servicio" value={selected.service?.name} />
            <Row label="Fecha" value={fmtDate(selected.date)} />
            <Row label="Hora" value={selected.time} />
            {selected.staffId && (
              <Row label="Con" value={staff.find(s => s.id === selected.staffId)?.name} />
            )}
          </div>
          <p className="text-[#A89582] text-xs">Te contactaremos por WhatsApp para confirmar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0]" style={{ fontFamily: 'var(--font-body)', '--brand': brand }}>

      <style>{`:root { --brand: ${brand}; }`}</style>

      {/* Header del negocio */}
      <div className="bg-white border-b border-[#EDE5DB] px-5 sm:px-6 py-5">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={business?.name} className="w-11 h-11 rounded-2xl object-contain bg-[#FAF6F0] border border-[#EDE5DB] shrink-0" />
            ) : (
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{ backgroundColor: brand, boxShadow: `0 4px 14px ${brand}33` }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[#2B1810] text-xl font-medium truncate" style={{ fontFamily: 'var(--font-display)' }}>
                {business?.name}
              </h1>
              {business?.address && (
                <p className="text-[#6B5A4F] text-xs mt-0.5 truncate">{business.address}</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-[#A89582] text-[10px] uppercase tracking-wider">Reserva en línea</p>
            <p className="text-[#6B5A4F] text-xs mt-0.5">2 minutos · Sin tarjeta</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 sm:px-6 py-8 sm:py-10 space-y-8">

        {/* Stepper */}
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-[#EDE5DB] z-0" />
          {['Servicio', 'Fecha y hora', 'Tus datos', 'Confirmar'].map((label, i) => (
            <div key={i} className="z-10 bg-[#FAF6F0] px-1.5">
              <StepDot n={i} current={step} label={label} brand={brand} />
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-[#2B1810] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                ¿Qué servicio deseas?
              </h2>
              <p className="text-[#6B5A4F] text-sm">Elige el servicio que te viene bien hoy</p>
            </div>
            <div className="space-y-2.5">
              {services.map((svc) => {
                const isActive = selected.service?.id === svc.id
                return (
                  <button
                    key={svc.id}
                    onClick={() => setSelected((s) => ({ ...s, service: svc }))}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left transition-all bg-white hover:shadow-md"
                    style={{
                      borderColor: isActive ? brand : '#EDE5DB',
                      backgroundColor: isActive ? `${brand}0D` : 'white',
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-[#2B1810] text-base font-medium">{svc.name}</p>
                      <p className="text-[#6B5A4F] text-xs mt-0.5">
                        {fmtDuration(svc.duration_minutes)}
                        {svc.category ? ` · ${svc.category}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {svc.price != null && (
                        <p className="text-base font-semibold tabular-nums" style={{ color: brand }}>
                          ${Number(svc.price).toFixed(0)}
                        </p>
                      )}
                      {isActive && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brand }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
              {services.length === 0 && (
                <p className="text-[#6B5A4F] text-sm text-center py-8">
                  Este negocio aún no ha publicado servicios.
                </p>
              )}
            </div>

            {staff.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">¿Con alguien en especial?</p>
                <div className="flex gap-2 flex-wrap">
                  {[{ id: '', name: 'Sin preferencia' }, ...staff].map((m) => {
                    const isActive = selected.staffId === m.id
                    return (
                      <button
                        key={m.id || 'none'}
                        onClick={() => setSelected((s) => ({ ...s, staffId: m.id }))}
                        className="px-4 py-2 rounded-full text-sm font-medium border transition-all"
                        style={{
                          backgroundColor: isActive ? `${brand}14` : 'white',
                          color: isActive ? brand : '#6B5A4F',
                          borderColor: isActive ? `${brand}66` : '#EDE5DB',
                        }}
                      >
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(1)}
              disabled={!selected.service}
              style={{ backgroundColor: selected.service ? brand : '#E8DCC9', boxShadow: selected.service ? `0 8px 20px ${brand}30` : 'none' }}
              className="w-full py-3.5 rounded-full text-sm font-semibold text-white transition-all disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.99]"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-[#2B1810] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                ¿Cuándo te viene bien?
              </h2>
              <p className="text-[#6B5A4F] text-sm">Elige el día y la hora que prefieras</p>
            </div>

            <div className="space-y-2.5">
              <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Fecha</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableDays.map((d, i) => {
                  const isSelected = selected.date?.toDateString() === d.toDateString()
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected((s) => ({ ...s, date: d, time: '' }))}
                      className="py-3 px-2 rounded-2xl border text-center transition-all bg-white hover:shadow-sm"
                      style={{
                        borderColor: isSelected ? brand : '#EDE5DB',
                        backgroundColor: isSelected ? `${brand}0D` : 'white',
                      }}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: isSelected ? brand : '#6B5A4F' }}>
                        {d.toLocaleDateString('es-MX', { weekday: 'short' })}
                      </p>
                      <p className="text-xl font-medium mt-0.5 tabular-nums" style={{ color: isSelected ? brand : '#2B1810', fontFamily: 'var(--font-display)' }}>
                        {d.getDate()}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: isSelected ? `${brand}B3` : '#A89582' }}>
                        {d.toLocaleDateString('es-MX', { month: 'short' })}
                      </p>
                    </button>
                  )
                })}
                {availableDays.length === 0 && (
                  <p className="col-span-full text-[#6B5A4F] text-sm text-center py-4">
                    El negocio aún no ha configurado horarios.
                  </p>
                )}
              </div>
            </div>

            {selected.date && (
              <div className="space-y-2.5">
                <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Hora disponible</p>
                {slots.length === 0 ? (
                  <p className="text-[#A89582] text-sm py-4 text-center">No hay horarios disponibles este día</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.map((slot) => {
                      const isActive = selected.time === slot
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelected((s) => ({ ...s, time: slot }))}
                          className="py-2.5 rounded-xl border text-sm font-medium tabular-nums transition-all bg-white hover:shadow-sm"
                          style={{
                            borderColor: isActive ? brand : '#EDE5DB',
                            color: isActive ? brand : '#2B1810',
                            backgroundColor: isActive ? `${brand}0D` : 'white',
                          }}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(0)}
                className="px-6 py-3 rounded-full text-sm text-[#6B5A4F] border border-[#EDE5DB] bg-white hover:bg-[#F4EADB] transition-all"
              >
                ← Atrás
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selected.date || !selected.time}
                style={{ backgroundColor: selected.date && selected.time ? brand : '#E8DCC9', boxShadow: selected.date && selected.time ? `0 8px 20px ${brand}30` : 'none' }}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold text-white transition-all disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.99]"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-[#2B1810] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                ¿Cómo te llamamos?
              </h2>
              <p className="text-[#6B5A4F] text-sm">Solo lo básico, para confirmar tu cita</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Nombre completo *</p>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: María García"
                  className="w-full bg-white border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#2B1810] text-sm placeholder-[#A89582] focus:outline-none transition-all"
                  style={{ '--tw-ring-color': brand }}
                  onFocus={(e) => (e.target.style.borderColor = brand)}
                  onBlur={(e) => (e.target.style.borderColor = '#EDE5DB')}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">WhatsApp / Teléfono *</p>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Ej: +52 55 1234 5678"
                  className="w-full bg-white border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#2B1810] text-sm placeholder-[#A89582] focus:outline-none transition-all"
                  onFocus={(e) => (e.target.style.borderColor = brand)}
                  onBlur={(e) => (e.target.style.borderColor = '#EDE5DB')}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Correo <span className="text-[#A89582] normal-case font-normal">(opcional)</span></p>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@correo.com"
                  className="w-full bg-white border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#2B1810] text-sm placeholder-[#A89582] focus:outline-none transition-all"
                  onFocus={(e) => (e.target.style.borderColor = brand)}
                  onBlur={(e) => (e.target.style.borderColor = '#EDE5DB')}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-full text-sm text-[#6B5A4F] border border-[#EDE5DB] bg-white hover:bg-[#F4EADB] transition-all"
              >
                ← Atrás
              </button>
              <button
                onClick={() => { if (form.name.trim() && form.phone.trim()) setStep(3) }}
                disabled={!form.name.trim() || !form.phone.trim()}
                style={{ backgroundColor: form.name.trim() && form.phone.trim() ? brand : '#E8DCC9', boxShadow: form.name.trim() && form.phone.trim() ? `0 8px 20px ${brand}30` : 'none' }}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold text-white transition-all disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.99]"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-[#2B1810] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                Revisa y confirma
              </h2>
              <p className="text-[#6B5A4F] text-sm">Así quedará tu cita</p>
            </div>
            <div className="bg-white border border-[#EDE5DB] rounded-3xl p-6 space-y-4 shadow-sm">
              <Row label="Servicio" value={selected.service?.name} />
              <Row label="Duración" value={fmtDuration(selected.service?.duration_minutes)} />
              {selected.service?.price != null && (
                <Row label="Precio" value={`$${Number(selected.service.price).toFixed(0)}`} accentColor={brand} />
              )}
              <div className="border-t border-[#EDE5DB]" />
              <Row label="Fecha" value={fmtDate(selected.date)} />
              <Row label="Hora" value={selected.time} />
              {selected.staffId && (
                <Row label="Con" value={staff.find(s => s.id === selected.staffId)?.name} />
              )}
              <div className="border-t border-[#EDE5DB]" />
              <Row label="Nombre" value={form.name} />
              <Row label="Teléfono" value={form.phone} />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-[#FBE9E7] border border-[#E6A494] rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C44646" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[#C44646] text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-full text-sm text-[#6B5A4F] border border-[#EDE5DB] bg-white hover:bg-[#F4EADB] transition-all"
              >
                ← Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ backgroundColor: brand, boxShadow: `0 8px 20px ${brand}30` }}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-70 hover:brightness-105 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Agendando…
                  </>
                ) : 'Agendar cita'}
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="text-center py-8 border-t border-[#EDE5DB] bg-white">
        <p className="text-[#A89582] text-[10px] tracking-widest uppercase">
          Reservas con <span className="text-[#6B5A4F] font-medium">AgendaFlow Beauty</span>
        </p>
      </div>
    </div>
  )
}
