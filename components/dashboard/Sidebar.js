'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/lib/org-context'
import NotificationBell from '@/components/dashboard/NotificationBell'

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
  {
    label: 'WhatsApp',
    href: '/dashboard/whatsapp',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: 'Facturación',
    href: '/dashboard/billing',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <line x1="2" y1="11" x2="22" y2="11" />
        <line x1="6" y1="16" x2="10" y2="16" />
      </svg>
    ),
  },
  {
    label: 'Configuración',
    href: '/dashboard/configuracion',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { business, user, whatsappConnected } = useOrg()
  const bizName = business?.name || 'Mi negocio'
  const userEmail = user?.email || ''

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside className="w-56 h-screen bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col shrink-0">

      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#C8A96E] rounded-lg flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4.5 20 L12 4 L19.5 20" /><path d="M7.8 13.8 C12 13 15 13.3 21 18.2" />
            </svg>
          </div>
          <div>
            <p className="text-[#F5F0E8] text-sm font-semibold tracking-wide leading-none">AgendaFlow</p>
            <p className="text-[#888] text-[9px] tracking-[0.2em] uppercase mt-0.5">Beauty</p>
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
                  : 'text-[#A0A0A0] hover:text-[#F0EBE3] hover:bg-[#161616]'
              }`}
            >
              <span className={`transition-colors ${isActive ? 'text-[#C8A96E]' : 'text-[#666] group-hover:text-[#A0A0A0]'}`}>
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

      {/* Notificaciones */}
      <div className="px-3 pb-2">
        <NotificationBell />
      </div>

      {/* WhatsApp status indicator */}
      <Link href="/dashboard/whatsapp" className="block px-3 py-3 mx-3 mb-3 bg-[#111] rounded-xl border border-[#1A1A1A] hover:border-[#2A2A2A] transition-colors">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${whatsappConnected ? 'bg-[#3DBA6E] animate-pulse' : 'bg-[#666]'}`} />
          <p className={`text-[10px] font-medium tracking-wide ${whatsappConnected ? 'text-[#3DBA6E]' : 'text-[#A0A0A0]'}`}>
            {whatsappConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
          </p>
        </div>
        <p className="text-[#777] text-[9px] mt-0.5 pl-3.5">
          {whatsappConnected ? 'Bot activo' : 'Configura para activar el bot'}
        </p>
      </Link>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-[#1A1A1A] pt-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-[#1E1E1E] border border-[#2A2A2A] flex items-center justify-center shrink-0">
            <span className="text-[#C8A96E] text-xs font-semibold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#E8E3DC] text-xs font-medium truncate">{userEmail || 'Admin'}</p>
            <p className="text-[#888] text-[10px] truncate">{bizName}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="shrink-0 p-1.5 text-[#666] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
