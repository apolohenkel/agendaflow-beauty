'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { composeTheme, themeCssVars, DEFAULT_VERTICAL } from '@/lib/verticals'

export default function ReviewPage({ params }) {
  const { slug } = use(params)
  const search = useSearchParams()
  const id = search.get('id')
  const token = search.get('t')

  const [org, setOrg] = useState(null)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error | invalid

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_public_org', { p_slug: slug }).then(({ data }) => setOrg(data?.[0] || null))
  }, [slug])

  async function submit(e) {
    e.preventDefault()
    if (!id || !token) { setStatus('invalid'); return }
    if (!rating) return
    setStatus('loading')
    const res = await fetch('/api/reviews/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment_id: id, token, rating, text: text.trim() || null }),
    })
    setStatus(res.ok ? 'done' : 'error')
  }

  const verticalKey = org?.vertical || DEFAULT_VERTICAL
  const baseTheme = composeTheme(verticalKey, org?.theme)
  const theme = org?.primary_color ? { ...baseTheme, primary: org.primary_color } : baseTheme

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ ...themeCssVars(theme), backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] font-medium" style={{ color: theme.primary }}>Tu opinión</p>
          <h1 className="text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            {status === 'done' ? '¡Gracias!' : <>¿Cómo fue tu visita a<br /><em style={{ color: theme.primary }}>{org?.name || 'tu salón'}</em>?</>}
          </h1>
          {status !== 'done' && <p className="text-sm" style={{ color: theme.textSoft }}>Tu experiencia nos importa. Toma menos de un minuto.</p>}
          {status === 'done' && <p className="text-sm" style={{ color: theme.textSoft }}>Tu review nos ayuda a crecer y a que más personas conozcan este lugar.</p>}
        </div>

        {status !== 'done' && status !== 'invalid' && (
          <form
            onSubmit={submit}
            className="rounded-3xl p-7 space-y-5 shadow-xl"
            style={{ backgroundColor: theme.surface, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
          >
            {/* Estrellas */}
            <div className="flex justify-center gap-1.5">
              {[1,2,3,4,5].map((n) => {
                const active = (hover || rating) >= n
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${n} estrellas`}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill={active ? theme.primary : 'none'} stroke={active ? theme.primary : theme.border} strokeWidth="1.5" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                )
              })}
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: theme.textSoft }}>
                Cuéntanos más <span className="normal-case font-normal" style={{ color: theme.textMuted }}>(opcional)</span>
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                rows={4}
                placeholder="Qué te gustó, el trato, el ambiente…"
                maxLength={500}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all resize-none"
                style={{ backgroundColor: theme.surfaceSoft, color: theme.text, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}
                onFocus={(e) => (e.target.style.borderColor = theme.primary)}
                onBlur={(e) => (e.target.style.borderColor = theme.border)}
              />
              <p className="text-[11px] text-right tabular-nums" style={{ color: theme.textMuted }}>{text.length}/500</p>
            </div>

            {status === 'error' && (
              <p className="text-xs rounded-xl px-3 py-2" style={{ color: theme.error, backgroundColor: `${theme.error}14` }}>No pudimos guardar tu review. Inténtalo de nuevo.</p>
            )}

            <button
              type="submit"
              disabled={!rating || status === 'loading'}
              className="w-full py-3.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 hover:brightness-110"
              style={{ backgroundColor: theme.primary, color: theme.onPrimary, boxShadow: `0 8px 20px ${theme.primary}30` }}
            >
              {status === 'loading' ? 'Enviando…' : 'Enviar review'}
            </button>
          </form>
        )}

        {status === 'invalid' && (
          <div className="rounded-3xl p-6 text-center space-y-3" style={{ backgroundColor: theme.surface, borderWidth: 1, borderStyle: 'solid', borderColor: theme.border }}>
            <p className="text-sm" style={{ color: theme.textSoft }}>El enlace no está completo o expiró.</p>
          </div>
        )}

        {status === 'done' && (
          <Link
            href={`/b/${slug}`}
            className="inline-block py-3 px-6 rounded-full text-sm font-semibold transition-all hover:brightness-110 mx-auto block w-fit"
            style={{ backgroundColor: theme.text, color: theme.bg }}
          >
            Volver al salón
          </Link>
        )}
      </div>
    </div>
  )
}
