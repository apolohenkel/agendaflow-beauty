'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STATUS_MAP, STATUS_OPTIONS } from '@/lib/status'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/Toast'
import { logger } from '@/lib/logger'
import { formatServicePrice } from '@/lib/plans'
import Chip, { STATUS_TO_CHIP } from '@/components/ui/Chip'
import Hairline from '@/components/ui/Hairline'
import NuevaCitaModal from '@/components/dashboard/citas/NuevaCitaModal'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)

function fmt(iso) {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(date) {
  return date.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── MODAL EDITAR CITA ────────────────────────────────────────────────────────
function EditarCitaModal({ appt, onClose, onSaved }) {
  const supabase = createClient()
  const { toast } = useToast()
  const { businessId } = useOrg()
  const [services, setServices] = useState([])
  const [staff, setStaff]       = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const startsAt = new Date(appt.starts_at)
  const [form, setForm] = useState({
    date:      startsAt.toISOString().split('T')[0],
    time:      startsAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    serviceId: appt.service_id || '',
    staffId:   appt.staff_id   || '',
    status:    appt.status     || 'confirmed',
    notes:     appt.notes      || '',
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!businessId) return
    async function loadData() {
      const [{ data: svcs }, { data: stf }] = await Promise.all([
        supabase.from('services').select('id, name, duration_minutes, price').eq('business_id', businessId).eq('active', true).order('name'),
        supabase.from('staff').select('id, name, role').eq('business_id', businessId).eq('active', true).order('name'),
      ])
      setServices(svcs || [])
      setStaff(stf || [])
      setLoadingData(false)
    }
    loadData()
  }, [businessId])

  const selectedService = services.find((s) => s.id === form.serviceId)
  const duration = selectedService?.duration_minutes || Math.round((new Date(appt.ends_at) - new Date(appt.starts_at)) / 60000)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.date || !form.time) { setError('La fecha y hora son obligatorias.'); return }
    setLoading(true)
    setError(null)
    try {
      const startsAtL = new Date(`${form.date}T${form.time}:00`)
      const endsAtL   = new Date(startsAtL.getTime() + duration * 60000)
      const { error: err } = await supabase.from('appointments').update({
        starts_at:  startsAtL.toISOString(),
        ends_at:    endsAtL.toISOString(),
        service_id: form.serviceId || null,
        staff_id:   form.staffId   || null,
        status:     form.status,
        notes:      form.notes.trim() || null,
      }).eq('id', appt.id)
      if (err) throw err
      toast('Cita actualizada', 'success')
      onSaved()
      onClose()
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    const { error: cancelErr } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appt.id)
    setLoading(false)
    if (cancelErr) {
      toast('Error al cancelar la cita.', 'error')
    } else {
      toast('Cita cancelada', 'info')
      onSaved()
      onClose()
    }
  }

  const inputCls = 'w-full bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder:text-[var(--dash-text-dim)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 scrim-glass animate-scrim-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-[480px] max-h-[92vh] overflow-auto scrollbar-hide rounded-t-3xl sm:rounded-[14px] animate-modal-in pb-safe"
        style={{
          background: 'var(--dash-ink-raised)',
          border: '1px solid var(--dash-border)',
          boxShadow: '0 1px 0 var(--dash-hairline) inset, 0 24px 64px -12px rgba(0,0,0,0.8)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-[var(--dash-text)] text-xl tracking-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
              Editar cita
            </h2>
            <p className="text-[var(--dash-text-muted)] text-xs mt-1">{appt.clients?.name || 'Cliente'}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-[var(--dash-text-dim)] hover:text-[var(--dash-text-soft)] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <Hairline className="mx-6" />

        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="eyebrow">Fecha *</p>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <p className="eyebrow">Hora *</p>
                <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Servicio y Staff */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="eyebrow">Servicio</p>
                <select value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer`}
                  style={{ color: form.serviceId ? 'var(--dash-text)' : 'var(--dash-text-dim)' }}>
                  <option value="">Sin asignar</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id} style={{ color: 'var(--dash-text)', background: 'var(--dash-ink-raised)' }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <p className="eyebrow">Colaborador</p>
                <select value={form.staffId} onChange={(e) => set('staffId', e.target.value)}
                  className={`${inputCls} appearance-none cursor-pointer`}
                  style={{ color: form.staffId ? 'var(--dash-text)' : 'var(--dash-text-dim)' }}>
                  <option value="">Cualquiera</option>
                  {staff.map((m) => (
                    <option key={m.id} value={m.id} style={{ color: 'var(--dash-text)', background: 'var(--dash-ink-raised)' }}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <p className="eyebrow">Estado</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((st) => {
                  const s = STATUS_MAP[st]
                  const selected = form.status === st
                  const variant = STATUS_TO_CHIP[st] || 'muted'
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => set('status', st)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.12em] font-medium transition-all border
                        ${selected
                          ? 'border-[var(--dash-primary)] bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary-soft)]'
                          : 'border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-[var(--dash-border-hover)] hover:text-[var(--dash-text-soft)]'
                        }
                      `}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <p className="eyebrow">Notas</p>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                placeholder="Indicaciones especiales..."
                className={`${inputCls} resize-none`} />
            </div>

            {error && (
              <p className="text-[var(--dash-danger)] text-xs bg-[var(--dash-danger)]/10 border border-[var(--dash-danger)]/20 px-4 py-2.5 rounded-xl">{error}</p>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleCancel} disabled={loading || appt.status === 'cancelled'}
                className="px-4 py-2.5 rounded-full text-xs font-medium text-[var(--dash-danger)] border border-[var(--dash-danger)]/30 hover:bg-[var(--dash-danger)]/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-[0.1em]">
                Cancelar cita
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-primary-deep))',
                  color: 'var(--dash-ink)',
                  boxShadow: '0 4px 16px -4px var(--dash-primary)',
                }}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── VISTA LISTA ─────────────────────────────────────────────────────────────
function ListView({ appointments, filterStatus, setFilterStatus, onEdit, currency }) {
  return (
    <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl overflow-hidden">
      {/* Filtros */}
      <div className="flex items-center gap-2 px-6 py-4 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`
            px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-medium transition-all border
            ${filterStatus === 'all'
              ? 'border-[var(--dash-primary)] bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary-soft)]'
              : 'border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-[var(--dash-border-hover)] hover:text-[var(--dash-text-soft)]'
            }
          `}
        >
          Todas
        </button>
        {STATUS_OPTIONS.map((st) => {
          const s = STATUS_MAP[st]
          const selected = filterStatus === st
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-medium transition-all border
                ${selected
                  ? 'border-[var(--dash-primary)] bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary-soft)]'
                  : 'border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-[var(--dash-border-hover)] hover:text-[var(--dash-text-soft)]'
                }
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          )
        })}
      </div>

      <Hairline className="mx-6" />

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
          </div>
          <p className="text-[var(--dash-text-soft)] text-sm italic" style={{ fontFamily: 'var(--font-display)' }}>
            Sin citas para este filtro
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--dash-border)]">
          {appointments.map((appt) => {
            const chipVariant = STATUS_TO_CHIP[appt.status] || 'muted'
            const label = STATUS_MAP[appt.status]?.label || 'Pendiente'
            return (
              <button
                key={appt.id}
                onClick={() => onEdit(appt)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-[var(--dash-ink)]/60 transition-colors group text-left"
                aria-label="Editar cita"
              >
                {/* Fecha y hora */}
                <div className="w-16 sm:w-24 shrink-0">
                  <p className="text-[var(--dash-text-muted)] text-[9px] sm:text-[10px] uppercase tracking-[0.14em]">
                    {new Date(appt.starts_at).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}
                  </p>
                  <p
                    className="text-[var(--dash-text)] text-sm sm:text-base leading-none tabular-nums mt-1"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
                  >
                    {fmt(appt.starts_at)}
                  </p>
                  <p className="hidden sm:block text-[var(--dash-text-dim)] text-[10px] tabular-nums mt-1">
                    hasta {fmt(appt.ends_at)}
                  </p>
                </div>

                {/* Hairline divisor */}
                <div className="w-px self-stretch my-2 hidden sm:block" style={{ background: 'var(--dash-border)' }} />

                {/* Cliente */}
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--dash-text)] text-sm font-medium truncate">{appt.clients?.name || '—'}</p>
                  <p className="text-[var(--dash-text-muted)] text-xs truncate mt-0.5">
                    {appt.services?.name ? appt.services.name : appt.clients?.phone || ''}
                    {appt.staff?.name    ? ` · ${appt.staff.name}`    : ''}
                  </p>
                </div>

                {/* Precio - oculto en móvil para dar espacio al estado */}
                {appt.services?.price != null && (
                  <p
                    className="hidden sm:block text-[var(--dash-primary-soft)] text-sm shrink-0 tabular-nums tracking-tight"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
                  >
                    {formatServicePrice(appt.services.price, currency)}
                  </p>
                )}

                {/* Estado */}
                <Chip variant={chipVariant} size="sm">{label}</Chip>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── VISTA CALENDARIO ────────────────────────────────────────────────────────
function CalendarView({ appointments, weekStart, onEdit }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  function getAppts(day) {
    return appointments.filter((a) => {
      const d = new Date(a.starts_at)
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth()    === day.getMonth()    &&
        d.getDate()     === day.getDate()
      )
    })
  }

  const today = new Date()

  return (
    <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto scrollbar-hide">
      <div className="min-w-[640px]">
      {/* Cabecera días */}
      <div className="grid grid-cols-8">
        <div className="px-3 py-4" />
        {days.map((day, i) => {
          const isToday =
            day.getDate()     === today.getDate()     &&
            day.getMonth()    === today.getMonth()    &&
            day.getFullYear() === today.getFullYear()
          return (
            <div key={i} className={`px-2 py-4 text-center ${isToday ? 'bg-[var(--dash-primary-bg-8)]' : ''}`}>
              <p className={`text-[9px] uppercase tracking-[0.2em] ${isToday ? 'text-[var(--dash-primary)]' : 'text-[var(--dash-text-muted)]'}`}>
                {day.toLocaleDateString('es-GT', { weekday: 'short' })}
              </p>
              <p
                className={`text-lg mt-1 tabular-nums ${isToday ? 'text-[var(--dash-primary)]' : 'text-[var(--dash-text-soft)]'}`}
                style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
              >
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      <Hairline />

      {/* Grid de horas */}
      <div className="max-h-[560px]">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-[var(--dash-border)] min-h-[56px]">
            <div className="px-3 py-2 flex items-start justify-end border-r border-[var(--dash-border)]">
              <span className="text-[var(--dash-text-dim)] text-[10px] tabular-nums">{hour.toString().padStart(2, '0')}:00</span>
            </div>
            {days.map((day, di) => {
              const dayAppts = getAppts(day).filter((a) => new Date(a.starts_at).getHours() === hour)
              return (
                <div key={di} className="border-r border-[var(--dash-border)] last:border-r-0 p-1 space-y-1">
                  {dayAppts.map((appt) => {
                    const s = STATUS_MAP[appt.status] || STATUS_MAP.pending
                    return (
                      <button
                        key={appt.id}
                        onClick={() => onEdit(appt)}
                        className={`w-full ${s.bg} rounded-lg px-2 py-1.5 text-left hover:brightness-125 transition-all border border-transparent hover:border-[var(--dash-primary)]/30`}
                      >
                        <p className={`text-[10px] font-semibold ${s.text} tabular-nums`}>{fmt(appt.starts_at)}</p>
                        <p className="text-[var(--dash-text-muted)] text-[9px] truncate">{appt.clients?.name || '—'}</p>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function CitasPage() {
  const supabase = createClient()
  const { business } = useOrg()
  const currency = business?.currency || 'gtq'

  const [view, setView]               = useState('lista')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showModal, setShowModal]     = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [weekStart, setWeekStart]     = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('appointments')
        .select(`
          id, starts_at, ends_at, status, notes, source,
          service_id, staff_id,
          clients(name, phone),
          services(name, duration_minutes, price),
          staff(name)
        `)
        .order('starts_at', { ascending: false })
      if (fetchErr) throw fetchErr
      setAppointments(data || [])
    } catch (err) {
      logger.error('citas', err)
      setError('No se pudieron cargar las citas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filterStatus === 'all'
    ? appointments
    : appointments.filter((a) => a.status === filterStatus)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekAppts = appointments.filter((a) => {
    const d = new Date(a.starts_at)
    return d >= weekStart && d < weekEnd
  })

  function prevWeek() { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }) }
  function nextWeek() { setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }) }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5 md:space-y-2 flex items-baseline sm:block gap-3">
          <div className="hidden sm:block">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
              Agenda
            </p>
          </div>
          <h1
            className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Citas
            {!loading && appointments.length > 0 && (
              <span className="text-[var(--dash-primary)] text-xl md:text-2xl ml-2 md:ml-3" style={{ fontStyle: 'italic' }}>
                {appointments.length}
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Toggle vista */}
          <div className="flex bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-full p-1">
            <button
              onClick={() => setView('lista')}
              className={`
                px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-medium transition-all no-min-tap
                ${view === 'lista' ? 'bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary-soft)]' : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-soft)]'}
              `}
            >
              Lista
            </button>
            <button
              onClick={() => setView('calendario')}
              className={`
                px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-medium transition-all no-min-tap
                ${view === 'calendario' ? 'bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary-soft)]' : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-soft)]'}
              `}
            >
              <span className="hidden sm:inline">Calendario</span>
              <span className="sm:hidden">Cal</span>
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            aria-label="Nueva cita"
            className="flex items-center gap-2 text-sm font-semibold px-3 sm:px-5 py-2.5 sm:py-3 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ml-auto sm:ml-0"
            style={{
              background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-primary-deep))',
              color: 'var(--dash-ink)',
              boxShadow: '0 6px 24px -6px var(--dash-primary)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">Nueva cita</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      <Hairline />

      {/* Navegación semana */}
      {view === 'calendario' && (
        <div className="flex items-center gap-4">
          <button
            onClick={prevWeek}
            aria-label="Semana anterior"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--dash-text-muted)] hover:text-[var(--dash-primary)] hover:bg-[var(--dash-primary-bg-8)] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <p
            className="text-[var(--dash-text-soft)] text-sm"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {fmtDate(weekStart)} — {fmtDate(new Date(weekEnd.getTime() - 86400000))}
          </p>
          <button
            onClick={nextWeek}
            aria-label="Siguiente semana"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--dash-text-muted)] hover:text-[var(--dash-primary)] hover:bg-[var(--dash-primary-bg-8)] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--dash-text-muted)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="text-center">
            <p
              className="text-[var(--dash-text-soft)] text-sm italic"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {error}
            </p>
            <button onClick={load} className="text-[var(--dash-primary)] text-xs mt-2 link-gold">
              Reintentar
            </button>
          </div>
        </div>
      ) : view === 'lista' ? (
        <ListView
          appointments={filtered}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onEdit={setEditTarget}
          currency={currency}
        />
      ) : (
        <>
          {/* En mobile el calendario semanal (7 columnas + 13 horas) no cabe
              y fuerza scroll horizontal poco usable — mostramos la lista
              filtrada a la semana en su lugar. En desktop va el grid. */}
          <div className="md:hidden">
            <ListView
              appointments={weekAppts}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              onEdit={setEditTarget}
              currency={currency}
            />
          </div>
          <div className="hidden md:block">
            <CalendarView
              appointments={weekAppts}
              weekStart={weekStart}
              onEdit={setEditTarget}
            />
          </div>
        </>
      )}

      {showModal && (
        <NuevaCitaModal onClose={() => setShowModal(false)} onCreated={load} />
      )}

      {editTarget && (
        <EditarCitaModal
          appt={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { load(); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
