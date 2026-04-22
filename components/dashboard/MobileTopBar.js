'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import NotificationBell from '@/components/dashboard/NotificationBell'

// Barra superior sólo visible en mobile (< md).
// Contiene: logo + nombre + notificaciones + logout.
// El nav principal vive abajo (MobileBottomNav).

export default function MobileTopBar() {
  const router = useRouter()
  const { business, user, whatsappConnected } = useOrg()
  const bizName = business?.name || 'Mi negocio'
  const userEmail = user?.email || ''

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <header className="md:hidden sticky top-0 z-30 bg-[var(--dash-ink-raised)]/95 backdrop-blur-sm border-b border-[var(--dash-border)]">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-primary-deep))',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dash-ink)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4.5 20 L12 4 L19.5 20" /><path d="M7.8 13.8 C12 13 15 13.3 21 18.2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p
              className="text-[var(--dash-text)] text-sm font-medium tracking-tight leading-none truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              AgendaFlow
            </p>
            <p className="text-[var(--dash-text-muted)] text-[9px] uppercase tracking-[0.2em] mt-0.5 truncate">
              {bizName}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1 shrink-0">
          {whatsappConnected && (
            <span className="relative flex h-2 w-2 mr-1" title="WhatsApp conectado">
              <span aria-hidden className="absolute inline-flex h-full w-full rounded-full bg-[#3DBA6E] opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3DBA6E]" />
            </span>
          )}
          <NotificationBell />
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="shrink-0 p-2 text-[var(--dash-text-dim)] hover:text-[var(--dash-danger)] rounded-lg transition-all"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      {/* Email micro */}
      {userEmail && (
        <p className="px-4 pb-2 text-[10px] text-[var(--dash-text-muted)] truncate">
          {userEmail}
        </p>
      )}
    </header>
  )
}
