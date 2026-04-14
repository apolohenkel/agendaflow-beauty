'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import NuevaCitaModal from '@/components/dashboard/citas/NuevaCitaModal'

const STATUS_MAP = {
  pending:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pendiente'  },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmada' },
  completed: { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400',     label: 'Completada' },
  cancelled: { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelada'  },
  no_show:   { bg: 'bg-zinc-500/10',    text: 'text-zinc-500',    dot: 'bg-zinc-500',    label: 'No asistió' },
}

function StatCard({ label, value, sub, gold = false }) {
  return (
    <div className="bg-[#0F0F0F] border border-[#1C1C1C] rounded-2xl p-6 flex flex-col gap-2 hover:border-[#2A2A2A] transition-colors">
      <p className="text-[#444] text-[10px] uppercase tracking-[0.18em] font-medium">{label}</p>
      <p
        className={`text-4xl font-light leading-none ${gold ? 'text-[#C8A96E]' : 'text-[#F0EBE3]'}`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
      {sub && <p className="text-[#383430] text-xs mt-1">{sub}</p>}
    </div>
  )
}

function AppointmentRow({ appt, isActive }) {
  const status = STATUS_MAP[appt.status] || STATUS_MAP.pending
  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className={`group flex items-center gap-5 px-6 py-4 hover:bg-[#111] transition-all duration-150 ${
        isActive ? 'border-l-2 border-[#C8A96E] pl-[22px]' : 'border-l-2 border-transparent'
      }`}
    >
      {/* Hora */}
      <div className="w-16 shrink-0 text-right">
        <p className="text-[#E8E3DC] text-sm font-medium tabular-nums">{fmt(appt.starts_at)}</p>
        <p className="text-[#2E2E2E] text-xs tabular-nums">{fmt(appt.ends_at)}</p>
      </div>

      {/* Línea de tiempo */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <div className="w-px h-3 bg-[#1E1E1E]" />
        <div className={`w-2 h-2 rounded-full border ${isActive ? 'border-[#C8A96E] bg-[#C8A96E]/30' : 'border-[#2E2E2E] bg-[#1A1A1A]'}`} />
        <div className="w-px h-3 bg-[#1E1E1E]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[#E8E3DC] text-sm font-medium truncate">
          {appt.clients?.name || 'Cliente sin nombre'}
        </p>
        <p className="text-[#444] text-xs truncate mt-0.5">
          {appt.services?.name || 'Servicio'}
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
      <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([])
  const [stats, setStats] = useState({ today: 0, clients: 0, nextTime: '—' })
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

      const [{ data: appts }, { count: clientCount }] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            id, starts_at, ends_at, status,
            clients(name, phone),
            services(name, duration_minutes, price),
            staff(name)
          `)
          .gte('starts_at', todayStart)
          .lt('starts_at', todayEnd)
          .order('starts_at'),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
      ])

      const list = appts || []
      const upcoming = list.find((a) => new Date(a.starts_at) > now)

      setAppointments(list)
      setStats({
        today: list.length,
        clients: clientCount || 0,
        nextTime: upcoming
          ? new Date(upcoming.starts_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
          : '—',
      })
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const dateLabel = now.toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const hourLabel = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })

  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="min-h-screen bg-[#080808] p-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#383430] text-[10px] uppercase tracking-[0.2em] mb-2" suppressHydrationWarning>
            {dateLabel} · {hourLabel}
          </p>
          <h1
            className="text-[#F0EBE3] text-4xl font-light"
            style={{ fontFamily: 'var(--font-display)' }}
            suppressHydrationWarning
          >
            {greeting}
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] active:scale-[0.98] text-[#080808] text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 shadow-lg shadow-[#C8A96E]/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva cita
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Citas hoy"
          value={loading ? '—' : stats.today}
          sub="agendadas para hoy"
          gold
        />
        <StatCard
          label="Clientes"
          value={loading ? '—' : stats.clients}
          sub="registrados en total"
        />
        <StatCard
          label="Próxima cita"
          value={loading ? '—' : stats.nextTime}
          sub={stats.nextTime !== '—' ? 'próximo turno' : 'sin más citas hoy'}
        />
      </div>

      {/* Agenda */}
      <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">

        {/* Header de la tabla */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#161616]">
          <div className="flex items-center gap-3">
            <h2
              className="text-[#D4CFC8] text-base font-light"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Agenda de hoy
            </h2>
            {!loading && appointments.length > 0 && (
              <span className="bg-[#C8A96E]/10 text-[#C8A96E] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {appointments.length}
              </span>
            )}
          </div>
          <Link href="/dashboard/citas" className="text-[#383430] hover:text-[#686460] text-xs transition-colors">
            Ver todas →
          </Link>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#1C1C1C] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E2E2E" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[#383430] text-sm">Sin citas para hoy</p>
              <p className="text-[#222] text-xs mt-1">Las citas agendadas aparecerán aquí</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#111]">
            {appointments.map((appt) => {
              const isActive =
                new Date(appt.starts_at) <= now && new Date(appt.ends_at) >= now
              return <AppointmentRow key={appt.id} appt={appt} isActive={isActive} />
            })}
          </div>
        )}
      </div>

      {showModal && (
        <NuevaCitaModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); setRefreshKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}
