'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { composeTheme, themeCssVars, DEFAULT_VERTICAL } from '@/lib/verticals'

export default function PaymentSuccessPage({ params }) {
  const { slug } = use(params)
  const search = useSearchParams()
  const sessionId = search.get('session_id')
  const [org, setOrg] = useState(null)
  const [status, setStatus] = useState('waiting') // waiting | done | error

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_public_org', { p_slug: slug }).then(({ data }) => setOrg(data?.[0] || null))
  }, [slug])

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return }
    // El webhook de Stripe crea la cita de forma asíncrona. Damos unos segundos.
    const t = setTimeout(() => setStatus('done'), 2500)
    return () => clearTimeout(t)
  }, [sessionId])

  const verticalKey = org?.vertical || DEFAULT_VERTICAL
  const baseTheme = composeTheme(verticalKey, org?.theme)
  const theme = org?.primary_color ? { ...baseTheme, primary: org.primary_color } : baseTheme

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ ...themeCssVars(theme), backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >
      <div className="text-center max-w-sm w-full space-y-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: `${theme.primary}1A`, borderWidth: 1, borderStyle: 'solid', borderColor: `${theme.primary}4D` }}
        >
          {status === 'waiting' ? (
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${theme.primary}33`, borderTopColor: theme.primary }} />
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="1.8" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            {status === 'waiting' ? 'Confirmando tu pago…' : status === 'done' ? '¡Seña recibida!' : 'Sesión inválida'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
            {status === 'waiting' && 'Esperando confirmación de Stripe. Un momento.'}
            {status === 'done' && <>Tu cita en <span className="font-medium" style={{ color: 'var(--text)' }}>{org?.name}</span> quedó confirmada. Te contactaremos por WhatsApp.</>}
            {status === 'error' && 'No se encontró la sesión de pago. Si ya pagaste, contáctanos por WhatsApp.'}
          </p>
        </div>

        {status === 'done' && (
          <Link
            href={`/b/${slug}`}
            className="inline-block py-3 px-6 rounded-full text-sm font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: theme.text, color: theme.bg }}
          >
            Volver al salón
          </Link>
        )}

        {status === 'error' && (
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
