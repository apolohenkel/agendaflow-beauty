'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

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

    const supabase = createClient()
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
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-5" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Logo variant="isotipo" size={64} />
          <div className="text-center">
            <h1 className="text-[#17384A] text-3xl font-light tracking-tight" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
              Agenda<span style={{ color: '#C8A263' }}>Flow</span>
            </h1>
            <p className="text-[#C8A263] text-[10px] tracking-[0.3em] uppercase mt-1 font-medium">Beauty</p>
          </div>
        </div>

        <div className="bg-white border border-[#EDE5DB] rounded-3xl p-8 space-y-5 shadow-xl shadow-[#17384A]/5">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#E8C5B8]/40 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8A263" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 className="text-[#17384A] text-xl font-medium" style={{ fontFamily: 'var(--font-display)' }}>Revisa tu correo</h2>
              <p className="text-[#6B5A4F] text-sm leading-relaxed">
                Si existe una cuenta con <span className="text-[#C8A263] font-medium">{email}</span>, te enviamos un enlace para restablecer tu contraseña.
              </p>
              <Link href="/login" className="inline-block text-[#C8A263] hover:text-[#A88548] text-sm font-medium mt-2 transition-colors">
                Volver al inicio de sesión →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                <h2 className="text-[#17384A] text-xl font-medium">¿Olvidaste tu contraseña?</h2>
                <p className="text-[#6B5A4F] text-sm">Te enviamos un enlace a tu correo para recuperarla</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Correo electrónico</p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sofia@tusalon.com"
                    required
                    className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#17384A] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#C8A263] focus:bg-white transition-all"
                  />
                </div>

                {error && (
                  <p className="text-[#C44646] text-xs bg-[#FBE9E7] border border-[#E6A494] px-4 py-2.5 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#17384A] hover:bg-[#1F4A60] text-[#FAF6F0] text-sm font-medium py-3.5 rounded-full transition-all disabled:opacity-60 mt-2 shadow-lg shadow-[#17384A]/15"
                >
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>

                <p className="text-center">
                  <Link href="/login" className="text-[#6B5A4F] hover:text-[#C8A263] text-xs transition-colors">← Volver</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
