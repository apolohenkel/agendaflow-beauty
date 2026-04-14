'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Completa todos los campos.'); return }
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithPassword({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
    })

    if (err) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">

      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#C8A96E] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C8A96E]/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[#F0EBE3] text-2xl font-light tracking-wide"
              style={{ fontFamily: 'var(--font-display)' }}>
              AgendaFlow
            </h1>
            <p className="text-[#5A5550] text-[11px] tracking-[0.25em] uppercase mt-0.5">Beauty</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8 space-y-5 shadow-2xl shadow-black/50">

          <div className="space-y-1 mb-2">
            <h2 className="text-[#E8E3DC] text-base font-medium">Iniciar sesión</h2>
            <p className="text-[#444] text-xs">Accede al panel de administración</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1.5">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Correo electrónico</p>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="admin@tusalon.com"
                autoComplete="email"
                required
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Contraseña</p>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] active:scale-[0.99] text-[#080808] text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border border-[#080808]/20 border-t-[#080808]/70 rounded-full animate-spin" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>

          </form>
        </div>

        <p className="text-center text-[#2A2A2A] text-[10px] tracking-wider uppercase">
          AgendaFlow Beauty · Panel de administración
        </p>

      </div>
    </div>
  )
}
