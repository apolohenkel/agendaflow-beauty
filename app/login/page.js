'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-5" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#B8824B] to-[#8C5E35] rounded-2xl flex items-center justify-center shadow-xl shadow-[#B8824B]/25">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[#2B1810] text-3xl font-light tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
              AgendaFlow
            </h1>
            <p className="text-[#B8824B] text-[10px] tracking-[0.3em] uppercase mt-1 font-medium">Beauty</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#EDE5DB] rounded-3xl p-8 space-y-5 shadow-xl shadow-[#2B1810]/5">
          <div className="space-y-1 mb-2">
            <h2 className="text-[#2B1810] text-xl font-medium">Bienvenida de vuelta</h2>
            <p className="text-[#6B5A4F] text-sm">Entra al panel de tu salón</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Correo</p>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="sofia@tusalon.com"
                autoComplete="email"
                required
                className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#2B1810] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#B8824B] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Contraseña</p>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#2B1810] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#B8824B] focus:bg-white transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-[#FBE9E7] border border-[#E6A494] rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C44646" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[#C44646] text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#2B1810] hover:bg-[#3D241A] active:scale-[0.99] text-[#FAF6F0] text-sm font-medium py-3.5 rounded-full transition-all disabled:opacity-60 mt-2 shadow-lg shadow-[#2B1810]/15"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border border-[#FAF6F0]/30 border-t-[#FAF6F0] rounded-full animate-spin" />
                  Entrando…
                </>
              ) : 'Entrar'}
            </button>

            <p className="text-center -mt-1">
              <Link href="/forgot-password" className="text-[#6B5A4F] hover:text-[#B8824B] text-xs transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>

          <p className="text-center text-[#6B5A4F] text-sm pt-4 border-t border-[#EDE5DB]">
            ¿Aún no tienes cuenta?{' '}
            <Link href="/signup" className="text-[#B8824B] hover:text-[#8C5E35] font-semibold transition-colors">
              Empieza gratis
            </Link>
          </p>
        </div>

        <p className="text-center text-[#A89582] text-[10px] tracking-widest uppercase">
          Para salones, barberías y spas
        </p>
      </div>
    </div>
  )
}
