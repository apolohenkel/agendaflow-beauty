'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Ingresa tu correo.'); return }
    setLoading(true)
    setError(null)

    const redirectTo = `${window.location.origin}/reset-password`
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })

    setLoading(false)
    if (err) {
      setError('No se pudo enviar el correo. Intenta de nuevo.')
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
                Si existe una cuenta con <span className="text-[#C8A96E]">{email}</span>, te enviamos un enlace para restablecer tu contraseña.
              </p>
              <Link href="/login" className="inline-block text-[#C8A96E] hover:text-[#D4B87A] text-xs font-medium mt-2">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                <h2 className="text-[#E8E3DC] text-base font-medium">Recuperar contraseña</h2>
                <p className="text-[#444] text-xs">Te enviaremos un enlace a tu correo</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[#555] text-[10px] uppercase tracking-widest">Correo electrónico</p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm placeholder-[#2E2E2E] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-60 mt-2"
                >
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>

                <p className="text-center">
                  <Link href="/login" className="text-[#666] hover:text-[#C8A96E] text-xs">Volver</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
