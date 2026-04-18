'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/lib/org-context'
import NuevaCitaModal from '@/components/dashboard/citas/NuevaCitaModal'

const STATUS_MAP = {
  pending:     { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pendiente'  },
  confirmed:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmada' },
  completed:   { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400',     label: 'Completada' },
  cancelled:   { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelada'  },
  no_show:     { bg: 'bg-zinc-500/10',    text: 'text-zinc-500',    dot: 'bg-zinc-500',    label: 'No asistió' },
  rescheduled: { bg: 'bg-purple-500/10',  text: 'text-purple-400',  dot: 'bg-purple-400',  label: 'Reprogramada'},
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)

function fmt(iso) {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(date) {
  return date.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── MODAL EDITAR CITA ────────────────────────────────────────────────────────
function EditarCitaModal({ appt, onClose, onSaved }) {
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
      const startsAt = new Date(`${form.date}T${form.time}:00`)
      const endsAt   = new Date(startsAt.getTime() + duration * 60000)
      const { error: err } = await supabase.from('appointments').update({
        starts_at:  startsAt.toISOString(),
        ends_at:    endsAt.toISOString(),
        service_id: form.serviceId || null,
        staff_id:   form.staffId   || null,
        status:     form.status,
        notes:      form.notes.trim() || null,
      }).eq('id', appt.id)
      if (err) throw err
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
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A]">
          <div>
            <h2 className="text-[#F0EBE3] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
              Editar cita
            </h2>
            <p className="text-[#888] text-xs mt-0.5">{appt.clients?.name || 'Cliente'}</p>
          </div>
          <button onClick={onClose} className="text-[#444] hover:text-[#888] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Fecha *</p>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Hora *</p>
                <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors" />
              </div>
            </div>

            {/* Servicio y Staff */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Servicio</p>
                <select value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors appearance-none"
                  style={{ color: form.serviceId ? '#E8E3DC' : '#333' }}>
                  <option value="">Sin asignar</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id} style={{ color: '#E8E3DC', background: '#111' }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Colaborador</p>
                <select value={form.staffId} onChange={(e) => set('staffId', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors appearance-none"
                  style={{ color: form.staffId ? '#E8E3DC' : '#333' }}>
                  <option value="">Cualquiera</option>
                  {staff.map((m) => (
                    <option key={m.id} value={m.id} style={{ color: '#E8E3DC', background: '#111' }}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1">
              <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Estado</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((st) => {
                  const s = STATUS_MAP[st]
                  return (
                    <button key={st} type="button" onClick={() => set('status', st)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        form.status === st ? `${s.bg} ${s.text} border-current/30` : 'text-[#555] border-[#1E1E1E] hover:border-[#333]'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Notas</p>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                placeholder="Indicaciones especiales..."
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors resize-none" />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={handleCancel} disabled={loading || appt.status === 'cancelled'}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                Cancelar cita
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] transition-all disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending
  return (
    <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ─── VISTA LISTA ─────────────────────────────────────────────────────────────
function ListView({ appointments, onStatusChange, filterStatus, setFilterStatus, onEdit }) {
  return (
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
      {/* Filtros */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#161616] flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterStatus === 'all' ? 'bg-[#C8A96E]/15 text-[#C8A96E] border border-[#C8A96E]/30' : 'text-[#555] border border-[#1E1E1E] hover:border-[#333]'}`}
        >
          Todas
        </button>
        {STATUS_OPTIONS.map((st) => {
          const s = STATUS_MAP[st]
          return (
            <button key={st} onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterStatus === st ? `${s.bg} ${s.text} border border-current/30` : 'text-[#555] border border-[#1E1E1E] hover:border-[#333]'}`}>
              {s.label}
            </button>
          )
        })}
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#1C1C1C] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E2E2E" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
          </div>
          <p className="text-[#777] text-sm">Sin citas para este filtro</p>
        </div>
      ) : (
        <div className="divide-y divide-[#111]">
          {appointments.map((appt) => (
            <div key={appt.id} className="flex items-center gap-5 px-6 py-4 hover:bg-[#111] transition-colors group">
              {/* Fecha y hora */}
              <div className="w-24 shrink-0">
                <p className="text-[#888] text-[10px] uppercase tracking-wider">
                  {new Date(appt.starts_at).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[#E8E3DC] text-sm font-medium tabular-nums">{fmt(appt.starts_at)}</p>
                <p className="text-[#666] text-xs tabular-nums">{fmt(appt.ends_at)}</p>
              </div>

              {/* Cliente */}
              <div className="flex-1 min-w-0">
                <p className="text-[#E8E3DC] text-sm font-medium truncate">{appt.clients?.name || '—'}</p>
                <p className="text-[#888] text-xs truncate mt-0.5">
                  {appt.clients?.phone || ''}
                  {appt.services?.name ? ` · ${appt.services.name}` : ''}
                  {appt.staff?.name    ? ` · ${appt.staff.name}`    : ''}
                </p>
              </div>

              {/* Precio */}
              {appt.services?.price != null && (
                <p className="text-[#C8A96E] text-sm font-medium shrink-0 tabular-nums">
                  Q{Number(appt.services.price).toFixed(2)}
                </p>
              )}

              {/* Estado */}
              <StatusBadge status={appt.status} />

              {/* Botón editar — aparece al hover */}
              <button
                onClick={() => onEdit(appt)}
                className="shrink-0 opacity-0 group-hover:opacity-100 p-2 text-[#444] hover:text-[#C8A96E] hover:bg-[#C8A96E]/10 rounded-lg transition-all"
                title="Editar cita"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          ))}
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
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
      {/* Cabecera días */}
      <div className="grid grid-cols-8 border-b border-[#161616]">
        <div className="px-3 py-3 border-r border-[#161616]" />
        {days.map((day, i) => {
          const isToday =
            day.getDate()     === today.getDate()     &&
            day.getMonth()    === today.getMonth()    &&
            day.getFullYear() === today.getFullYear()
          return (
            <div key={i} className={`px-2 py-3 text-center border-r border-[#161616] last:border-r-0 ${isToday ? 'bg-[#C8A96E]/5' : ''}`}>
              <p className={`text-[10px] uppercase tracking-wider ${isToday ? 'text-[#C8A96E]' : 'text-[#444]'}`}>
                {day.toLocaleDateString('es-GT', { weekday: 'short' })}
              </p>
              <p className={`text-sm font-medium mt-0.5 ${isToday ? 'text-[#C8A96E]' : 'text-[#888]'}`}>
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Grid de horas */}
      <div className="overflow-auto max-h-[500px]">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-[#111] min-h-[56px]">
            <div className="px-3 py-2 border-r border-[#161616] flex items-start justify-end">
              <span className="text-[#666] text-[10px] tabular-nums">{hour.toString().padStart(2, '0')}:00</span>
            </div>
            {days.map((day, di) => {
              const dayAppts = getAppts(day).filter((a) => new Date(a.starts_at).getHours() === hour)
              return (
                <div key={di} className="border-r border-[#111] last:border-r-0 p-1 space-y-1">
                  {dayAppts.map((appt) => {
                    const s = STATUS_MAP[appt.status] || STATUS_MAP.pending
                    return (
                      <button
                        key={appt.id}
                        onClick={() => onEdit(appt)}
                        className={`w-full ${s.bg} rounded-lg px-2 py-1.5 text-left hover:brightness-110 transition-all`}
                      >
                        <p className={`text-[10px] font-semibold ${s.text} truncate`}>{fmt(appt.starts_at)}</p>
                        <p className="text-[#888] text-[9px] truncate">{appt.clients?.name || '—'}</p>
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
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function CitasPage() {
  const [view, setView]               = useState('lista')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]         = useState(true)
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
    const { data } = await supabase
      .from('appointments')
      .select(`
        id, starts_at, ends_at, status, notes, source,
        service_id, staff_id,
        clients(name, phone),
        services(name, duration_minutes, price),
        staff(name)
      `)
      .order('starts_at', { ascending: false })
    setAppointments(data || [])
    setLoading(false)
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
    <div className="min-h-screen bg-[#080808] p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Citas
          </h1>
          <p className="text-[#777] text-xs mt-1">
            {loading ? '...' : `${appointments.length} citas en total`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle vista */}
          <div className="flex bg-[#111] border border-[#1E1E1E] rounded-xl p-1">
            <button onClick={() => setView('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'lista' ? 'bg-[#1E1E1E] text-[#E8E3DC]' : 'text-[#444] hover:text-[#888]'}`}>
              Lista
            </button>
            <button onClick={() => setView('calendario')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'calendario' ? 'bg-[#1E1E1E] text-[#E8E3DC]' : 'text-[#444] hover:text-[#888]'}`}>
              Calendario
            </button>
          </div>

          {/* Nueva cita */}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva cita
          </button>
        </div>
      </div>

      {/* Navegación semana */}
      {view === 'calendario' && (
        <div className="flex items-center gap-4">
          <button onClick={prevWeek} className="text-[#555] hover:text-[#888] transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <p className="text-[#C8C3BC] text-sm font-medium">
            {fmtDate(weekStart)} — {fmtDate(new Date(weekEnd.getTime() - 86400000))}
          </p>
          <button onClick={nextWeek} className="text-[#555] hover:text-[#888] transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
        </div>
      ) : view === 'lista' ? (
        <ListView
          appointments={filtered}
          onStatusChange={load}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onEdit={setEditTarget}
        />
      ) : (
        <CalendarView
          appointments={weekAppts}
          weekStart={weekStart}
          onEdit={setEditTarget}
        />
      )}

      {/* Modal nueva cita */}
      {showModal && (
        <NuevaCitaModal onClose={() => setShowModal(false)} onCreated={load} />
      )}

      {/* Modal editar cita */}
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
