import Link from 'next/link'
import { PLANS, PUBLIC_PLANS } from '@/lib/plans'

export const metadata = {
  title: 'AgendaFlow — Tu salón merece una agenda que no duerma',
  description: 'El asistente de WhatsApp que agenda, confirma y recuerda citas por ti. Para salones de belleza, barberías y spas. 14 días gratis, sin tarjeta.',
}

// Paleta hospitality warm:
// Fondo: #FAF6F0 (crema papel)
// Superficie: #FFFFFF
// Borde: #EDE5DB
// Texto: #2B1810 (espresso)
// Texto 2: #6B5A4F (taupe)
// Acento: #B8824B (cobre quemado)
// Acento soft: #E8C5B8 (rosa polvo)
// Éxito: #7A9A6E (salvia)

function PainCard({ emoji, title, body }) {
  return (
    <div className="bg-white border border-[#EDE5DB] rounded-3xl p-7 space-y-3 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#B8824B]/5">
      <div className="text-3xl">{emoji}</div>
      <h3 className="text-[#2B1810] text-lg font-medium">{title}</h3>
      <p className="text-[#6B5A4F] text-sm leading-relaxed">{body}</p>
    </div>
  )
}

function Step({ n, title, body }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-12 h-12 rounded-full bg-[#B8824B] text-white flex items-center justify-center text-lg font-medium tabular-nums shadow-lg shadow-[#B8824B]/20" style={{ fontFamily: 'var(--font-display)' }}>
        {n}
      </div>
      <div className="flex-1 pt-1.5">
        <h3 className="text-[#2B1810] text-base font-semibold mb-1.5">{title}</h3>
        <p className="text-[#6B5A4F] text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function ChatPreview() {
  const msgs = [
    { from: 'client', text: '¿Tienen cita mañana para corte?' },
    { from: 'bot', text: '¡Hola! Sí, tengo disponible:\n\n🕙 10:30 con Laura\n🕒 15:00 con Carla\n\n¿Cuál te acomoda?' },
    { from: 'client', text: 'Las 3 está perfecto 🙌' },
    { from: 'bot', text: '✨ Listo. Te agendé con Carla mañana 15:00.\nTe recordamos 2h antes.' },
  ]
  return (
    <div className="relative mx-auto max-w-[340px]">
      <div className="absolute -inset-8 bg-gradient-to-br from-[#E8C5B8]/40 via-[#FAF6F0] to-[#B8824B]/15 rounded-[2.5rem] blur-2xl" aria-hidden />
      <div className="relative bg-[#FCF9F4] border border-[#EDE5DB] rounded-[2rem] p-4 space-y-2 shadow-2xl shadow-[#2B1810]/10">
        <div className="flex items-center gap-2.5 pb-3 px-1 border-b border-[#EDE5DB]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#B8824B] to-[#8C5E35] flex items-center justify-center text-white text-sm font-bold">S</div>
          <div className="flex-1">
            <p className="text-[#2B1810] text-sm font-semibold">Salón Sofía</p>
            <p className="text-[#7A9A6E] text-[11px] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#7A9A6E] animate-pulse" />en línea</p>
          </div>
        </div>
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] text-[13px] px-3.5 py-2 rounded-2xl leading-snug whitespace-pre-line ${
              m.from === 'client'
                ? 'bg-[#B8824B] text-white rounded-br-md shadow-sm'
                : 'bg-white text-[#2B1810] rounded-bl-md border border-[#EDE5DB] shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        <p className="text-center text-[#A89582] text-[10px] pt-2 italic">Así le contesta tu bot mientras tú atiendes</p>
      </div>
    </div>
  )
}

function Testimonial({ initial, name, role, text, accent }) {
  return (
    <div className="bg-white border border-[#EDE5DB] rounded-3xl p-7 space-y-4 flex flex-col">
      <div className="flex -space-x-0.5 text-[#E8B352]">
        {[1,2,3,4,5].map((i) => (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      <p className="text-[#2B1810] text-base leading-relaxed flex-1" style={{ fontFamily: 'var(--font-display)' }}>
        "{text}"
      </p>
      <div className="flex items-center gap-3 pt-3 border-t border-[#EDE5DB]">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${accent}`}>
          {initial}
        </div>
        <div>
          <p className="text-[#2B1810] text-sm font-semibold">{name}</p>
          <p className="text-[#6B5A4F] text-xs">{role}</p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2B1810]" style={{ fontFamily: 'var(--font-body)' }}>

      {/* Nav */}
      <nav className="px-4 sm:px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-[#B8824B] to-[#8C5E35] rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-[#B8824B]/20">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </div>
            <span className="text-[#2B1810] text-lg tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>AgendaFlow</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <Link href="/login" className="text-[#6B5A4F] hover:text-[#2B1810] text-sm transition-colors px-3 py-2">Entrar</Link>
            <Link href="/signup" className="bg-[#2B1810] hover:bg-[#3D241A] text-[#FAF6F0] text-sm font-medium px-4 sm:px-5 py-2.5 rounded-full transition-all whitespace-nowrap shadow-lg shadow-[#2B1810]/10">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-5 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-12 md:gap-16 items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 bg-white border border-[#EDE5DB] rounded-full pl-1 pr-4 py-1 shadow-sm">
              <span className="bg-[#E8C5B8] text-[#8C5E35] text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide uppercase">Nuevo</span>
              <span className="text-[#6B5A4F] text-xs">Bot de WhatsApp con IA · 14 días gratis</span>
            </div>
            <h1 className="text-[#2B1810] text-5xl sm:text-6xl md:text-[68px] leading-[1.05] font-light" style={{ fontFamily: 'var(--font-display)' }}>
              Tu salón merece<br />
              una agenda <em className="text-[#B8824B] not-italic font-normal" style={{ fontStyle: 'italic' }}>que no duerma</em>
            </h1>
            <p className="text-[#6B5A4F] text-lg leading-relaxed max-w-lg">
              Mientras cortas, tinturas o das masajes, un asistente contesta WhatsApp, agenda citas y recuerda a tus clientes. Tú sigues con lo que amas hacer.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/signup" className="group inline-flex items-center justify-center gap-2 bg-[#2B1810] hover:bg-[#3D241A] text-[#FAF6F0] text-base font-medium px-7 py-3.5 rounded-full transition-all shadow-xl shadow-[#2B1810]/15 hover:shadow-2xl hover:shadow-[#2B1810]/20">
                Probar gratis 14 días
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <a href="#como-funciona" className="inline-flex items-center justify-center gap-2 text-[#2B1810] text-base font-medium px-5 py-3.5 transition-all hover:bg-white rounded-full border border-[#EDE5DB]">
                Ver cómo funciona
              </a>
            </div>
            <div className="flex items-center gap-5 pt-4 text-[#6B5A4F] text-xs">
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A9A6E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Sin tarjeta
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A9A6E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Listo en 5 minutos
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A9A6E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Cancela cuando quieras
              </div>
            </div>
          </div>
          <div className="md:pl-4">
            <ChatPreview />
          </div>
        </div>
      </section>

      {/* Te suena familiar? */}
      <section className="px-5 sm:px-6 py-16 sm:py-24 bg-white border-y border-[#EDE5DB]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-[#B8824B] text-xs uppercase tracking-[0.22em] font-medium">Si tienes un salón, esto te suena</p>
            <h2 className="text-[#2B1810] text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Cada día pierdes dinero<br />sin darte cuenta
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <PainCard
              emoji="📵"
              title="Contestas WhatsApp 2 horas tarde"
              body="Mientras tenías al cliente en la silla, 5 mensajes quedaron sin responder. Cuando respondes, ya agendaron en el salón de al lado."
            />
            <PainCard
              emoji="💸"
              title="No-shows que te cuestan el día"
              body="Bloqueaste dos horas para María. No llegó. Tampoco avisó. Podrías haber atendido a otras dos clientas en ese hueco."
            />
            <PainCard
              emoji="🤯"
              title="Agenda en post-its, WhatsApp y cuadernos"
              body="¿A qué hora es Andrea? ¿Qué servicio pidió? ¿Ya confirmó? El caos mental que te llevas a la cama cada noche."
            />
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="px-5 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-16 items-start">
          <div className="space-y-3 md:sticky md:top-8">
            <p className="text-[#B8824B] text-xs uppercase tracking-[0.22em] font-medium">La solución</p>
            <h2 className="text-[#2B1810] text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Una recepcionista<br />que <em className="text-[#B8824B]">nunca descansa</em>
            </h2>
            <p className="text-[#6B5A4F] text-base leading-relaxed pt-2 max-w-md">
              Un bot en tu WhatsApp aprende tus precios, horarios y servicios. Conversa como una persona real, no como un formulario. Tus clientas ni se dan cuenta.
            </p>
          </div>
          <div className="space-y-10">
            <Step
              n="1"
              title="Crea tu cuenta en 2 minutos"
              body="Registras tu salón, nos dices qué servicios ofreces y a qué hora atiendes. Te sugerimos plantillas para que no empieces de cero."
            />
            <Step
              n="2"
              title="Conectas tu WhatsApp"
              body="Vinculamos tu número de WhatsApp Business. El bot aprende tu menú de servicios, precios y agenda. Empieza a contestar de inmediato."
            />
            <Step
              n="3"
              title="Contesta 24/7, incluso cuando duermes"
              body="Tus clientas agendan, reagendan, cancelan y pagan desde WhatsApp. Tú ves todo en un panel limpio. Recibes recordatorios antes de cada cita."
            />
            <Step
              n="4"
              title="Tu agenda se llena sola"
              body="Activamos recordatorios 24h y 2h antes — reduces no-shows hasta 70%. Compartes tu link de reservas en Instagram y recibes clientas nuevas."
            />
          </div>
        </div>
      </section>

      {/* Beneficios concretos */}
      <section className="px-5 sm:px-6 py-16 sm:py-24 bg-gradient-to-b from-[#FAF6F0] to-[#F4EADB]">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-[#B8824B] text-xs uppercase tracking-[0.22em] font-medium">Lo que recuperas</p>
            <h2 className="text-[#2B1810] text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Tu tiempo. Tu tranquilidad.<br />Tu ingreso.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 border border-[#EDE5DB] space-y-3">
              <p className="text-5xl font-light text-[#B8824B] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>70%</p>
              <p className="text-[#2B1810] text-base font-semibold">Menos no-shows</p>
              <p className="text-[#6B5A4F] text-sm leading-relaxed">Recordatorios automáticos 24h y 2h antes. Las clientas confirman o cancelan con un toque.</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-[#EDE5DB] space-y-3">
              <p className="text-5xl font-light text-[#B8824B] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>24/7</p>
              <p className="text-[#2B1810] text-base font-semibold">Contesta siempre</p>
              <p className="text-[#6B5A4F] text-sm leading-relaxed">Responde en segundos, incluso a las 11pm o el domingo. No vuelves a perder una clienta por demora.</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-[#EDE5DB] space-y-3">
              <p className="text-5xl font-light text-[#B8824B] tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>+32%</p>
              <p className="text-[#2B1810] text-base font-semibold">Más ingresos</p>
              <p className="text-[#6B5A4F] text-sm leading-relaxed">Salones que usan AgendaFlow llenan huecos antes muertos con clientas nuevas del booking público.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="px-5 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-12">
          <p className="text-[#B8824B] text-xs uppercase tracking-[0.22em] font-medium">Voces reales</p>
          <h2 className="text-[#2B1810] text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Dueñas como tú,<br />cambiando su día a día
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Testimonial
            initial="S"
            name="Sofía Martínez"
            role="Dueña, Estudio Sofía — CDMX"
            text="Antes perdía 3 o 4 clientas por semana por no contestar a tiempo. Desde que puse AgendaFlow, mi agenda está llena y yo descanso de verdad los domingos."
            accent="bg-gradient-to-br from-[#E8C5B8] to-[#B8824B]"
          />
          <Testimonial
            initial="M"
            name="Miguel Rojas"
            role="Barbero, Barber Club Centro — Bogotá"
            text="Mis clientes agendan solos por WhatsApp hasta las 2am. Yo solo veo la agenda llena al día siguiente. Se siente como tener una recepcionista sin pagarle sueldo."
            accent="bg-gradient-to-br from-[#3D241A] to-[#2B1810]"
          />
          <Testimonial
            initial="L"
            name="Laura Gómez"
            role="Spa Harmonía — Guatemala"
            text="Mis clientas ven mi logo, mis colores, mi link propio. Se siente súper profesional. Y los recordatorios bajaron los no-shows a casi cero."
            accent="bg-gradient-to-br from-[#7A9A6E] to-[#4E6A44]"
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="planes" className="px-5 sm:px-6 py-16 sm:py-24 bg-white border-y border-[#EDE5DB]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <p className="text-[#B8824B] text-xs uppercase tracking-[0.22em] font-medium">Planes</p>
            <h2 className="text-[#2B1810] text-4xl md:text-5xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Empieza gratis, paga<br />cuando estés segura
            </h2>
            <p className="text-[#6B5A4F] text-base pt-2">14 días completos gratis. Sin tarjeta. Cancela cuando quieras.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PUBLIC_PLANS.map((key) => {
              const p = PLANS[key]
              const highlighted = key === 'pro'
              return (
                <div
                  key={key}
                  className={`relative rounded-3xl p-7 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1 ${
                    highlighted
                      ? 'bg-[#2B1810] border border-[#2B1810] text-[#FAF6F0] shadow-2xl shadow-[#2B1810]/15 md:scale-105'
                      : 'bg-white border border-[#EDE5DB] hover:shadow-xl hover:shadow-[#B8824B]/10'
                  }`}
                >
                  {highlighted && (
                    <span className="absolute -top-3 left-7 bg-[#E8C5B8] text-[#8C5E35] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                      Más elegido
                    </span>
                  )}
                  <div>
                    <p className={`text-lg font-medium ${highlighted ? 'text-[#FAF6F0]' : 'text-[#2B1810]'}`}>{p.name}</p>
                    <p className={`text-5xl font-light mt-3 tabular-nums ${highlighted ? 'text-[#E8C5B8]' : 'text-[#B8824B]'}`} style={{ fontFamily: 'var(--font-display)' }}>
                      ${p.price}<span className={`text-sm ${highlighted ? 'text-[#A89582]' : 'text-[#A89582]'}`}>/mes</span>
                    </p>
                  </div>
                  <ul className="space-y-2.5 flex-1 pt-2">
                    {p.features?.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${highlighted ? 'text-[#E8DCC9]' : 'text-[#3D2C22]'}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={highlighted ? '#E8C5B8' : '#B8824B'} strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`w-full py-3 rounded-full text-sm font-semibold transition-all text-center ${
                      highlighted
                        ? 'bg-[#E8C5B8] text-[#2B1810] hover:bg-[#F0D4C7] shadow-lg'
                        : 'bg-[#2B1810] text-[#FAF6F0] hover:bg-[#3D241A]'
                    }`}
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
        <h2 className="text-[#2B1810] text-4xl md:text-6xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Deja que tu agenda<br /><em className="text-[#B8824B]">se llene sola</em>
        </h2>
        <p className="text-[#6B5A4F] text-lg leading-relaxed max-w-xl mx-auto">
          Prueba 14 días completos. Si no te hace la vida más fácil, simplemente no pagas. Así de simple.
        </p>
        <div className="pt-4">
          <Link href="/signup" className="group inline-flex items-center gap-2 bg-[#2B1810] hover:bg-[#3D241A] text-[#FAF6F0] text-base font-medium px-8 py-4 rounded-full transition-all shadow-xl shadow-[#2B1810]/15 hover:shadow-2xl hover:shadow-[#2B1810]/25">
            Empezar gratis 14 días
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <p className="text-[#A89582] text-xs">Sin tarjeta · Cancela cuando quieras</p>
      </section>

      {/* Footer */}
      <footer className="px-5 sm:px-6 py-10 border-t border-[#EDE5DB] bg-[#F4EADB]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-[#B8824B] to-[#8C5E35] rounded-lg flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </div>
            <p className="text-[#6B5A4F] text-sm">© 2026 AgendaFlow Beauty</p>
          </div>
          <div className="flex items-center gap-6 text-[#6B5A4F] text-sm">
            <Link href="/legal/terminos" className="hover:text-[#2B1810] transition-colors">Términos</Link>
            <Link href="/legal/privacidad" className="hover:text-[#2B1810] transition-colors">Privacidad</Link>
            <Link href="/login" className="hover:text-[#2B1810] transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
