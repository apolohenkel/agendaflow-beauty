'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { STATUS_MAP } from '@/lib/status'
import { logger } from '@/lib/logger'
import KPICard from '@/components/ui/KPICard'
import Chip, { STATUS_TO_CHIP } from '@/components/ui/Chip'
import Hairline from '@/components/ui/Hairline'
import NuevaCitaModal from '@/components/dashboard/citas/NuevaCitaModal'

function AppointmentRow({ appt, isActive, birthdayIds }) {
  const chipVariant = STATUS_TO_CHIP[appt.status] || 'muted'
  const label = STATUS_MAP[appt.status]?.label || 'Pendiente'
  const isBirthday = appt.clients?.id && birthdayIds?.has(appt.clients.id)
  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className={`
        group flex items-center gap-4 px-6 py-4 transition-all duration-150
        hover:bg-[var(--dash-ink)]/60
        ${isActive ? 'bg-[var(--dash-primary-bg-8)]' : ''}
      `}
    >
      {/* Time rail — hora grande en Fraunces + minutos sub */}
      <div className="w-14 shrink-0 text-right">
        <p
          className="text-[var(--dash-text)] text-base leading-none tabular-nums"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
        >
          {fmt(appt.starts_at)}
        </p>
        <p className="text-[var(--dash-text-dim)] text-[10px] tabular-nums mt-1">
          hasta {fmt(appt.ends_at)}
        </p>
      </div>

      {/* Hairline vertical divisor */}
      <div className="self-stretch flex items-center">
        <div className="w-px h-10" style={{ background: isActive ? 'var(--dash-primary)' : 'var(--dash-border)' }} />
      </div>

      {/* Info cliente */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[var(--dash-text)] text-sm font-medium truncate">
            {appt.clients?.name || 'Cliente sin nombre'}
          </p>
          {isBirthday && (
            <span
              className="text-xs select-none"
              title="Cumpleaños hoy"
              aria-label="Cumpleaños"
            >
              ✦
            </span>
          )}
        </div>
        <p className="text-[var(--dash-text-muted)] text-xs truncate mt-0.5">
          {appt.services?.name || 'Servicio'}
          {appt.staff?.name ? <> <span className="text-[var(--dash-text-dim)]">·</span> {appt.staff.name}</> : ''}
        </p>
      </div>

      {/* Precio */}
      {appt.services?.price != null && (
        <p
          className="text-[var(--dash-primary-soft)] text-sm shrink-0 tabular-nums tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
        >
          Q{Number(appt.services.price).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      )}

      {/* Estado */}
      <Chip variant={chipVariant} size="sm">{label}</Chip>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()

  const [appointments, setAppointments] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [stats, setStats] = useState({ today: 0, clients: 0, nextTime: '—' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const day = new Date()
        const todayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString()
        const todayEnd   = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).toISOString()

        const mm = String(day.getMonth() + 1).padStart(2, '0')
        const dd = String(day.getDate()).padStart(2, '0')

        const [{ data: appts }, { count: clientCount }, { data: todayBdays }] = await Promise.all([
          supabase
            .from('appointments')
            .select(`
              id, starts_at, ends_at, status,
              clients(id, name, phone, birthday),
              services(name, duration_minutes, price),
              staff(name)
            `)
            .gte('starts_at', todayStart)
            .lt('starts_at', todayEnd)
            .order('starts_at'),
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase
            .from('clients')
            .select('id, name, phone, birthday')
            .not('birthday', 'is', null),
        ])

        const list = appts || []
        const nowRef = new Date()
        const upcoming = list.find((a) => new Date(a.starts_at) > nowRef)

        const bdayToday = (todayBdays || []).filter((c) => {
          if (!c.birthday) return false
          const b = String(c.birthday)
          return b.endsWith(`-${mm}-${dd}`) || b.slice(5) === `${mm}-${dd}`
        })
        setBirthdays(bdayToday)

        setAppointments(list)
        setStats({
          today: list.length,
          clients: clientCount || 0,
          nextTime: upcoming
            ? new Date(upcoming.starts_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
            : '—',
        })
      } catch (err) {
        logger.error('dashboard', err)
        setError('No se pudieron cargar los datos. Intenta recargar la página.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey, todayKey])

  const dateLabel = now.toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const hourLabel = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'

  const birthdayIdSet = new Set(birthdays.map((c) => c.id))
  const appointmentClientIds = new Set(appointments.map((a) => a.clients?.id).filter(Boolean))
  const birthdaysWithoutAppt = birthdays.filter((c) => !appointmentClientIds.has(c.id))

  return (
    <div className="min-h-screen p-10 space-y-10 animate-fade-up">

      {/* Header editorial */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]"
            suppressHydrationWarning
          >
            {dateLabel} · {hourLabel}
          </p>
          <h1
            className="text-[var(--dash-text)] text-[44px] font-light leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
            suppressHydrationWarning
          >
            {greeting}
            <span className="text-[var(--dash-primary)]">.</span>
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-primary-deep))',
            color: 'var(--dash-ink)',
            boxShadow: '0 6px 24px -6px var(--dash-primary), 0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva cita
        </button>
      </div>

      <Hairline />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-6">
        <KPICard
          label="Citas hoy"
          value={loading ? '—' : stats.today}
          unit="agendadas"
          sub={stats.today === 0 ? 'tu día está libre' : stats.today === 1 ? 'una sola cita' : `${stats.today} en total`}
          hero
          loading={loading}
        />
        <KPICard
          label="Clientes"
          value={loading ? '—' : stats.clients.toLocaleString('es-GT')}
          unit="registrados"
          sub="base de clientas"
          loading={loading}
        />
        <KPICard
          label="Próxima cita"
          value={loading ? '—' : stats.nextTime}
          sub={stats.nextTime !== '—' ? 'próximo turno' : 'sin más citas hoy'}
          loading={loading}
        />
      </div>

      {/* Cumpleaños sin cita */}
      {birthdaysWithoutAppt.length > 0 && (
        <div
          className="relative rounded-2xl p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--dash-primary-bg-15) 0%, var(--dash-ink-raised) 60%)',
            border: '1px solid var(--dash-border-hover)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-[var(--dash-primary)] text-lg select-none"
              aria-hidden
            >
              ✦
            </span>
            <p
              className="text-[var(--dash-primary-soft)] text-sm font-medium"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}
            >
              {birthdaysWithoutAppt.length === 1
                ? 'Hoy cumple años'
                : `Hoy cumplen años · ${birthdaysWithoutAppt.length}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {birthdaysWithoutAppt.map((c) => {
              const clean = String(c.phone || '').replace(/\D+/g, '')
              const wa = clean
                ? `https://wa.me/${clean}?text=${encodeURIComponent(`¡Feliz cumpleaños, ${c.name?.split(' ')[0] || ''}! ✦ Un abrazo de todo el equipo.`)}`
                : null
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-[var(--dash-ink)]/60 rounded-full pl-1.5 pr-3 py-1.5 border border-[var(--dash-border)]"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--dash-primary-bg-15)' }}
                  >
                    <span
                      className="text-[var(--dash-primary)] text-xs font-medium"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {c.name ? c.name[0].toUpperCase() : '?'}
                    </span>
                  </div>
                  <p className="text-[var(--dash-text)] text-sm">{c.name}</p>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#3DBA6E] hover:text-[#4BC97D] ml-1 link-gold"
                    >
                      Felicitar →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Agenda */}
      <section className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-baseline gap-3">
            <h2
              className="text-[var(--dash-text)] text-xl tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
            >
              Agenda de hoy
            </h2>
            {!loading && appointments.length > 0 && (
              <span
                className="text-[var(--dash-primary)] text-xs"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                · {appointments.length}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/citas"
            className="text-[var(--dash-text-muted)] hover:text-[var(--dash-primary)] text-xs transition-colors link-gold"
          >
            Ver todas →
          </Link>
        </div>

        <Hairline className="mx-6" />

        {/* Contenido */}
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
                onClick={() => setRefreshKey((k) => k + 1)}
                className="text-[var(--dash-primary)] text-xs mt-2 hover:underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
              </svg>
            </div>
            <div className="text-center max-w-xs">
              <p
                className="text-[var(--dash-text-soft)] text-base italic"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Tu día está despejado
              </p>
              <p className="text-[var(--dash-text-muted)] text-xs mt-1">
                Cuando alguien reserve, aparecerá aquí
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="text-[var(--dash-primary)] text-xs link-gold"
            >
              Crear cita manual →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--dash-border)]">
            {appointments.map((appt) => {
              const isActive =
                new Date(appt.starts_at) <= now && new Date(appt.ends_at) >= now
              return <AppointmentRow key={appt.id} appt={appt} isActive={isActive} birthdayIds={birthdayIdSet} />
            })}
          </div>
        )}
      </section>

      {showModal && (
        <NuevaCitaModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); setRefreshKey((k) => k + 1) }}
        />
      )}
    </div>
  )
}
