'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// Bottom nav fija visible sólo en mobile (< md).
// 4 items primarios directos + botón "Más" que abre un menú con el resto.

const PRIMARY = [
  {
    label: 'Panel',
    href: '/dashboard',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      </svg>
    ),
  },
  {
    label: 'Servicios',
    href: '/dashboard/servicios',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
]

const OVERFLOW = [
  { label: 'Personal',      href: '/dashboard/personal' },
  { label: 'Promociones',   href: '/dashboard/promociones' },
  { label: 'Reportes',      href: '/dashboard/reportes' },
  { label: 'WhatsApp',      href: '/dashboard/whatsapp' },
  { label: 'Facturación',   href: '/dashboard/billing' },
  { label: 'Ajustes',       href: '/dashboard/configuracion' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [overflowOpen, setOverflowOpen] = useState(false)

  const isInOverflow = OVERFLOW.some((i) => pathname === i.href || pathname.startsWith(i.href + '/'))

  return (
    <>
      {/* Bottom sheet overflow */}
      {overflowOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 scrim-glass animate-scrim-in"
            onClick={() => setOverflowOpen(false)}
          />
          <div
            className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-[var(--dash-ink-raised)] rounded-t-3xl pb-safe animate-modal-in"
            style={{ borderTop: '1px solid var(--dash-primary)/30' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[var(--dash-text-dim)]" />
            </div>
            <div className="px-4 pt-2 pb-6 grid grid-cols-3 gap-2">
              {OVERFLOW.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOverflowOpen(false)}
                    className={`
                      flex flex-col items-center gap-1 py-4 px-2 rounded-2xl transition-all
                      ${active
                        ? 'bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary)]'
                        : 'text-[var(--dash-text-soft)] active:bg-[var(--dash-ink)]'
                      }
                    `}
                  >
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 bg-[var(--dash-ink-raised)]/95 backdrop-blur-sm border-t border-[var(--dash-border)] pb-safe"
        aria-label="Navegación principal"
      >
        <div className="grid grid-cols-5">
          {PRIMARY.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 py-2.5 px-1 transition-colors no-min-tap
                  ${active
                    ? 'text-[var(--dash-primary)]'
                    : 'text-[var(--dash-text-muted)] active:text-[var(--dash-text-soft)]'
                  }
                `}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 w-8 h-0.5 rounded-b-full bg-[var(--dash-primary)]"
                    style={{ boxShadow: '0 0 8px var(--dash-primary)' }}
                  />
                )}
                <span>{item.icon}</span>
                <span className="text-[10px] font-medium tracking-tight leading-none">{item.label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setOverflowOpen(true)}
            className={`
              flex flex-col items-center gap-1 py-2.5 px-1 transition-colors no-min-tap
              ${isInOverflow ? 'text-[var(--dash-primary)]' : 'text-[var(--dash-text-muted)] active:text-[var(--dash-text-soft)]'}
            `}
            aria-label="Más opciones"
          >
            {isInOverflow && (
              <span
                aria-hidden
                className="absolute top-0 w-8 h-0.5 rounded-b-full bg-[var(--dash-primary)]"
                style={{ boxShadow: '0 0 8px var(--dash-primary)' }}
              />
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="5" cy="12" r="1.5" fill="currentColor" />
              <circle cx="19" cy="12" r="1.5" fill="currentColor" />
            </svg>
            <span className="text-[10px] font-medium tracking-tight leading-none">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
