'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUS_MAP = {
  pending:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pendiente'  },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmada' },
  completed: { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400',     label: 'Completada' },
  cancelled: { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelada'  },
  no_show:   { bg: 'bg-zinc-500/10',    text: 'text-zinc-500',    dot: 'bg-zinc-500',    label: 'No asistió' },
}

function fmt(iso) {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

export default function NotificationBell() {
  const supabase = createClient()
  const [open, setOpen]           = useState(false)
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastSeen, setLastSeen]   = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('notif_last_seen') || ''
    return ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    const now      = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    const { data } = await supabase
      .from('appointments')
      .select(`
        id, starts_at, ends_at, status, notes,
        clients(name, phone),
        services(name, price),
        staff(name)
      `)
      .gte('starts_at', dayStart)
      .lt('starts_at', dayEnd)
      .in('status', ['pending', 'confirmed'])
      .order('starts_at')

    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Refresca cada 2 minutos
  useEffect(() => {
    const t = setInterval(load, 120000)
    return () => clearInterval(t)
  }, [load])

  function markSeen() {
    const ts = new Date().toISOString()
    setLastSeen(ts)
    localStorage.setItem('notif_last_seen', ts)
  }

  function handleOpen() {
    setOpen(true)
    markSeen()
  }

  const now = new Date()

  // Clasificar citas
  const active    = items.filter(a => new Date(a.starts_at) <= now && new Date(a.ends_at) >= now)
  const upcoming  = items.filter(a => {
    const diff = (new Date(a.starts_at) - now) / 60000
    return diff > 0 && diff <= 60
  })
  const pending   = items.filter(a => a.status === 'pending' && new Date(a.starts_at) > now)
  const later     = items.filter(a => {
    const diff = (new Date(a.starts_at) - now) / 60000
    return diff > 60
  })

  // Nuevas desde la última vez visto
  const newCount = lastSeen
    ? items.filter(a => new Date(a.starts_at) > new Date(lastSeen)).length
    : items.length

  const badge = newCount + active.length + upcoming.length

  return (
    <>
      {/* Campana */}
      <button
        onClick={handleOpen}
        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-[#525252] hover:text-[var(--dash-text)] hover:bg-[var(--dash-border)] group"
      >
        <span className="text-[#383838] group-hover:text-[#686460] transition-colors">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        <span className="font-medium">Notificaciones</span>
        {badge > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--dash-primary)] text-[var(--dash-ink)] text-[9px] font-bold rounded-full px-1">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {/* Panel lateral */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-80 z-50 bg-[var(--dash-ink-raised)] border-l border-[var(--dash-border)] flex flex-col shadow-2xl shadow-black/60">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-[var(--dash-border)]">
              <div>
                <h2 className="text-[var(--dash-text)] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
                  Notificaciones
                </h2>
                <p className="text-[#383430] text-[10px] mt-0.5">Citas activas y próximas de hoy</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--dash-text-dim)] hover:text-[var(--dash-text-muted)] transition-colors p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 px-5 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--dash-ink-sunken)] border border-[#1C1C1C] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E2E2E" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <p className="text-[#383430] text-sm">Sin citas pendientes hoy</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--dash-ink-sunken)]">

                  {/* En curso ahora */}
                  {active.length > 0 && (
                    <NotifGroup label="En curso ahora" accent="text-[var(--dash-primary)]">
                      {active.map(a => <NotifCard key={a.id} appt={a} highlight />)}
                    </NotifGroup>
                  )}

                  {/* Próximas 1h */}
                  {upcoming.length > 0 && (
                    <NotifGroup label="Próximas — en menos de 1 hora" accent="text-emerald-400">
                      {upcoming.map(a => <NotifCard key={a.id} appt={a} />)}
                    </NotifGroup>
                  )}

                  {/* Pendientes de confirmar */}
                  {pending.length > 0 && (
                    <NotifGroup label="Sin confirmar" accent="text-amber-400">
                      {pending.map(a => <NotifCard key={a.id} appt={a} />)}
                    </NotifGroup>
                  )}

                  {/* Resto del día */}
                  {later.length > 0 && (
                    <NotifGroup label="Resto del día">
                      {later.map(a => <NotifCard key={a.id} appt={a} />)}
                    </NotifGroup>
                  )}

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[var(--dash-border)]">
              <button
                onClick={() => { load(); markSeen() }}
                className="w-full text-center text-[var(--dash-text-dim)] hover:text-[var(--dash-text-muted)] text-xs transition-colors py-1"
              >
                Actualizar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── SUB-COMPONENTES ──────────────────────────────────────────────────────────
function NotifGroup({ label, accent = 'text-[var(--dash-text-dim)]', children }) {
  return (
    <div>
      <p className={`px-5 pt-4 pb-2 text-[10px] uppercase tracking-widest font-medium ${accent}`}>
        {label}
      </p>
      {children}
    </div>
  )
}

function NotifCard({ appt, highlight = false }) {
  const s = STATUS_MAP[appt.status] || STATUS_MAP.pending
  return (
    <div className={`px-5 py-3.5 hover:bg-[var(--dash-ink-sunken)] transition-colors ${highlight ? 'border-l-2 border-[var(--dash-primary)]' : 'border-l-2 border-transparent'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[var(--dash-text)] text-sm font-medium truncate">
            {appt.clients?.name || '—'}
          </p>
          <p className="text-[var(--dash-text-dim)] text-xs mt-0.5 truncate">
            {appt.services?.name || 'Sin servicio'}
            {appt.staff?.name ? ` · ${appt.staff.name}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[var(--dash-text-muted)] text-xs tabular-nums">{fmt(appt.starts_at)}</p>
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${s.bg} ${s.text}`}>
            <span className={`w-1 h-1 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      </div>
    </div>
  )
}
