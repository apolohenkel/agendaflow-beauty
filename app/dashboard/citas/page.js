'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import NuevaCitaModal from '@/components/dashboard/citas/NuevaCitaModal'

const STATUS_MAP = {
  pending:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pendiente'  },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmada' },
  completed: { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400',     label: 'Completada' },
  cancelled: { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelada'  },
  no_show:   { bg: 'bg-zinc-500/10',    text: 'text-zinc-500',    dot: 'bg-zinc-500',    label: 'No asistió' },
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7am - 7pm

function fmt(iso, opts) {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', ...opts })
}

function fmtDate(date) {
  return date.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── STATUS BADGE con cambio de estado ───────────────────────────────────────
function StatusBadge({ apptId, status, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const s = STATUS_MAP[status] || STATUS_MAP.pending

  async function changeStatus(newStatus) {
    setOpen(false)
    await supabase.from('appointments').update({ status: newStatus }).eq('id', apptId)
    onChange()
  }

  function handleOpen(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    })
    setOpen((v) => !v)
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text} hover:opacity-80 transition-opacity`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl shadow-black overflow-hidden w-36"
            style={{ top: pos.top, right: pos.right }}
          >
            {STATUS_OPTIONS.map((st) => {
              const opt = STATUS_MAP[st]
              return (
                <button
                  key={st}
                  onClick={() => changeStatus(st)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-[#242424] transition-colors ${st === status ? opt.text : 'text-[#888]'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── VISTA LISTA ─────────────────────────────────────────────────────────────
function ListView({ appointments, onStatusChange, filterStatus, setFilterStatus }) {
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
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterStatus === st ? `${s.bg} ${s.text} border border-current/30` : 'text-[#555] border border-[#1E1E1E] hover:border-[#333]'}`}
            >
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
          <p className="text-[#383430] text-sm">Sin citas para este filtro</p>
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
                <p className="text-[#333] text-xs tabular-nums">{fmt(appt.ends_at)}</p>
              </div>

              {/* Cliente */}
              <div className="flex-1 min-w-0">
                <p className="text-[#E8E3DC] text-sm font-medium truncate">{appt.clients?.name || '—'}</p>
                <p className="text-[#444] text-xs truncate mt-0.5">
                  {appt.clients?.phone || ''}
                  {appt.services?.name ? ` · ${appt.services.name}` : ''}
                  {appt.staff?.name ? ` · ${appt.staff.name}` : ''}
                </p>
              </div>

              {/* Precio */}
              {appt.services?.price != null && (
                <p className="text-[#C8A96E] text-sm font-medium shrink-0 tabular-nums">
                  Q{Number(appt.services.price).toFixed(2)}
                </p>
              )}

              {/* Estado */}
              <StatusBadge apptId={appt.id} status={appt.status} onChange={onStatusChange} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── VISTA CALENDARIO ────────────────────────────────────────────────────────
function CalendarView({ appointments, weekStart }) {
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
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
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
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
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
            {/* Hora */}
            <div className="px-3 py-2 border-r border-[#161616] flex items-start justify-end">
              <span className="text-[#333] text-[10px] tabular-nums">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
            {/* Slots por día */}
            {days.map((day, di) => {
              const dayAppts = getAppts(day).filter((a) => {
                const h = new Date(a.starts_at).getHours()
                return h === hour
              })
              return (
                <div key={di} className="border-r border-[#111] last:border-r-0 p-1 space-y-1">
                  {dayAppts.map((appt) => {
                    const s = STATUS_MAP[appt.status] || STATUS_MAP.pending
                    return (
                      <div
                        key={appt.id}
                        className={`${s.bg} rounded-lg px-2 py-1.5 cursor-default`}
                      >
                        <p className={`text-[10px] font-semibold ${s.text} truncate`}>
                          {fmt(appt.starts_at)}
                        </p>
                        <p className="text-[#888] text-[9px] truncate">{appt.clients?.name || '—'}</p>
                      </div>
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
  const [view, setView] = useState('lista')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1) // Lunes de esta semana
    d.setHours(0, 0, 0, 0)
    return d
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select(`
        id, starts_at, ends_at, status, notes, source,
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

  function prevWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }

  function nextWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }

  return (
    <div className="min-h-screen bg-[#080808] p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Citas
          </h1>
          <p className="text-[#383430] text-xs mt-1">
            {loading ? '...' : `${appointments.length} citas en total`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle vista */}
          <div className="flex bg-[#111] border border-[#1E1E1E] rounded-xl p-1">
            <button
              onClick={() => setView('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'lista' ? 'bg-[#1E1E1E] text-[#E8E3DC]' : 'text-[#444] hover:text-[#888]'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setView('calendario')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'calendario' ? 'bg-[#1E1E1E] text-[#E8E3DC]' : 'text-[#444] hover:text-[#888]'}`}
            >
              Calendario
            </button>
          </div>

          {/* Nueva cita */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva cita
          </button>
        </div>
      </div>

      {/* Navegación semana (solo en calendario) */}
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
        />
      ) : (
        <CalendarView appointments={weekAppts} weekStart={weekStart} />
      )}

      {/* Modal */}
      {showModal && (
        <NuevaCitaModal
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
