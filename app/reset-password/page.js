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
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-8 space-y-5 shadow-2xl shadow-black/50">
          {done ? (
            <div className="space-y-2 text-center">
              <h2 className="text-[#E8E3DC] text-base font-medium">¡Contraseña actualizada!</h2>
              <p className="text-[#888] text-xs">Redirigiendo al dashboard…</p>
            </div>
          ) : !ready ? (
            <div className="space-y-3 text-center">
              <h2 className="text-[#E8E3DC] text-base font-medium">Verificando enlace…</h2>
              <p className="text-[#888] text-xs">Si no ves el formulario en unos segundos, el enlace puede haber expirado.</p>
              <Link href="/forgot-password" className="inline-block text-[#C8A96E] hover:text-[#D4B87A] text-xs font-medium mt-2">
                Pedir un enlace nuevo
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-2">
                <h2 className="text-[#E8E3DC] text-base font-medium">Nueva contraseña</h2>
                <p className="text-[#444] text-xs">Mínimo 8 caracteres</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[#555] text-[10px] uppercase tracking-widest">Nueva contraseña</p>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[#555] text-[10px] uppercase tracking-widest">Confirmar contraseña</p>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    required
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
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
