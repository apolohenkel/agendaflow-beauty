'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VERTICALS, VERTICAL_KEYS, DEFAULT_VERTICAL, getVertical, themeCssVars } from '@/lib/verticals'
import { createClient } from '@/lib/supabase/client'

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'México' },
  { value: 'America/Guatemala', label: 'Guatemala' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Lima', label: 'Perú' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'Europe/Madrid', label: 'España' },
]

// Mapeo vertical → type legacy para compatibilidad con SERVICES_BY_TYPE en el API
const VERTICAL_TO_TYPE = {
  beauty_salon: 'Salón de belleza',
  barbershop: 'Barbería',
  nail_salon: 'Salón de uñas',
  spa: 'Spa',
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryVertical = searchParams.get('v')
  const initialVertical = VERTICAL_KEYS.includes(queryVertical) ? queryVertical : DEFAULT_VERTICAL

  const [vertical, setVertical] = useState(initialVertical)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugState, setSlugState] = useState('idle') // idle|checking|available|taken|invalid
  const [timezone, setTimezone] = useState('America/Mexico_City')
  const [seed, setSeed] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Validación live del slug con debounce
  useEffect(() => {
    if (!slug) { setSlugState('idle'); return }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) {
      setSlugState('invalid'); return
    }
    setSlugState('checking')
    const supa = createClient()
    const t = setTimeout(async () => {
      const { data, error } = await supa.rpc('check_slug_available', { p_slug: slug })
      if (error) { setSlugState('invalid'); return }
      setSlugState(data ? 'available' : 'taken')
    }, 400)
    return () => clearTimeout(t)
  }, [slug])

  // Recupera vertical de localStorage si no viene en query
  useEffect(() => {
    if (!queryVertical && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('af:vertical')
      if (VERTICAL_KEYS.includes(saved)) setVertical(saved)
    }
  }, [queryVertical])

  const v = getVertical(vertical)
  const cssVars = themeCssVars(v.theme)

  function handleNameChange(value) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (slugState === 'taken') {
      setError('Ese link ya está en uso. Elige otro.')
      return
    }
    if (slugState === 'invalid') {
      setError('El link no es válido. Usa solo letras minúsculas, números y guiones (2-40 caracteres).')
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug,
        type: VERTICAL_TO_TYPE[vertical],
        vertical,
        timezone,
        seed,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'No se pudo completar el alta. Intenta de nuevo.')
      setLoading(false)
      return
    }

    if (typeof window !== 'undefined') window.localStorage.removeItem('af:vertical')
    router.push('/dashboard')
  }

  return (
    <div
      className="min-h-screen px-4 py-12 transition-colors"
      style={{ ...cssVars, backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: 'var(--primary)', boxShadow: `0 10px 24px ${v.theme.primary}33` }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4.5 20 L12 4 L19.5 20" /><path d="M7.8 13.8 C12 13 15 13.3 21 18.2" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-light" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Configuremos tu <em style={{ color: 'var(--primary)', fontStyle: 'italic' }}>{v.copy.salonWord}</em>
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-soft)' }}>Solo lo esencial. Podrás ajustar todo después.</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-7 space-y-6 shadow-xl"
          style={{ backgroundColor: 'var(--surface)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', boxShadow: `0 20px 40px -12px ${v.theme.text}10` }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Selector de vertical */}
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>
                ¿Qué tipo de negocio tienes?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {VERTICAL_KEYS.map((key) => {
                  const vv = VERTICALS[key]
                  const active = vertical === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setVertical(key)}
                      className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 transition-all"
                      style={{
                        backgroundColor: active ? `${vv.theme.primary}14` : 'var(--surface-soft)',
                        borderWidth: active ? 2 : 1,
                        borderStyle: 'solid',
                        borderColor: active ? vv.theme.primary : 'var(--border)',
                      }}
                    >
                      <span className="text-2xl">{vv.emoji}</span>
                      <span className="text-xs font-medium" style={{ color: active ? vv.theme.primary : 'var(--text-soft)' }}>
                        {vv.shortLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>
                Nombre del negocio
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Salón Bella"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--text)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}
                onFocus={(e) => (e.target.style.borderColor = v.theme.primary)}
                onBlur={(e) => (e.target.style.borderColor = v.theme.border)}
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>
                Tu URL pública
              </label>
              <div
                className="flex items-stretch rounded-xl overflow-hidden"
                style={{ borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}
              >
                <span
                  className="px-3 py-3 text-xs flex items-center whitespace-nowrap"
                  style={{ backgroundColor: 'var(--border-soft)', color: 'var(--text-soft)' }}
                >
                  agendaflow.beauty/b/
                </span>
                <input
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true) }}
                  placeholder="salon-bella"
                  className="flex-1 px-3 py-3 text-sm focus:outline-none"
                  style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--text)' }}
                />
                <div className="flex items-center px-3 shrink-0">
                  {slugState === 'checking' && (
                    <span
                      className="w-3.5 h-3.5 border border-current/30 rounded-full animate-spin"
                      style={{ borderTopColor: v.theme.primary }}
                    />
                  )}
                  {slugState === 'available' && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: v.theme.success }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Libre
                    </span>
                  )}
                  {slugState === 'taken' && (
                    <span className="text-xs" style={{ color: v.theme.error }}>Ocupado</span>
                  )}
                  {slugState === 'invalid' && (
                    <span className="text-xs" style={{ color: v.theme.error }}>Inválido</span>
                  )}
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {slugState === 'available' ? '¡Ese link está disponible!' :
                 slugState === 'taken' ? 'Ese link ya está en uso. Prueba otro.' :
                 slugState === 'invalid' ? 'Solo letras minúsculas, números y guiones. 2-40 caracteres.' :
                 'Solo letras, números y guiones. Ejemplo: salon-bella'}
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-soft)' }}>
                País / zona horaria
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--text)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            {/* Seed */}
            <label
              className="flex items-start gap-3 rounded-xl p-4 cursor-pointer"
              style={{ backgroundColor: 'var(--surface-soft)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}
            >
              <input
                type="checkbox"
                checked={seed}
                onChange={(e) => setSeed(e.target.checked)}
                className="mt-1 w-4 h-4"
                style={{ accentColor: v.theme.primary }}
              />
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                <span className="font-medium">Empezar con servicios sugeridos de {v.shortLabel}</span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--text-soft)' }}>
                  Crearemos {v.suggestedServices.slice(0, 3).join(', ')} y horario L-V 9-19 / Sáb 10-15. Podrás editarlos.
                </span>
              </span>
            </label>

            {error && (
              <div
                className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                style={{ backgroundColor: `${v.theme.error}15`, borderWidth: 1, borderStyle: 'solid', borderColor: `${v.theme.error}40` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={v.theme.error} strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs" style={{ color: v.theme.error }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 hover:brightness-110 active:scale-[0.99]"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', boxShadow: `0 10px 24px ${v.theme.primary}33` }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando…
                </>
              ) : 'Entrar a mi panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
