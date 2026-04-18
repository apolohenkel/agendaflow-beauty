'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { composeTheme, themeCssVars, DEFAULT_VERTICAL } from '@/lib/verticals'

export default function CancelPage({ params }) {
  const { slug } = use(params)
  const search = useSearchParams()
  const id = search.get('id')
  const token = search.get('t')

  const [org, setOrg] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | done | already | error | invalid
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_public_org', { p_slug: slug }).then(({ data }) => {
      setOrg(data?.[0] || null)
    })
  }, [slug])

  async function doCancel() {
    if (!id || !token) { setStatus('invalid'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: id, token }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus(data.alreadyCancelled ? 'already' : 'done')
      } else {
        setErrorMsg(data.error || 'cancel_failed')
        setStatus('error')
      }
    } catch {
      setErrorMsg('network')
      setStatus('error')
    }
  }

  const verticalKey = org?.vertical || DEFAULT_VERTICAL
  const baseTheme = composeTheme(verticalKey, org?.theme)
  const theme = org?.primary_color ? { ...baseTheme, primary: org.primary_color } : baseTheme
  const cssVars = themeCssVars(theme)

  const heading = {
    idle: '¿Cancelar tu cita?',
    loading: 'Cancelando…',
    done: 'Cita cancelada',
    already: 'Cita ya estaba cancelada',
    error: 'No se pudo cancelar',
    invalid: 'Enlace inválido',
  }[status]

  const subtext = {
    idle: `Estás por cancelar tu cita${org?.name ? ` en ${org.name}` : ''}. Esta acción no se puede deshacer.`,
    loading: 'Un momento por favor',
    done: 'Listo. Puedes agendar una nueva cuando quieras.',
    already: 'Ya no tienes que hacer nada.',
    error: 'El enlace puede haber expirado. Contáctanos por WhatsApp.',
    invalid: 'El enlace no está completo. Usa el link del correo que te enviamos.',
  }[status]

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ ...cssVars, backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >
      <div className="text-center max-w-sm w-full space-y-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{
            backgroundColor: status === 'done' || status === 'already' ? `${theme.textMuted}1A` : `${theme.primary}1A`,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: status === 'done' || status === 'already' ? `${theme.textMuted}4D` : `${theme.primary}4D`,
          }}
        >
          {status === 'done' || status === 'already' ? (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="1.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : status === 'error' || status === 'invalid' ? (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={theme.error || '#C44646'} strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="6" x2="12" y2="14" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>{heading}</h1>
          <p className="text-sm" style={{ color: 'var(--text-soft)' }}>{subtext}</p>
        </div>

        {status === 'idle' && (
          <div className="flex flex-col gap-2">
            <button
              onClick={doCancel}
              disabled={!id || !token}
              className="w-full py-3.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 hover:brightness-110 active:scale-[0.99]"
              style={{ backgroundColor: theme.primary, color: theme.onPrimary, boxShadow: `0 8px 20px ${theme.primary}30` }}
            >
              Sí, cancelar mi cita
            </button>
            <Link
              href={`/b/${slug}`}
              className="text-xs py-2 underline-offset-2 hover:underline transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              Volver a reservar
            </Link>
          </div>
        )}

        {(status === 'done' || status === 'already') && (
          <Link
            href={`/b/${slug}`}
            className="inline-block py-3 px-6 rounded-full text-sm font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: theme.text, color: theme.bg }}
          >
            Agendar nueva cita
          </Link>
        )}

        {(status === 'error' || status === 'invalid') && (
          <Link
            href={`/b/${slug}`}
            className="inline-block py-3 px-6 rounded-full text-sm font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
          >
            Volver al salón
          </Link>
        )}
      </div>
    </div>
  )
}
