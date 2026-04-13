'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Panel',
    href: '/dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
      </svg>
    ),
  },
  {
    label: 'Servicios',
    href: '/dashboard/servicios',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    label: 'Personal',
    href: '/dashboard/personal',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.85" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 h-screen bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col shrink-0">

      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#C8A96E] rounded-lg flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </div>
          <div>
            <p className="text-[#F5F0E8] text-sm font-semibold tracking-wide leading-none">AgendaFlow</p>
            <p className="text-[#5A5550] text-[9px] tracking-[0.2em] uppercase mt-0.5">Beauty</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                isActive
                  ? 'bg-[#C8A96E]/10 text-[#C8A96E]'
                  : 'text-[#525252] hover:text-[#D4CFC8] hover:bg-[#161616]'
              }`}
            >
              <span className={`transition-colors ${isActive ? 'text-[#C8A96E]' : 'text-[#383838] group-hover:text-[#686460]'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1 h-1 rounded-full bg-[#C8A96E]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* WhatsApp status indicator */}
      <div className="px-3 py-3 mx-3 mb-3 bg-[#111] rounded-xl border border-[#1A1A1A]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3DBA6E] animate-pulse" />
          <p className="text-[#3DBA6E] text-[10px] font-medium tracking-wide">WhatsApp conectado</p>
        </div>
        <p className="text-[#333] text-[9px] mt-0.5 pl-3.5">Bot activo</p>
      </div>

      {/* User */}
      <div className="px-3 pb-4 border-t border-[#1A1A1A] pt-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-[#1E1E1E] border border-[#2A2A2A] flex items-center justify-center shrink-0">
            <span className="text-[#C8A96E] text-xs font-semibold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#C8C3BC] text-xs font-medium truncate">Admin</p>
            <p className="text-[#383430] text-[10px] truncate">Mi negocio</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
