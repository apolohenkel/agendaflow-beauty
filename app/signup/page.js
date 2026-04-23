'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import Logo from '@/components/Logo'

const RESEND_COOLDOWN = 60 // segundos

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [cooldown, setCooldown] = useState(0) // segundos restantes

  // Cuenta regresiva del cooldown
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
    await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() })
    setResending(false)
    setResendDone(true)
    setCooldown(RESEND_COOLDOWN)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    })

    if (signupError) {
      setLoading(false)
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

    // Si Supabase devolvió sesión activa, "Confirm email" está desactivado
    // en el dashboard. El usuario ya está autenticado — mandarlo al onboarding.
    if (data?.session) {
      router.push('/onboarding')
      return
    }

    // Si no hay sesión, se requiere verificación por correo.
    setLoading(false)
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
                Te enviamos un enlace a <span className="text-[#C8A263] font-medium">{email}</span>. Ábrelo para activar tu cuenta.
              </p>
              <p className="text-[#A89582] text-xs">
                ¿No llegó? Revisa la carpeta de spam.
              </p>

              {/* Reenviar */}
              <div className="pt-2 border-t border-[#EDE5DB]">
                {resendDone && cooldown > 0 ? (
                  <p className="text-[#6B9E6B] text-sm font-medium">
                    ✓ Correo reenviado · puedes reintentar en {cooldown}s
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                    className="w-full flex items-center justify-center gap-2 border border-[#EDE5DB] hover:border-[#D4C4B5] text-[#6B5A4F] hover:text-[#17384A] text-sm font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <>
                        <span className="w-3.5 h-3.5 border border-[#C8A263]/30 border-t-[#C8A263] rounded-full animate-spin" />
                        Reenviando…
                      </>
                    ) : cooldown > 0 ? (
                      `Reenviar en ${cooldown}s`
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Reenviar correo de activación
                      </>
                    )}
                  </button>
                )}
              </div>

              <Link href="/login" className="inline-block text-[#A89582] hover:text-[#6B5A4F] text-xs transition-colors mt-1">
                Volver al inicio de sesión →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                <h2 className="text-[#17384A] text-xl font-medium">Crea tu cuenta</h2>
                <p className="text-[#6B5A4F] text-sm">14 días gratis · Sin tarjeta · Cancela cuando quieras</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Tu correo</p>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sofia@tusalon.com"
                    autoComplete="email"
                    className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#17384A] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#C8A263] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Contraseña</p>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#17384A] hover:bg-[#1F4A60] active:scale-[0.99] text-[#FAF6F0] text-sm font-medium py-3.5 rounded-full transition-all disabled:opacity-60 mt-2 shadow-lg shadow-[#17384A]/15"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border border-[#FAF6F0]/30 border-t-[#FAF6F0] rounded-full animate-spin" />
                      Creando…
                    </>
                  ) : 'Empezar ahora'}
                </button>
              </form>

              <p className="text-center text-[#6B5A4F] text-sm pt-4 border-t border-[#EDE5DB]">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-[#C8A263] hover:text-[#A88548] font-semibold transition-colors">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-[#A89582] text-[10px] tracking-widest uppercase">
          Para salones, barberías y spas
        </p>
      </div>
    </div>
  )
}
