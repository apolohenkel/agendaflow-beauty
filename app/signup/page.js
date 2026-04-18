'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    })

    setLoading(false)

    if (signupError) {
      const msg = signupError.message?.toLowerCase() || ''
      if (msg.includes('already') || msg.includes('registered')) {
        setError('Ya existe una cuenta con ese correo. Inicia sesión.')
      } else if (msg.includes('password')) {
        setError('La contraseña no cumple los requisitos.')
      } else {
        setError('No se pudo crear la cuenta. Revisa el correo e intenta de nuevo.')
      }
      return
    }

    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#C8A96E] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C8A96E]/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[#F0EBE3] text-2xl font-light tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
              AgendaFlow
            </h1>
            <p className="text-[#5A5550] text-[11px] tracking-[0.25em] uppercase mt-0.5">Beauty</p>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8 space-y-5 shadow-2xl shadow-black/50">
          {sent ? (
            <div className="space-y-3 text-center">
              <h2 className="text-[#E8E3DC] text-base font-medium">Revisa tu correo</h2>
              <p className="text-[#888] text-xs leading-relaxed">
                Te enviamos un enlace a <span className="text-[#C8A96E]">{email}</span>. Ábrelo para activar tu cuenta.
              </p>
              <Link href="/login" className="inline-block text-[#C8A96E] hover:text-[#D4B87A] text-xs font-medium mt-2">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                <h2 className="text-[#E8E3DC] text-base font-medium">Crea tu cuenta</h2>
                <p className="text-[#444] text-xs">14 días gratis, sin tarjeta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[#555] text-[10px] uppercase tracking-widest">Correo electrónico</p>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[#555] text-[10px] uppercase tracking-widest">Contraseña</p>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] active:scale-[0.99] text-[#080808] text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-60 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border border-[#080808]/20 border-t-[#080808]/70 rounded-full animate-spin" />
                      Creando...
                    </>
                  ) : 'Crear cuenta'}
                </button>
              </form>

              <p className="text-center text-[#666] text-xs pt-2 border-t border-[#161616]">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-[#C8A96E] hover:text-[#D4B87A] font-medium">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[#2A2A2A] text-[10px] tracking-wider uppercase">
          AgendaFlow Beauty
        </p>
      </div>
    </div>
  )
}
