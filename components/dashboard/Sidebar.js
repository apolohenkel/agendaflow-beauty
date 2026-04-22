'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import NotificationBell from '@/components/dashboard/NotificationBell'
import Hairline from '@/components/ui/Hairline'

// Grupos semánticos — cada grupo tiene un eyebrow small.
const navGroups = [
  {
    label: 'Operación',
    items: [
      {
        label: 'Panel',
        href: '/dashboard',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        label: 'Citas',
        href: '/dashboard/citas',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
          </svg>
        ),
      },
      {
        label: 'Clientes',
        href: '/dashboard/clientes',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="9" cy="7" r="4" />
            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      {
        label: 'Servicios',
        href: '/dashboard/servicios',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ),
      },
      {
        label: 'Personal',
        href: '/dashboard/personal',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.85" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: 'Promociones',
        href: '/dashboard/promociones',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        label: 'Reportes',
        href: '/dashboard/reportes',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },
      {
        label: 'WhatsApp',
        href: '/dashboard/whatsapp',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        label: 'Facturación',
        href: '/dashboard/billing',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <line x1="2" y1="11" x2="22" y2="11" />
            <line x1="6" y1="16" x2="10" y2="16" />
          </svg>
        ),
      },
      {
        label: 'Ajustes',
        href: '/dashboard/configuracion',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { business, user, whatsappConnected } = useOrg()
  const bizName = business?.name || 'Mi negocio'
  const userEmail = user?.email || ''

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside className="w-60 h-screen bg-[var(--dash-ink-raised)] flex flex-col shrink-0 relative">
      {/* Hairline dorado vertical en el borde derecho */}
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0 w-px"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--dash-hairline) 18%, var(--dash-hairline) 82%, transparent 100%)',
        }}
      />

      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-primary-deep))',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dash-ink)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4.5 20 L12 4 L19.5 20" /><path d="M7.8 13.8 C12 13 15 13.3 21 18.2" />
            </svg>
          </div>
          <div>
            <p
              className="text-[var(--dash-text)] text-[15px] font-medium tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              AgendaFlow
            </p>
            <p className="text-[var(--dash-text-muted)] text-[9px] tracking-[0.24em] uppercase mt-1.5">
              Beauty
            </p>
          </div>
        </Link>
      </div>

      <Hairline className="mx-5" />

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-5">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-6' : ''}>
            <p className="px-3 mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--dash-text-muted)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm
                      transition-all duration-200 group
                      ${isActive
                        ? 'text-[var(--dash-primary)]'
                        : 'text-[var(--dash-text-soft)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-ink)]/60'
                      }
                    `}
                  >
                    {/* Barra dorada vertical cuando activo */}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-[var(--dash-primary)]"
                        style={{ boxShadow: '0 0 8px var(--dash-primary)' }}
                      />
                    )}
                    {/* Bg sutil cuando activo */}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{ background: 'var(--dash-primary-bg-8)' }}
                      />
                    )}

                    <span className={`relative transition-colors ${isActive ? 'text-[var(--dash-primary)]' : 'text-[var(--dash-text-dim)] group-hover:text-[var(--dash-text-soft)]'}`}>
                      {item.icon}
                    </span>
                    <span className="relative font-medium tracking-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Notificaciones + WhatsApp */}
      <div className="px-3 space-y-2">
        <NotificationBell />

        <Link
          href="/dashboard/whatsapp"
          className="block px-3 py-2.5 rounded-xl bg-[var(--dash-ink)]/70 border border-[var(--dash-border)] hover:border-[var(--dash-border-hover)] transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              {whatsappConnected && (
                <span
                  aria-hidden
                  className="absolute inline-flex h-full w-full rounded-full bg-[#3DBA6E] opacity-60 animate-ping"
                />
              )}
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${whatsappConnected ? 'bg-[#3DBA6E]' : 'bg-[var(--dash-text-dim)]'}`}
              />
            </span>
            <p className={`text-[10px] font-medium tracking-wide ${whatsappConnected ? 'text-[#3DBA6E]' : 'text-[var(--dash-text-soft)]'}`}>
              {whatsappConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
            </p>
          </div>
          <p className="text-[var(--dash-text-muted)] text-[9px] mt-0.5 pl-3.5">
            {whatsappConnected ? 'Asistente activo' : 'Activa el asistente'}
          </p>
        </Link>
      </div>

      <Hairline className="mx-5 mt-3" />

      {/* User + Logout */}
      <div className="px-3 pt-3 pb-4">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
            style={{
              background: 'var(--dash-primary-bg-8)',
              borderColor: 'var(--dash-border-hover)',
            }}
          >
            <span
              className="text-[var(--dash-primary)] text-xs font-medium"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {(userEmail?.[0] ?? 'A').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--dash-text)] text-xs font-medium truncate">{userEmail || 'Admin'}</p>
            <p className="text-[var(--dash-text-muted)] text-[10px] truncate">{bizName}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="shrink-0 p-1.5 text-[var(--dash-text-dim)] hover:text-[var(--dash-danger)] hover:bg-[var(--dash-danger)]/10 rounded-lg transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
