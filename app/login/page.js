'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

const RESEND_COOLDOWN = 60

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleResend() {
    if (cooldown > 0 || resending) return
    setResending(true)
    setResendDone(false)
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email: form.email.trim().toLowerCase() })
    setResending(false)
    setResendDone(true)
    setCooldown(RESEND_COOLDOWN)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Completa todos los campos.'); return }
    setLoading(true)
    setError(null)
    setNeedsConfirm(false)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
    })

    if (err) {
      setLoading(false)
      const msg = err.message?.toLowerCase() || ''
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setNeedsConfirm(true)
        setError('Confirma tu correo antes de iniciar sesión. Revisa tu bandeja o reenvía el enlace.')
      } else {
        setError('Correo o contraseña incorrectos.')
      }
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-5" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <Logo variant="isotipo" size={64} />
          <div className="text-center">
            <h1 className="text-[#17384A] text-3xl font-light tracking-tight" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
              Agenda<span style={{ color: '#C8A263' }}>Flow</span>
            </h1>
            <p className="text-[#C8A263] text-[10px] tracking-[0.3em] uppercase mt-1 font-medium">Beauty</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#EDE5DB] rounded-3xl p-8 space-y-5 shadow-xl shadow-[#17384A]/5">
          <div className="space-y-1 mb-2">
            <h2 className="text-[#17384A] text-xl font-medium">Bienvenida de vuelta</h2>
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
                className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#17384A] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#C8A263] focus:bg-white transition-all"
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
                className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#17384A] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#C8A263] focus:bg-white transition-all"
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

            {/* Reenvío de verificación cuando Supabase pide confirmar */}
            {needsConfirm && (
              <div className="pt-1">
                {resendDone && cooldown > 0 ? (
                  <p className="text-[#6B9E6B] text-xs font-medium text-center">
                    ✓ Correo reenviado · puedes reintentar en {cooldown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                    className="w-full flex items-center justify-center gap-2 border border-[#C8A263]/40 hover:border-[#C8A263] text-[#C8A263] text-xs font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? 'Reenviando…' : cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar correo de verificación'}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#17384A] hover:bg-[#1F4A60] active:scale-[0.99] text-[#FAF6F0] text-sm font-medium py-3.5 rounded-full transition-all disabled:opacity-60 mt-2 shadow-lg shadow-[#17384A]/15"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border border-[#FAF6F0]/30 border-t-[#FAF6F0] rounded-full animate-spin" />
                  Entrando…
                </>
              ) : 'Entrar'}
            </button>

            <p className="text-center -mt-1">
              <Link href="/forgot-password" className="text-[#6B5A4F] hover:text-[#C8A263] text-xs transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </form>

          <p className="text-center text-[#6B5A4F] text-sm pt-4 border-t border-[#EDE5DB]">
            ¿Aún no tienes cuenta?{' '}
            <Link href="/signup" className="text-[#C8A263] hover:text-[#A88548] font-semibold transition-colors">
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
