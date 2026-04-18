'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.updateUser({ password: form.password })
    setLoading(false)
    if (err) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
      return
    }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-5" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#B8824B] to-[#8C5E35] rounded-2xl flex items-center justify-center shadow-xl shadow-[#B8824B]/25">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4.5 20 L12 4 L19.5 20" /><path d="M7.8 13.8 C12 13 15 13.3 21 18.2" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[#2B1810] text-3xl font-light tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
              AgendaFlow
            </h1>
            <p className="text-[#B8824B] text-[10px] tracking-[0.3em] uppercase mt-1 font-medium">Beauty</p>
          </div>
        </div>

        <div className="bg-white border border-[#EDE5DB] rounded-3xl p-8 space-y-5 shadow-xl shadow-[#2B1810]/5">
          {done ? (
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#7A9A6E]/15 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7A9A6E" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-[#2B1810] text-xl font-medium" style={{ fontFamily: 'var(--font-display)' }}>¡Contraseña actualizada!</h2>
              <p className="text-[#6B5A4F] text-sm">Te llevamos al panel…</p>
            </div>
          ) : !ready ? (
            <div className="space-y-3 text-center">
              <h2 className="text-[#2B1810] text-xl font-medium">Verificando enlace…</h2>
              <p className="text-[#6B5A4F] text-sm">Si no ves el formulario en unos segundos, el enlace puede haber expirado.</p>
              <Link href="/forgot-password" className="inline-block text-[#B8824B] hover:text-[#8C5E35] text-sm font-medium mt-2 transition-colors">
                Pedir un enlace nuevo →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                <h2 className="text-[#2B1810] text-xl font-medium">Nueva contraseña</h2>
                <p className="text-[#6B5A4F] text-sm">Mínimo 8 caracteres</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Nueva contraseña</p>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#2B1810] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#B8824B] focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[#6B5A4F] text-[11px] uppercase tracking-wider font-medium">Confirmar contraseña</p>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    required
                    className="w-full bg-[#FDFBF7] border border-[#EDE5DB] rounded-xl px-4 py-3 text-[#2B1810] text-sm placeholder-[#A89582] focus:outline-none focus:border-[#B8824B] focus:bg-white transition-all"
                  />
                </div>

                {error && (
                  <p className="text-[#C44646] text-xs bg-[#FBE9E7] border border-[#E6A494] px-4 py-2.5 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#2B1810] hover:bg-[#3D241A] text-[#FAF6F0] text-sm font-medium py-3.5 rounded-full transition-all disabled:opacity-60 shadow-lg shadow-[#2B1810]/15"
                >
                  {loading ? 'Guardando…' : 'Actualizar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
