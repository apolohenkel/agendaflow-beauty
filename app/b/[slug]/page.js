'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { composeTheme, themeCssVars, DEFAULT_VERTICAL } from '@/lib/verticals'

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

function StepDot({ n, current, label, theme }) {
  const done = n < current
  const active = n === current
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
        style={{
          backgroundColor: done ? theme.primary : active ? theme.surface : theme.borderSoft,
          color: done ? theme.onPrimary : active ? theme.text : theme.textMuted,
          borderWidth: active ? 2 : done ? 0 : 1,
          borderStyle: 'solid',
          borderColor: active ? theme.primary : theme.border,
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
        style={{ color: active ? theme.primary : done ? theme.textSoft : theme.textMuted }}
      >
        {label}
      </p>
    </div>
  )
}

function Row({ label, value, accent, theme }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs" style={{ color: theme.textSoft }}>{label}</p>
      <p className="text-sm font-medium text-right" style={{ color: accent || theme.text }}>
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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState({ services: [], staffId: '', date: null, time: '' })

  const totalDuration = selected.services.reduce((sum, s) => sum + (s?.duration_minutes || 0), 0)
  const totalPrice = selected.services.reduce((sum, s) => (s?.price != null ? sum + Number(s.price) : sum), 0)
  const hasPrice = selected.services.some((s) => s?.price != null)

  function toggleService(svc) {
    setSelected((s) => {
      const exists = s.services.some((x) => x.id === svc.id)
      return { ...s, services: exists ? s.services.filter((x) => x.id !== svc.id) : [...s.services, svc], time: '' }
    })
  }
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [rememberedClient, setRememberedClient] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelledHere, setCancelledHere] = useState(false)
  const [error, setError] = useState(null)

  // Mis citas
  const [showMine, setShowMine] = useState(false)
  const [minePhone, setMinePhone] = useState('')
  const [mineLoading, setMineLoading] = useState(false)
  const [mineList, setMineList] = useState(null) // null = not searched yet, [] = no results
  const [minePast, setMinePast] = useState([])
  const [mineTz, setMineTz] = useState('America/Mexico_City')
  const [mineError, setMineError] = useState(null)
  const [mineCancelling, setMineCancelling] = useState(null)
  const [rescheduling, setRescheduling] = useState(null) // appointment siendo reprogramada

  // Pre-llena el form con datos del cliente recurrente al montar
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = JSON.parse(window.localStorage.getItem(`af:client:${slug}`) || 'null')
      if (saved?.phone) {
        setForm((f) => ({
          ...f,
          name: saved.name || '',
          phone: saved.phone || '',
          email: saved.email || '',
        }))
        setRememberedClient(true)
      }
    } catch {}
  }, [slug])

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
        supabase.from('staff').select('id, name, role, photo_url, bio, specialties')
          .eq('business_id', biz.id).eq('active', true).order('name'),
      ])
      setServices(svcs || [])
      setStaff(stf || [])

      // Stats de reviews (no-blocking)
      supabase.rpc('get_public_org_stats', { p_slug: slug }).then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : data
        if (row && Number(row.review_count) > 0) {
          setStats({ avg: Number(row.avg_rating), count: Number(row.review_count) })
        }
      })

      setLoading(false)
    }
    load()
  }, [slug])

  const verticalKey = org?.vertical || DEFAULT_VERTICAL
  const baseTheme = composeTheme(verticalKey, org?.theme)
  // Si el org tiene primary_color custom, override al theme.
  const theme = org?.primary_color ? { ...baseTheme, primary: org.primary_color } : baseTheme
  const cssVars = themeCssVars(theme)

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

  const slots = selected.date && totalDuration > 0
    ? generateSlots(business?.opening_hours, selected.date, totalDuration)
    : []

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim()) { setError('Completa tu nombre y teléfono.'); return }
    if (selected.services.length === 0) { setError('Selecciona al menos un servicio.'); return }
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
          service_ids: selected.services.map((s) => s.id),
          staff_id: selected.staffId || null,
          starts_at: startsAt.toISOString(),
          client_name: form.name.trim(),
          client_phone: form.phone.trim(),
          client_email: form.email.trim() || null,
          notes: form.notes.trim() || null,
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
        } else if (data.error === 'deposit_session_failed') {
          setError('No pudimos iniciar el pago de la seña. Intenta de nuevo.')
        } else {
          setError('Ocurrió un error. Por favor intenta de nuevo.')
        }
        return
      }

      // Si requiere seña, redirigir a Stripe Checkout
      if (data.requires_deposit && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }

      setConfirmation({
        id: data.appointment_id,
        token: data.cancel_token,
        appointments: data.appointments || [{ id: data.appointment_id, cancel_token: data.cancel_token }],
      })
      // Recordar cliente para próxima visita
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`af:client:${slug}`, JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || null,
          }))
        }
      } catch {}
      setDone(true)
    } catch {
      setError('Ocurrió un error. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function icsContent() {
    if (!selected.date || selected.services.length === 0 || !selected.time) return ''
    const [h, m] = selected.time.split(':').map(Number)
    const starts = new Date(selected.date)
    starts.setHours(h, m, 0, 0)
    const total = totalDuration || 60
    const ends = new Date(starts.getTime() + total * 60000)
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const uid = confirmation?.id || `${Date.now()}@agendaflow`
    const serviceNames = selected.services.map((s) => s.name).join(' + ')
    const summary = `${serviceNames} · ${business?.name || ''}`.trim()
    const desc = `Servicios: ${serviceNames}\\nCliente: ${form.name}\\nTel: ${form.phone}`
    const loc = business?.address || ''
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AgendaFlow//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(starts)}`,
      `DTEND:${fmt(ends)}`,
      `SUMMARY:${summary}`,
      loc ? `LOCATION:${loc}` : '',
      `DESCRIPTION:${desc}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n')
  }

  function downloadIcs() {
    const blob = new Blob([icsContent()], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cita-agendaflow.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleCancelHere() {
    const list = confirmation?.appointments || (confirmation?.id ? [{ id: confirmation.id, cancel_token: confirmation.token }] : [])
    if (list.length === 0) return
    if (!confirm('¿Seguro que quieres cancelar tu cita?')) return
    setCancelling(true)
    await Promise.all(list.map((a) =>
      fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: a.id, token: a.cancel_token }),
      }).catch(() => null),
    ))
    setCancelling(false)
    setCancelledHere(true)
  }

  async function lookupMyAppointments(e) {
    e?.preventDefault()
    if (!minePhone.trim()) { setMineError('Ingresa tu teléfono'); return }
    setMineLoading(true)
    setMineError(null)
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, phone: minePhone.trim(), include_past: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMineError(data.error === 'rate_limited' ? 'Demasiados intentos, espera un minuto.' : 'No pudimos buscar tus citas.')
        setMineList(null)
      } else {
        setMineList(data.upcoming || data.appointments || [])
        setMinePast(data.past || [])
        setMineTz(data.timezone || 'America/Mexico_City')
      }
    } catch {
      setMineError('Error de red')
    } finally {
      setMineLoading(false)
    }
  }

  function startReschedule(appt) {
    // Carga el servicio en el wizard y salta a paso fecha/hora
    const svc = services.find((s) => s.id === appt.service_id)
    if (!svc) {
      alert('No pudimos cargar el servicio original. Haz una nueva reserva.')
      return
    }
    setSelected({
      services: [svc],
      staffId: appt.staff_id || '',
      date: null,
      time: '',
    })
    setRescheduling({ appointment_id: appt.id, token: appt.cancel_token })
    setStep(1)
    closeMine()
  }

  function repeatBooking(appt) {
    const svc = services.find((s) => s.id === appt.service_id)
    if (!svc) {
      alert('Ese servicio ya no está disponible en este salón.')
      return
    }
    setSelected({
      services: [svc],
      staffId: appt.staff_id || '',
      date: null,
      time: '',
    })
    setStep(1)
    closeMine()
  }

  async function doReschedule() {
    if (!rescheduling) return
    const [h, m] = selected.time.split(':').map(Number)
    const startsAt = new Date(selected.date)
    startsAt.setHours(h, m, 0, 0)

    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/bookings/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: rescheduling.appointment_id,
        token: rescheduling.token,
        starts_at: startsAt.toISOString(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSubmitting(false)

    if (!res.ok) {
      if (data.error === 'slot_unavailable') setError('Ese horario acaba de ocuparse. Elige otro.')
      else setError('No pudimos reprogramar. Intenta de nuevo.')
      return
    }

    setConfirmation({
      id: data.appointment_id,
      token: data.cancel_token,
      appointments: [{ id: data.appointment_id, cancel_token: data.cancel_token }],
    })
    setRescheduling(null)
    setDone(true)
  }

  async function cancelFromMine(appt) {
    if (!confirm('¿Seguro que quieres cancelar esta cita?')) return
    setMineCancelling(appt.id)
    const res = await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: appt.id, token: appt.cancel_token }),
    })
    setMineCancelling(null)
    if (res.ok) {
      setMineList((prev) => (prev || []).filter((a) => a.id !== appt.id))
    }
  }

  function closeMine() {
    setShowMine(false)
    setMineList(null)
    setMinePast([])
    setMineError(null)
    setMinePhone('')
  }

  function clearRemembered() {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`af:client:${slug}`)
      }
    } catch {}
    setForm({ name: '', phone: '', email: '', notes: '' })
    setRememberedClient(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: theme.border, borderTopColor: theme.primary }}
        />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: 'var(--font-body)' }}>
        <div className="text-center max-w-sm space-y-4">
          <h1 className="text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Negocio no encontrado
          </h1>
          <p className="text-sm" style={{ color: theme.textSoft }}>El enlace que abriste no corresponde a ningún negocio activo.</p>
        </div>
      </div>
    )
  }

  if (done) {
    const mapsUrl = business?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}` : null
    const isCancelled = cancelledHere
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ ...cssVars, backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
      >
        <div className="text-center max-w-sm w-full space-y-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{
              backgroundColor: isCancelled ? `${theme.textMuted}1A` : `${theme.primary}1A`,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: isCancelled ? `${theme.textMuted}4D` : `${theme.primary}4D`,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={isCancelled ? theme.textMuted : theme.primary} strokeWidth="1.8" strokeLinecap="round">
              {isCancelled ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <polyline points="20 6 9 17 4 12" />
              )}
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
              {isCancelled ? 'Cita cancelada' : '¡Cita agendada!'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
              {isCancelled
                ? <>Cancelamos tu cita en <span className="font-medium" style={{ color: 'var(--text)' }}>{business?.name}</span>. Puedes volver a reservar cuando quieras.</>
                : <>Tu cita en <span className="font-medium" style={{ color: 'var(--text)' }}>{business?.name}</span> quedó registrada.</>}
            </p>
          </div>
          <div
            className="rounded-3xl p-6 text-left space-y-3 shadow-sm"
            style={{ backgroundColor: 'var(--surface)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', opacity: isCancelled ? 0.55 : 1 }}
          >
            {selected.services.length === 1 ? (
              <Row label="Servicio" value={selected.services[0].name} theme={theme} />
            ) : (
              <div>
                <p className="text-xs mb-1.5" style={{ color: theme.textSoft }}>Servicios</p>
                <ul className="space-y-1">
                  {selected.services.map((s) => (
                    <li key={s.id} className="text-sm font-medium flex items-center justify-between" style={{ color: theme.text }}>
                      <span>{s.name}</span>
                      {s.price != null && <span className="tabular-nums" style={{ color: theme.primary }}>${Number(s.price).toFixed(0)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Row label="Fecha" value={fmtDate(selected.date)} theme={theme} />
            <Row label="Hora" value={selected.time} theme={theme} />
            {totalDuration > 0 && <Row label="Duración" value={fmtDuration(totalDuration)} theme={theme} />}
            {selected.staffId && (
              <Row label="Con" value={staff.find(s => s.id === selected.staffId)?.name} theme={theme} />
            )}
            {business?.address && (
              <Row label="Dónde" value={business.address} theme={theme} />
            )}
          </div>

          {!isCancelled && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={downloadIcs}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-105 active:scale-[0.98]"
                  style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="12" y1="14" x2="12" y2="20" /><line x1="9" y1="17" x2="15" y2="17" /></svg>
                  Añadir al calendario
                </button>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-95"
                    style={{ backgroundColor: theme.surface, color: theme.text, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    Abrir en Maps
                  </a>
                )}
              </div>
              <button
                onClick={handleCancelHere}
                disabled={cancelling}
                className="text-xs underline-offset-2 hover:underline disabled:opacity-60 transition-opacity mt-2"
                style={{ color: theme.textMuted }}
              >
                {cancelling ? 'Cancelando…' : '¿Necesitas cancelar? Cancelar esta cita'}
              </button>
            </div>
          )}

          {!isCancelled && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Te contactaremos por WhatsApp para confirmar.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ ...cssVars, backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >

      {/* Header del negocio */}
      <div
        className="px-5 sm:px-6 py-5"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt={business?.name}
                className="w-11 h-11 rounded-2xl object-contain shrink-0"
                style={{ backgroundColor: theme.bg, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{ backgroundColor: theme.primary, boxShadow: `0 4px 14px ${theme.primary}33` }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={theme.onPrimary} strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4.5 20 L12 4 L19.5 20" /><path d="M7.8 13.8 C12 13 15 13.3 21 18.2" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-medium truncate" style={{ fontFamily: 'var(--font-display)' }}>
                {business?.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {business?.address && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-soft)' }}>{business.address}</p>
                )}
                {stats && (
                  <div className="flex items-center gap-1 text-xs">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={theme.primary}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-semibold tabular-nums" style={{ color: theme.text }}>{stats.avg.toFixed(1)}</span>
                    <span style={{ color: theme.textMuted }}>· {stats.count} {stats.count === 1 ? 'review' : 'reviews'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMine(true)}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-all hover:brightness-95"
            style={{
              color: theme.textSoft,
              backgroundColor: theme.surfaceSoft,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: theme.border,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <span className="hidden sm:inline">Mis citas</span>
            <span className="sm:hidden">Mis citas</span>
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 sm:px-6 py-8 sm:py-10 space-y-8">

        {/* Stepper */}
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-px z-0" style={{ backgroundColor: 'var(--border)' }} />
          {['Servicio', 'Fecha y hora', 'Tus datos', 'Confirmar'].map((label, i) => (
            <div key={i} className="z-10 px-1.5" style={{ backgroundColor: 'var(--bg)' }}>
              <StepDot n={i} current={step} label={label} theme={theme} />
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                ¿Qué servicio deseas?
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Elige el servicio que te viene bien hoy</p>
            </div>
            {selected.services.length > 0 && (
              <p className="text-xs" style={{ color: theme.textSoft }}>
                Puedes agregar varios servicios en una misma visita.
              </p>
            )}
            <div className="space-y-2.5">
              {services.map((svc) => {
                const isActive = selected.services.some((s) => s.id === svc.id)
                return (
                  <button
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all hover:shadow-md"
                    style={{
                      backgroundColor: isActive ? `${theme.primary}0D` : theme.surface,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: isActive ? theme.primary : theme.border,
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-base font-medium" style={{ color: 'var(--text)' }}>{svc.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-soft)' }}>
                        {fmtDuration(svc.duration_minutes)}
                        {svc.category ? ` · ${svc.category}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {svc.price != null && (
                        <p className="text-base font-semibold tabular-nums" style={{ color: theme.primary }}>
                          ${Number(svc.price).toFixed(0)}
                        </p>
                      )}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
                        style={{
                          backgroundColor: isActive ? theme.primary : 'transparent',
                          borderWidth: isActive ? 0 : 2,
                          borderStyle: 'solid',
                          borderColor: theme.border,
                        }}
                      >
                        {isActive && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.onPrimary} strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
              {services.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-soft)' }}>
                  Este negocio aún no ha publicado servicios.
                </p>
              )}
            </div>

            {selected.services.length > 0 && (
              <div
                className="rounded-2xl px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: `${theme.primary}0F`, borderWidth: 1, borderStyle: 'solid', borderColor: `${theme.primary}33` }}
              >
                <div>
                  <p className="text-xs" style={{ color: theme.textSoft }}>
                    {selected.services.length} {selected.services.length === 1 ? 'servicio' : 'servicios'} · {fmtDuration(totalDuration)}
                  </p>
                </div>
                {hasPrice && (
                  <p className="text-lg font-semibold tabular-nums" style={{ color: theme.primary }}>
                    ${totalPrice.toFixed(0)}
                  </p>
                )}
              </div>
            )}

            {staff.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>¿Con alguien en especial?</p>

                {/* Sin preferencia */}
                <button
                  onClick={() => setSelected((s) => ({ ...s, staffId: '' }))}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                  style={{
                    backgroundColor: !selected.staffId ? `${theme.primary}0D` : theme.surface,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: !selected.staffId ? theme.primary : theme.border,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: theme.surfaceSoft, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: theme.text }}>Sin preferencia</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Asignamos a quien esté disponible</p>
                  </div>
                </button>

                {/* Cards de staff */}
                {staff.map((m) => {
                  const isActive = selected.staffId === m.id
                  const initials = m.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
                  const specs = Array.isArray(m.specialties) ? m.specialties.slice(0, 4) : []
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelected((s) => ({ ...s, staffId: m.id }))}
                      className="w-full flex items-start gap-3 px-4 py-3 rounded-2xl text-left transition-all hover:shadow-sm"
                      style={{
                        backgroundColor: isActive ? `${theme.primary}0D` : theme.surface,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: isActive ? theme.primary : theme.border,
                      }}
                    >
                      {m.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.photo_url} alt={m.name} className="w-12 h-12 rounded-full object-cover shrink-0" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }} />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`, color: theme.onPrimary }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium" style={{ color: theme.text }}>{m.name}</p>
                          {m.role && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: theme.textSoft, backgroundColor: theme.surfaceSoft }}>
                              {m.role}
                            </span>
                          )}
                        </div>
                        {m.bio && (
                          <p className="text-xs leading-relaxed" style={{ color: theme.textSoft }}>{m.bio}</p>
                        )}
                        {specs.length > 0 && (
                          <div className="flex gap-1 flex-wrap pt-0.5">
                            {specs.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ color: theme.primary, backgroundColor: `${theme.primary}14`, borderWidth: 1, borderStyle: 'solid', borderColor: `${theme.primary}33` }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setStep(1)}
              disabled={selected.services.length === 0}
              style={{
                backgroundColor: selected.services.length > 0 ? theme.primary : theme.borderSoft,
                color: selected.services.length > 0 ? theme.onPrimary : theme.textMuted,
                boxShadow: selected.services.length > 0 ? `0 8px 20px ${theme.primary}30` : 'none',
              }}
              className="w-full py-3.5 rounded-full text-sm font-semibold transition-all disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                {rescheduling ? 'Elige nuevo horario' : '¿Cuándo te viene bien?'}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
                {rescheduling ? 'Selecciona la nueva fecha y hora para tu cita' : 'Elige el día y la hora que prefieras'}
              </p>
            </div>

            {rescheduling && (
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: `${theme.primary}0F`, borderWidth: 1, borderStyle: 'solid', borderColor: `${theme.primary}33` }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs" style={{ color: theme.text }}>Estás reprogramando tu cita</p>
                  <button
                    onClick={() => { setRescheduling(null); setStep(0) }}
                    className="text-[11px] underline-offset-2 hover:underline"
                    style={{ color: theme.textMuted }}
                  >
                    Cancelar reprogramación
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>Fecha</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableDays.map((d, i) => {
                  const isSelected = selected.date?.toDateString() === d.toDateString()
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected((s) => ({ ...s, date: d, time: '' }))}
                      className="py-3 px-2 rounded-2xl text-center transition-all hover:shadow-sm"
                      style={{
                        backgroundColor: isSelected ? `${theme.primary}0D` : theme.surface,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: isSelected ? theme.primary : theme.border,
                      }}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: isSelected ? theme.primary : theme.textSoft }}>
                        {d.toLocaleDateString('es-MX', { weekday: 'short' })}
                      </p>
                      <p className="text-xl font-medium mt-0.5 tabular-nums" style={{ color: isSelected ? theme.primary : theme.text, fontFamily: 'var(--font-display)' }}>
                        {d.getDate()}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: isSelected ? `${theme.primary}B3` : theme.textMuted }}>
                        {d.toLocaleDateString('es-MX', { month: 'short' })}
                      </p>
                    </button>
                  )
                })}
                {availableDays.length === 0 && (
                  <p className="col-span-full text-sm text-center py-4" style={{ color: 'var(--text-soft)' }}>
                    El negocio aún no ha configurado horarios.
                  </p>
                )}
              </div>
            </div>

            {selected.date && (
              <div className="space-y-2.5">
                <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>Hora disponible</p>
                {slots.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No hay horarios disponibles este día</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.map((slot) => {
                      const isActive = selected.time === slot
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelected((s) => ({ ...s, time: slot }))}
                          className="py-2.5 rounded-xl text-sm font-medium tabular-nums transition-all hover:shadow-sm"
                          style={{
                            backgroundColor: isActive ? `${theme.primary}0D` : theme.surface,
                            color: isActive ? theme.primary : theme.text,
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: isActive ? theme.primary : theme.border,
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
                className="px-6 py-3 rounded-full text-sm transition-all hover:brightness-95"
                style={{ color: theme.textSoft, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border, backgroundColor: theme.surface }}
              >
                ← Atrás
              </button>
              <button
                onClick={() => rescheduling ? doReschedule() : setStep(2)}
                disabled={!selected.date || !selected.time || submitting}
                style={{
                  backgroundColor: selected.date && selected.time ? theme.primary : theme.borderSoft,
                  color: selected.date && selected.time ? theme.onPrimary : theme.textMuted,
                  boxShadow: selected.date && selected.time ? `0 8px 20px ${theme.primary}30` : 'none',
                }}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold transition-all disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]"
              >
                {rescheduling ? (submitting ? 'Reprogramando…' : 'Confirmar nuevo horario') : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                ¿Cómo te llamamos?
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Solo lo básico, para confirmar tu cita</p>
            </div>

            {rememberedClient && (
              <div
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: `${theme.primary}0F`, borderWidth: 1, borderStyle: 'solid', borderColor: `${theme.primary}33` }}
              >
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-xs" style={{ color: theme.text }}>Recordamos tus datos de la última vez</p>
                </div>
                <button
                  onClick={clearRemembered}
                  className="text-[11px] underline-offset-2 hover:underline shrink-0"
                  style={{ color: theme.textMuted }}
                >
                  Limpiar
                </button>
              </div>
            )}

            <div className="space-y-4">
              {[
                { key: 'name', label: 'Nombre completo *', placeholder: 'Ej: María García', type: 'text' },
                { key: 'phone', label: 'WhatsApp / Teléfono *', placeholder: 'Ej: +52 55 1234 5678', type: 'tel' },
                { key: 'email', label: 'Correo', labelOpt: '(opcional)', placeholder: 'tu@correo.com', type: 'email' },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>
                    {f.label}
                    {f.labelOpt && <span className="normal-case font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{f.labelOpt}</span>}
                  </p>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                    style={{
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: theme.border,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                    onBlur={(e) => (e.target.style.borderColor = theme.border)}
                  />
                </div>
              ))}

              {/* Notas */}
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>
                  Notas para el equipo
                  <span className="normal-case font-normal ml-1" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
                </p>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value.slice(0, 500) }))}
                  placeholder="Alergias, preferencias, referencia de color, 'como la última vez'…"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all resize-none"
                  style={{
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: theme.border,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                  onBlur={(e) => (e.target.style.borderColor = theme.border)}
                />
                <p className="text-[11px] text-right tabular-nums" style={{ color: theme.textMuted }}>
                  {form.notes.length}/500
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-full text-sm transition-all hover:brightness-95"
                style={{ color: theme.textSoft, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border, backgroundColor: theme.surface }}
              >
                ← Atrás
              </button>
              <button
                onClick={() => { if (form.name.trim() && form.phone.trim()) setStep(3) }}
                disabled={!form.name.trim() || !form.phone.trim()}
                style={{
                  backgroundColor: form.name.trim() && form.phone.trim() ? theme.primary : theme.borderSoft,
                  color: form.name.trim() && form.phone.trim() ? theme.onPrimary : theme.textMuted,
                  boxShadow: form.name.trim() && form.phone.trim() ? `0 8px 20px ${theme.primary}30` : 'none',
                }}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold transition-all disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
                Revisa y confirma
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Así quedará tu cita</p>
            </div>
            <div
              className="rounded-3xl p-6 space-y-4 shadow-sm"
              style={{ backgroundColor: theme.surface, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
            >
              {selected.services.length === 1 ? (
                <>
                  <Row label="Servicio" value={selected.services[0].name} theme={theme} />
                  <Row label="Duración" value={fmtDuration(selected.services[0].duration_minutes)} theme={theme} />
                  {selected.services[0].price != null && (
                    <Row label="Precio" value={`$${Number(selected.services[0].price).toFixed(0)}`} accent={theme.primary} theme={theme} />
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs mb-2" style={{ color: theme.textSoft }}>Servicios ({selected.services.length})</p>
                    <ul className="space-y-1.5">
                      {selected.services.map((s) => (
                        <li key={s.id} className="flex items-center justify-between text-sm" style={{ color: theme.text }}>
                          <span>{s.name} <span style={{ color: theme.textMuted }}>· {fmtDuration(s.duration_minutes)}</span></span>
                          {s.price != null && <span className="tabular-nums font-medium" style={{ color: theme.primary }}>${Number(s.price).toFixed(0)}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Row label="Duración total" value={fmtDuration(totalDuration)} theme={theme} />
                  {hasPrice && (
                    <Row label="Precio total" value={`$${totalPrice.toFixed(0)}`} accent={theme.primary} theme={theme} />
                  )}
                </>
              )}
              <div style={{ borderTop: `1px solid ${theme.border}` }} />
              <Row label="Fecha" value={fmtDate(selected.date)} theme={theme} />
              <Row label="Hora" value={selected.time} theme={theme} />
              {selected.staffId && (
                <Row label="Con" value={staff.find(s => s.id === selected.staffId)?.name} theme={theme} />
              )}
              <div style={{ borderTop: `1px solid ${theme.border}` }} />
              <Row label="Nombre" value={form.name} theme={theme} />
              <Row label="Teléfono" value={form.phone} theme={theme} />
            </div>

            {error && (
              <div
                className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                style={{ backgroundColor: `${theme.error}15`, borderWidth: 1, borderStyle: 'solid', borderColor: `${theme.error}40` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.error} strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs" style={{ color: theme.error }}>{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-full text-sm transition-all hover:brightness-95"
                style={{ color: theme.textSoft, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border, backgroundColor: theme.surface }}
              >
                ← Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: theme.primary,
                  color: theme.onPrimary,
                  boxShadow: `0 8px 20px ${theme.primary}30`,
                }}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold transition-all disabled:opacity-70 hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: `${theme.onPrimary}30`, borderTopColor: theme.onPrimary }} />
                    Agendando…
                  </>
                ) : 'Agendar cita'}
              </button>
            </div>
          </div>
        )}

      </div>

      <div
        className="text-center py-8"
        style={{ backgroundColor: theme.surface, borderTop: `1px solid ${theme.border}` }}
      >
        <p className="text-[10px] tracking-widest uppercase" style={{ color: theme.textMuted }}>
          Reservas con <span className="font-medium" style={{ color: theme.textSoft }}>AgendaFlow Beauty</span>
        </p>
      </div>

      {showMine && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ backgroundColor: `${theme.text}66`, backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeMine() }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl"
            style={{ backgroundColor: theme.bg, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-light" style={{ fontFamily: 'var(--font-display)', color: theme.text }}>
                  Mis citas
                </h3>
                <p className="text-xs mt-0.5" style={{ color: theme.textSoft }}>
                  {mineList === null ? 'Ingresa tu teléfono para verlas' : mineList.length === 0 ? 'No encontramos citas activas' : `${mineList.length} ${mineList.length === 1 ? 'cita activa' : 'citas activas'}`}
                </p>
              </div>
              <button
                onClick={closeMine}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:brightness-95 transition-all"
                style={{ backgroundColor: theme.surface, color: theme.textSoft }}
                aria-label="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <form onSubmit={lookupMyAppointments} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textSoft }}>
                  Tu WhatsApp / Teléfono
                </label>
                <input
                  type="tel"
                  value={minePhone}
                  onChange={(e) => setMinePhone(e.target.value)}
                  placeholder="Ej: +52 55 1234 5678"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{ backgroundColor: theme.surface, color: theme.text, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
                  onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                  onBlur={(e) => (e.target.style.borderColor = theme.border)}
                />
              </div>
              {mineError && (
                <p className="text-xs rounded-xl px-3 py-2" style={{ color: theme.error, backgroundColor: `${theme.error}14` }}>{mineError}</p>
              )}
              <button
                type="submit"
                disabled={mineLoading}
                className="w-full py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-60 hover:brightness-110"
                style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
              >
                {mineLoading ? 'Buscando…' : 'Buscar mis citas'}
              </button>
            </form>

            {mineList !== null && mineList.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm" style={{ color: theme.textSoft }}>
                  No encontramos citas activas con ese número en <span className="font-medium" style={{ color: theme.text }}>{business?.name}</span>.
                </p>
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  ¿Tal vez usaste otro número? También puedes agendar una nueva abajo.
                </p>
              </div>
            )}

            {mineList && mineList.length > 0 && (
              <div className="space-y-2.5">
                {mineList.map((a) => {
                  const when = new Date(a.starts_at).toLocaleString('es-MX', {
                    timeZone: mineTz,
                    weekday: 'long', day: 'numeric', month: 'long',
                    hour: '2-digit', minute: '2-digit',
                  })
                  const isCancelling = mineCancelling === a.id
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl p-4 space-y-3"
                      style={{ backgroundColor: theme.surface, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold" style={{ color: theme.text }}>{a.service_name || 'Servicio'}</p>
                          <p className="text-xs mt-1" style={{ color: theme.textSoft }}>{when}</p>
                          {a.staff_name && (
                            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Con {a.staff_name}</p>
                          )}
                        </div>
                        {a.service_price != null && (
                          <p className="text-sm font-semibold shrink-0 tabular-nums" style={{ color: theme.primary }}>
                            ${Number(a.service_price).toFixed(0)}
                          </p>
                        )}
                      </div>
                      {a.notes && (
                        <p className="text-xs italic rounded-lg px-3 py-2" style={{ color: theme.textSoft, backgroundColor: theme.surfaceSoft }}>
                          &ldquo;{a.notes}&rdquo;
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => startReschedule(a)}
                          className="py-2 rounded-full text-xs font-medium transition-all hover:brightness-95"
                          style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
                        >
                          Reprogramar
                        </button>
                        <button
                          onClick={() => cancelFromMine(a)}
                          disabled={isCancelling}
                          className="py-2 rounded-full text-xs font-medium transition-all disabled:opacity-60 hover:brightness-95"
                          style={{ backgroundColor: theme.surfaceSoft, color: theme.textSoft, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
                        >
                          {isCancelling ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pasadas */}
            {minePast.length > 0 && (
              <div className="space-y-2.5 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                <p className="text-[11px] uppercase tracking-wider font-medium pt-2" style={{ color: theme.textSoft }}>
                  Visitas anteriores
                </p>
                {minePast.map((a) => {
                  const when = new Date(a.starts_at).toLocaleString('es-MX', {
                    timeZone: mineTz,
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl p-4 space-y-2.5"
                      style={{ backgroundColor: theme.surfaceSoft, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium" style={{ color: theme.text }}>{a.service_name || 'Servicio'}</p>
                          <p className="text-xs mt-1" style={{ color: theme.textSoft }}>{when}</p>
                          {a.staff_name && (
                            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Con {a.staff_name}</p>
                          )}
                        </div>
                        {a.service_price != null && (
                          <p className="text-sm shrink-0 tabular-nums" style={{ color: theme.textSoft }}>
                            ${Number(a.service_price).toFixed(0)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => repeatBooking(a)}
                        className="w-full py-2 rounded-full text-xs font-medium transition-all hover:brightness-95"
                        style={{ backgroundColor: theme.surface, color: theme.primary, borderWidth: 1, borderStyle: 'solid', borderColor: `${theme.primary}66` }}
                      >
                        Reservar otra vez
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
