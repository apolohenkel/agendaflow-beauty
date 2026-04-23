'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Indicador de notificaciones. Navega a /dashboard/notificaciones —
// antes abría un drawer lateral que en mobile era poco usable/descubrible.
// Ahora: link normal con badge; funciona igual en desktop (sidebar) y
// mobile (top bar).
export default function NotificationBell() {
  const supabase = createClient()
  const pathname = usePathname()
  const [items, setItems]   = useState([])
  const [lastSeen, setLastSeen] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('notif_last_seen') || ''
    return ''
  })

  const load = useCallback(async () => {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    const { data } = await supabase
      .from('appointments')
      .select('id, starts_at, ends_at, status')
      .gte('starts_at', dayStart)
      .lt('starts_at', dayEnd)
      .in('status', ['pending', 'confirmed'])
      .order('starts_at')
    setItems(data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Refresca cada 2 minutos
  useEffect(() => {
    const t = setInterval(load, 120000)
    return () => clearInterval(t)
  }, [load])

  // Si el usuario ya está en /dashboard/notificaciones marcamos todo visto
  useEffect(() => {
    if (pathname === '/dashboard/notificaciones' && typeof window !== 'undefined') {
      const ts = new Date().toISOString()
      localStorage.setItem('notif_last_seen', ts)
      setLastSeen(ts)
    }
  }, [pathname])

  // Escuchar broadcast desde la página (cuando carga sus datos marca visto)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    let bc = null
    try {
      bc = new BroadcastChannel('af:notif')
      bc.onmessage = (e) => {
        if (e?.data?.type === 'seen') {
          const ts = new Date().toISOString()
          setLastSeen(ts)
        }
      }
    } catch {}
    return () => { try { bc?.close() } catch {} }
  }, [])

  const now = new Date()
  const active   = items.filter(a => new Date(a.starts_at) <= now && new Date(a.ends_at) >= now)
  const upcoming = items.filter(a => {
    const diff = (new Date(a.starts_at) - now) / 60000
    return diff > 0 && diff <= 60
  })
  const newCount = lastSeen
    ? items.filter(a => new Date(a.starts_at) > new Date(lastSeen)).length
    : items.length
  const badge = newCount + active.length + upcoming.length

  const isActive = pathname === '/dashboard/notificaciones'

  return (
    <Link
      href="/dashboard/notificaciones"
      aria-label={badge > 0 ? `Notificaciones (${badge})` : 'Notificaciones'}
      className={`relative w-auto md:w-full flex items-center gap-3 p-2 md:px-3 md:py-2.5 rounded-lg text-sm transition-all duration-150 group
        ${isActive
          ? 'md:bg-[var(--dash-border)] text-[var(--dash-text)]'
          : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-border)]'
        }`}
    >
      <span className="relative text-[var(--dash-text-dim)] group-hover:text-[var(--dash-text-soft)] transition-colors shrink-0">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Badge en mobile — flota arriba-derecha del icono */}
        {badge > 0 && (
          <span
            className="md:hidden absolute -top-1 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-[var(--dash-primary)] text-[var(--dash-ink)] text-[9px] font-bold rounded-full px-1"
            aria-hidden="true"
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="hidden md:inline font-medium">Notificaciones</span>
      {/* Badge en desktop — al final del row, junto al texto */}
      {badge > 0 && (
        <span
          className="hidden md:flex ml-auto min-w-[18px] h-[18px] items-center justify-center bg-[var(--dash-primary)] text-[var(--dash-ink)] text-[9px] font-bold rounded-full px-1"
          aria-hidden="true"
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  )
}
