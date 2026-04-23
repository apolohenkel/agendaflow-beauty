'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import Hairline from '@/components/ui/Hairline'

const STATUS_STYLES = {
  pending:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pendiente'  },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmada' },
  completed: { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400',     label: 'Completada' },
  cancelled: { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelada'  },
  no_show:   { bg: 'bg-zinc-500/10',    text: 'text-zinc-500',    dot: 'bg-zinc-500',    label: 'No asistió' },
}

function fmt(iso) {
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

export default function NotificacionesPage() {
  const supabase = createClient()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const now      = new Date()
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

      const { data, error: err } = await supabase
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

      if (err) throw err
      setItems(data || [])
      // Marcar como visto
      if (typeof window !== 'undefined') {
        localStorage.setItem('notif_last_seen', new Date().toISOString())
        // Notificar a otras pestañas/componentes que las notificaciones fueron vistas
        if ('BroadcastChannel' in window) {
          try { new BroadcastChannel('af:notif').postMessage({ type: 'seen' }) } catch {}
        }
      }
    } catch (err) {
      logger.error('notificaciones_page', err)
      setError('No pudimos cargar las notificaciones. Intenta de nuevo.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    const t = setInterval(() => load(true), 120000)
    return () => clearInterval(t)
  }, [load])

  const now = new Date()
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

  const total = active.length + upcoming.length + pending.length + later.length

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 max-w-3xl animate-fade-up">

      {/* Header */}
      <div className="space-y-1.5 md:space-y-2">
        <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
          Hoy
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1
            className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Notificaciones
            {!loading && total > 0 && (
              <span className="text-[var(--dash-primary)] text-xl md:text-2xl ml-2 md:ml-3" style={{ fontStyle: 'italic' }}>
                {total}
              </span>
            )}
          </h1>
          <button
            onClick={() => load(true)}
            disabled={loading || refreshing}
            aria-label="Actualizar"
            className="shrink-0 p-2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] rounded-lg transition-colors disabled:opacity-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={refreshing ? 'animate-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
        <p className="text-[var(--dash-text-muted)] text-sm">
          Citas activas y próximas de hoy
        </p>
      </div>

      <Hairline />

      {/* Estado */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--dash-text-muted)" strokeWidth="1.2" strokeLinecap="round">
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
            <button
              onClick={() => load()}
              className="text-[var(--dash-primary)] text-xs mt-2 link-gold"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="text-center max-w-xs">
            <p
              className="text-[var(--dash-text-soft)] text-base italic"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Sin notificaciones por ahora
            </p>
            <p className="text-[var(--dash-text-muted)] text-xs mt-1">
              Aquí verás citas que requieran tu atención hoy
            </p>
          </div>
          <Link
            href="/dashboard/citas"
            className="text-[var(--dash-primary)] text-xs link-gold"
          >
            Ver todas las citas →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <Group label="En curso ahora" accent="text-[var(--dash-primary)]">
              {active.map(a => <AppointmentCard key={a.id} appt={a} highlight />)}
            </Group>
          )}

          {upcoming.length > 0 && (
            <Group label="Próximas — en menos de 1 hora" accent="text-emerald-400">
              {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </Group>
          )}

          {pending.length > 0 && (
            <Group label="Sin confirmar" accent="text-amber-400">
              {pending.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </Group>
          )}

          {later.length > 0 && (
            <Group label="Resto del día" accent="text-[var(--dash-text-muted)]">
              {later.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ label, accent = 'text-[var(--dash-text-muted)]', children }) {
  return (
    <section className="space-y-2.5">
      <p className={`text-[10px] uppercase tracking-[0.22em] font-medium ${accent}`}>
        {label}
      </p>
      <div className="space-y-2">
        {children}
      </div>
    </section>
  )
}

function AppointmentCard({ appt, highlight = false }) {
  const s = STATUS_STYLES[appt.status] || STATUS_STYLES.pending
  const clean = String(appt.clients?.phone || '').replace(/\D+/g, '')
  const waLink = clean
    ? `https://wa.me/${clean}?text=${encodeURIComponent(`Hola ${appt.clients?.name?.split(' ')[0] || ''}, te escribo del salón para confirmar tu cita de hoy a las ${fmt(appt.starts_at)}. ¿Confirmas?`)}`
    : null

  return (
    <div
      className={`
        rounded-2xl p-4 sm:p-5 space-y-3 transition-all
        ${highlight
          ? 'bg-[var(--dash-primary-bg-8)] border border-[var(--dash-primary)]/30'
          : 'bg-[var(--dash-ink-raised)] border border-[var(--dash-border)]'
        }
      `}
    >
      {/* Fila principal: cliente + hora */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[var(--dash-text)] text-sm sm:text-base font-medium truncate">
            {appt.clients?.name || 'Cliente sin nombre'}
          </p>
          <p className="text-[var(--dash-text-muted)] text-xs mt-0.5 truncate">
            {appt.services?.name || 'Sin servicio'}
            {appt.staff?.name ? ` · ${appt.staff.name}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className="text-[var(--dash-text)] text-base tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {fmt(appt.starts_at)}
          </p>
          <p className="text-[var(--dash-text-dim)] text-[10px] tabular-nums mt-1">
            hasta {fmt(appt.ends_at)}
          </p>
        </div>
      </div>

      {/* Notas */}
      {appt.notes && (
        <p className="text-xs italic bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-lg px-3 py-2 text-[var(--dash-text-soft)]">
          &ldquo;{appt.notes}&rdquo;
        </p>
      )}

      {/* Footer: status + acciones */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>

        <div className="flex items-center gap-2">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-[#3DBA6E] hover:text-[#4BC97D] transition-colors"
            >
              WhatsApp →
            </a>
          )}
          <Link
            href="/dashboard/citas"
            className="text-[11px] font-medium text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] transition-colors"
          >
            Ver cita
          </Link>
        </div>
      </div>
    </div>
  )
}
