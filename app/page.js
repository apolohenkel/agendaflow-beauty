'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PLANS, PUBLIC_PLANS, formatPlanPrice, CURRENCY_LOCALES } from '@/lib/plans'
import { VERTICALS, VERTICAL_KEYS, DEFAULT_VERTICAL, getVertical, themeCssVars } from '@/lib/verticals'
import LandingJsonLd from '@/components/LandingJsonLd'
import Logo from '@/components/Logo'

function PainCard({ emoji, title, body }) {
  return (
    <div
      className="rounded-3xl p-7 space-y-3 transition-all hover:-translate-y-1"
      style={{
        backgroundColor: 'var(--surface)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--border)',
      }}
    >
      <div className="text-3xl">{emoji}</div>
      <h3 className="text-lg font-medium" style={{ color: 'var(--text)' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{body}</p>
    </div>
  )
}

function Step({ n, title, body, primary }) {
  return (
    <div className="flex gap-5">
      <div
        className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium tabular-nums shadow-lg"
        style={{
          backgroundColor: primary,
          color: 'var(--on-primary)',
          boxShadow: `0 8px 20px ${primary}33`,
          fontFamily: 'var(--font-display)',
        }}
      >
        {n}
      </div>
      <div className="flex-1 pt-1.5">
        <h3 className="text-base font-semibold mb-1.5" style={{ color: 'var(--text)' }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{body}</p>
      </div>
    </div>
  )
}

function ChatPreview({ vertical }) {
  const theme = vertical.theme
  return (
    <div className="relative mx-auto max-w-[340px]">
      <div
        className="absolute -inset-8 rounded-[2.5rem] blur-2xl"
        style={{ background: `linear-gradient(135deg, ${theme.accent}40, transparent 50%, ${theme.primary}20)` }}
        aria-hidden
      />
      <div
        className="relative rounded-[2rem] p-4 space-y-2 shadow-2xl"
        style={{
          backgroundColor: 'var(--surface-soft)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--border)',
          boxShadow: `0 25px 50px -12px ${theme.text}15`,
        }}
      >
        <div className="flex items-center gap-2.5 pb-3 px-1" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryHover})`, color: 'var(--on-primary)' }}
          >
            {vertical.copy.businessChatInitial}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{vertical.copy.businessChatName}</p>
            <p className="text-[11px] flex items-center gap-1" style={{ color: theme.success }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.success }} />
              en línea
            </p>
          </div>
        </div>
        {vertical.chatExample.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[82%] text-[13px] px-3.5 py-2 rounded-2xl leading-snug whitespace-pre-line shadow-sm"
              style={
                m.from === 'client'
                  ? { backgroundColor: theme.primary, color: 'var(--on-primary)', borderBottomRightRadius: 6 }
                  : {
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      borderBottomLeftRadius: 6,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'var(--border)',
                    }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        <p className="text-center text-[10px] pt-2 italic" style={{ color: 'var(--text-muted)' }}>
          Así le contesta tu bot mientras tú atiendes
        </p>
      </div>
    </div>
  )
}

function Testimonial({ initial, name, role, text, bg }) {
  return (
    <div
      className="rounded-3xl p-5 sm:p-7 space-y-4 flex flex-col"
      style={{
        backgroundColor: 'var(--surface)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex -space-x-0.5" style={{ color: '#E8B352' }}>
        {[1,2,3,4,5].map((i) => (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <p className="text-base leading-relaxed flex-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
        &ldquo;{text}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ background: bg, color: 'white' }}
        >
          {initial}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{name}</p>
          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>{role}</p>
        </div>
      </div>
    </div>
  )
}

function VerticalSelector({ value, onChange }) {
  return (
    <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex items-center gap-1 p-1 rounded-full shadow-sm"
        style={{ backgroundColor: 'var(--surface)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}
      >
        {VERTICAL_KEYS.map((key) => {
          const v = VERTICALS[key]
          const active = value === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0"
              style={
                active
                  ? { backgroundColor: v.theme.primary, color: v.theme.onPrimary }
                  : { color: 'var(--text-soft)' }
              }
            >
              <span>{v.emoji}</span>
              <span>{v.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [vertical, setVertical] = useState(DEFAULT_VERTICAL)
  const [currency, setCurrency] = useState('usd')
  const [country, setCountry] = useState(null)
  const v = getVertical(vertical)
  const theme = v.theme
  const cssVars = themeCssVars(theme)

  useEffect(() => {
    fetch('/api/locale')
      .then((r) => r.json())
      .then((data) => {
        if (data?.currency && CURRENCY_LOCALES[data.currency]) {
          setCurrency(data.currency)
          setCountry(data.country)
        }
      })
      .catch(() => {})
  }, [])

  function persistVertical() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('af:vertical', vertical)
    }
  }

  const signupHref = `/signup?v=${vertical}`

  return (
    <div
      className="min-h-screen transition-colors"
      style={{ ...cssVars, backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}
    >

      {/* Nav */}
      <nav className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0" aria-label="AgendaFlow — inicio">
            <div className="shrink-0">
              <Logo variant="isotipo" size={36} ariaLabel="AgendaFlow" />
            </div>
            <span className="text-base sm:text-lg tracking-tight" style={{ fontFamily: 'var(--font-display)', color: '#17384A', letterSpacing: '-0.5px' }}>
              Agenda<span style={{ color: '#C8A263' }}>Flow</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <Link href="/login" className="text-sm transition-colors px-3 py-2 hover:opacity-80" style={{ color: 'var(--text-soft)' }}>Entrar</Link>
            <Link
              href={signupHref}
              onClick={persistVertical}
              className="text-xs sm:text-sm font-medium px-3 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all whitespace-nowrap shadow-lg hover:brightness-110"
              style={{ backgroundColor: 'var(--text)', color: 'var(--bg)', boxShadow: `0 8px 20px ${theme.text}20` }}
            >
              <span className="sm:hidden">Empezar</span>
              <span className="hidden sm:inline">Empezar gratis</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Vertical selector banner */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <p className="text-xs font-medium" style={{ color: 'var(--text-soft)' }}>Veo esto como:</p>
          <VerticalSelector value={vertical} onChange={setVertical} />
        </div>
      </div>

      {/* Hero */}
      <section className="px-5 sm:px-6 pt-8 sm:pt-14 pb-16 sm:pb-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-12 md:gap-16 items-center">
          <div className="space-y-7">
            <div
              className="inline-flex items-center gap-2 rounded-full pl-1 pr-4 py-1 shadow-sm"
              style={{ backgroundColor: 'var(--surface)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}
            >
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide uppercase"
                style={{ backgroundColor: theme.accent, color: theme.primaryHover }}
              >
                Nuevo
              </span>
              <span className="text-xs" style={{ color: 'var(--text-soft)' }}>Bot de WhatsApp con IA · 14 días gratis</span>
            </div>
            <h1 className="text-[38px] sm:text-5xl md:text-[60px] lg:text-[68px] leading-[1.08] font-light tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {v.copy.tagline}<br />
              <em style={{ color: 'var(--primary)', fontStyle: 'italic', fontWeight: 'normal' }}>{v.copy.taglineAccent}</em>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed max-w-lg" style={{ color: 'var(--text-soft)' }}>
              {v.copy.heroLead}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href={signupHref}
                onClick={persistVertical}
                className="group inline-flex items-center justify-center gap-2 text-base font-medium px-6 sm:px-7 py-3.5 rounded-full transition-all shadow-xl hover:brightness-110 w-full sm:w-auto"
                style={{ backgroundColor: 'var(--text)', color: 'var(--bg)', boxShadow: `0 20px 40px ${theme.text}20` }}
              >
                Probar gratis 14 días
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 text-base font-medium px-5 py-3.5 transition-all rounded-full w-full sm:w-auto"
                style={{ color: 'var(--text)', backgroundColor: 'var(--surface)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}
              >
                Ver cómo funciona
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-5 pt-4 text-xs" style={{ color: 'var(--text-soft)' }}>
              {['Sin tarjeta', 'Listo en 5 minutos', 'Cancela cuando quieras'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.success} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="md:pl-4">
            <ChatPreview vertical={v} />
          </div>
        </div>
      </section>

      {/* Te suena familiar? */}
      <section
        className="px-5 sm:px-6 py-16 sm:py-24"
        style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--primary)' }}>
              Si tienes {v.copy.salonWord === 'spa' ? 'un' : (v.copy.salonWord === 'nail studio' ? 'un' : 'una')} {v.copy.salonWord}, esto te suena
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Cada día pierdes dinero<br />sin darte cuenta
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {v.painPoints.map((p, i) => (
              <PainCard key={i} emoji={p.emoji} title={p.title} body={p.body} />
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="px-5 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-16 items-start">
          <div className="space-y-3 md:sticky md:top-8">
            <p className="text-xs uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--primary)' }}>La solución</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Una recepcionista<br />que <em style={{ color: 'var(--primary)' }}>nunca descansa</em>
            </h2>
            <p className="text-base leading-relaxed pt-2 max-w-md" style={{ color: 'var(--text-soft)' }}>
              Un bot en tu WhatsApp aprende tus precios, horarios y servicios. Conversa como una persona real, no como un formulario. Tus {v.copy.clientTerm} ni se dan cuenta.
            </p>
          </div>
          <div className="space-y-10">
            <Step n="1" primary={theme.primary} title="Crea tu cuenta en 2 minutos" body={`Registras tu ${v.copy.salonWord}, nos dices qué servicios ofreces y a qué hora atiendes. Te sugerimos plantillas para que no empieces de cero.`} />
            <Step n="2" primary={theme.primary} title="Conectas tu WhatsApp" body="Vinculamos tu número de WhatsApp Business. El bot aprende tu menú de servicios, precios y agenda. Empieza a contestar de inmediato." />
            <Step n="3" primary={theme.primary} title="Contesta 24/7, incluso cuando duermes" body={`Tus ${v.copy.clientTerm} agendan, reagendan, cancelan y pagan desde WhatsApp. Tú ves todo en un panel limpio. Recibes recordatorios antes de cada cita.`} />
            <Step n="4" primary={theme.primary} title="Tu agenda se llena sola" body="Activamos recordatorios 24h y 2h antes — reduces ausencias hasta 70%. Compartes tu link de reservas en Instagram y recibes clientes nuevos." />
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section
        className="px-5 sm:px-6 py-16 sm:py-24"
        style={{ background: `linear-gradient(to bottom, var(--bg), ${theme.borderSoft})` }}
      >
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--primary)' }}>Lo que recuperas</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Tu tiempo. Tu tranquilidad.<br />Tu ingreso.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { stat: '70%', title: 'Menos ausencias', body: 'Recordatorios automáticos 24h y 2h antes. Confirman o cancelan con un toque.' },
              { stat: '24/7', title: 'Contesta siempre', body: 'Responde en segundos, incluso a las 11pm o el domingo. No pierdes clientes por demora.' },
              { stat: '+32%', title: 'Más ingresos', body: `${v.copy.salonWord === 'barbería' ? 'Barberías' : (v.copy.salonWord === 'spa' ? 'Spas' : 'Negocios')} que usan AgendaFlow llenan huecos antes muertos con clientes del booking público.` },
            ].map((b, i) => (
              <div key={i} className="rounded-3xl p-6 sm:p-8 space-y-3" style={{ backgroundColor: 'var(--surface)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' }}>
                <p className="text-5xl font-light tabular-nums" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{b.stat}</p>
                <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>{b.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="px-5 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--primary)' }}>Voces reales</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            Gente como tú,<br />cambiando su día a día
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Testimonial
            initial="S"
            name="Sofía Martínez"
            role="Dueña, Estudio Sofía — CDMX"
            text="Antes perdía 3 o 4 clientas por semana por no contestar a tiempo. Desde que puse AgendaFlow, mi agenda está llena y yo descanso de verdad los domingos."
            bg="linear-gradient(135deg, #E8C5B8, #B8824B)"
          />
          <Testimonial
            initial="M"
            name="Miguel Rojas"
            role="Barbero, Barber Club Centro — Bogotá"
            text="Mis clientes agendan solos por WhatsApp hasta las 2am. Yo solo veo la agenda llena al día siguiente. Se siente como tener una recepcionista sin pagarle sueldo."
            bg="linear-gradient(135deg, #3D241A, #1A1410)"
          />
          <Testimonial
            initial="L"
            name="Laura Gómez"
            role="Spa Harmonía — Guatemala"
            text="Mis clientas ven mi logo, mis colores, mi link propio. Se siente súper profesional. Y los recordatorios bajaron las ausencias a casi cero."
            bg="linear-gradient(135deg, #7A9A6E, #4E6A44)"
          />
        </div>
      </section>

      {/* Pricing */}
      <section
        id="planes"
        className="px-5 sm:px-6 py-16 sm:py-24"
        style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.22em] font-medium" style={{ color: 'var(--primary)' }}>Planes</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Empieza gratis, paga<br />cuando estés seguro
            </h2>
            <p className="text-base pt-2" style={{ color: 'var(--text-soft)' }}>14 días completos gratis. Sin tarjeta. Cancela cuando quieras.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PUBLIC_PLANS.map((key) => {
              const p = PLANS[key]
              const highlighted = key === 'pro'
              return (
                <div
                  key={key}
                  className="relative rounded-3xl p-5 sm:p-7 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1"
                  style={
                    highlighted
                      ? {
                          backgroundColor: theme.text,
                          color: theme.bg,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: theme.text,
                          boxShadow: `0 25px 50px -12px ${theme.text}25`,
                        }
                      : {
                          backgroundColor: theme.surface,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: theme.border,
                        }
                  }
                >
                  {highlighted && (
                    <span
                      className="absolute -top-3 left-7 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md"
                      style={{ backgroundColor: theme.accent, color: theme.primaryHover }}
                    >
                      Más elegido
                    </span>
                  )}
                  <div>
                    <p className="text-lg font-medium" style={{ color: highlighted ? theme.bg : theme.text }}>{p.name}</p>
                    <p className="text-5xl font-light mt-3 tabular-nums" style={{ color: highlighted ? theme.accent : theme.primary, fontFamily: 'var(--font-display)' }}>
                      {formatPlanPrice(key, currency)}<span className="text-sm" style={{ color: theme.textMuted }}>/mes</span>
                    </p>
                  </div>
                  <ul className="space-y-2.5 flex-1 pt-2">
                    {p.features?.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: highlighted ? theme.borderSoft : theme.text }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={highlighted ? theme.accent : theme.primary} strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={signupHref}
                    onClick={persistVertical}
                    className="w-full py-3 rounded-full text-sm font-semibold transition-all text-center hover:brightness-110"
                    style={
                      highlighted
                        ? { backgroundColor: theme.accent, color: theme.text, boxShadow: `0 8px 20px ${theme.accent}33` }
                        : { backgroundColor: theme.text, color: theme.bg }
                    }
                  >
                    Empezar gratis
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 sm:px-6 py-20 sm:py-28 max-w-3xl mx-auto text-center space-y-7">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Deja que tu agenda<br /><em style={{ color: 'var(--primary)' }}>se llene sola</em>
        </h2>
        <p className="text-lg leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--text-soft)' }}>
          Prueba 14 días completos. Si no te hace la vida más fácil, simplemente no pagas. Así de simple.
        </p>
        <div className="pt-4">
          <Link
            href={signupHref}
            onClick={persistVertical}
            className="group inline-flex items-center gap-2 text-base font-medium px-8 py-4 rounded-full transition-all shadow-xl hover:brightness-110"
            style={{ backgroundColor: theme.text, color: theme.bg, boxShadow: `0 20px 40px ${theme.text}25` }}
          >
            Empezar gratis 14 días
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin tarjeta · Cancela cuando quieras</p>
      </section>

      {/* Footer */}
      <footer className="px-5 sm:px-6 py-10" style={{ backgroundColor: theme.borderSoft, borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo variant="isotipo" size={28} ariaLabel="AgendaFlow" />
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>© 2026 AgendaFlow Beauty</p>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-soft)' }}>
            <Link href="/legal/terminos" className="transition-colors hover:opacity-80">Términos</Link>
            <Link href="/legal/privacidad" className="transition-colors hover:opacity-80">Privacidad</Link>
            <Link href="/login" className="transition-colors hover:opacity-80">Entrar</Link>
          </div>
        </div>
      </footer>

      <LandingJsonLd />
    </div>
  )
}
