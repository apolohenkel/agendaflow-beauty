import Link from 'next/link'
import { PLANS, PUBLIC_PLANS } from '@/lib/plans'

export const metadata = {
  title: 'AgendaFlow — Agenda y bot de WhatsApp para tu salón',
  description: 'Sistema de citas con bot de WhatsApp inteligente para barberías, salones de belleza, spas y estéticas. 14 días gratis.',
}

function Feature({ icon, title, body }) {
  return (
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-6 space-y-3">
      <div className="w-10 h-10 rounded-xl bg-[#C8A96E]/10 border border-[#C8A96E]/20 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-[#E8E3DC] text-base font-medium">{title}</h3>
      <p className="text-[#666] text-sm leading-relaxed">{body}</p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#E8E3DC]">

      {/* Nav */}
      <nav className="border-b border-[#111] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#C8A96E] rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </div>
            <span className="font-semibold tracking-wide">AgendaFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[#888] hover:text-[#E8E3DC] text-sm transition-colors">Entrar</Link>
            <Link href="/signup" className="bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold px-4 py-2 rounded-xl transition-all">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-block bg-[#C8A96E]/10 border border-[#C8A96E]/20 rounded-full px-3 py-1">
          <p className="text-[#C8A96E] text-xs font-medium tracking-wide">Bot de WhatsApp con IA · 14 días gratis</p>
        </div>
        <h1 className="text-[#F0EBE3] text-5xl md:text-6xl font-light leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          La agenda que llena<br />
          <span className="text-[#C8A96E]">tu salón sola</span>
        </h1>
        <p className="text-[#888] text-lg max-w-2xl mx-auto leading-relaxed">
          Tus clientes agendan citas por WhatsApp con un asistente inteligente que conversa como una persona, sabe tus precios y respeta tus horarios. Tú solo recibes a los clientes.
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <Link href="/signup" className="bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-base font-semibold px-6 py-3 rounded-xl transition-all">
            Empezar gratis 14 días
          </Link>
          <a href="#planes" className="text-[#888] hover:text-[#E8E3DC] text-base px-6 py-3 transition-colors">
            Ver planes →
          </a>
        </div>
        <p className="text-[#444] text-xs">Sin tarjeta · Configura en 5 minutos</p>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-center text-[#D4CFC8] text-3xl font-light mb-12" style={{ fontFamily: 'var(--font-display)' }}>
          Todo lo que necesitas, en un solo lugar
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Feature
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
            title="Bot de WhatsApp con IA"
            body="Conversa como una recepcionista experta. Agenda, reagenda, cancela y responde dudas 24/7."
          />
          <Feature
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /></svg>}
            title="Calendario unificado"
            body="Vista diaria, semanal y por colaborador. Estados de cita: pendiente, confirmada, no asistió, completada."
          />
          <Feature
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>}
            title="CRM integrado"
            body="Historial completo, notas privadas, total gastado y tasa de no-show por cliente."
          />
          <Feature
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /></svg>}
            title="Recordatorios automáticos"
            body="Mensajes 24h y 2h antes de cada cita por WhatsApp. Reduce tu no-show hasta 70%."
          />
          <Feature
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
            title="Reportes que hablan"
            body="Ingresos, ocupación, servicios top, comparativa vs período anterior. Sabes qué está creciendo."
          />
          <Feature
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
            title="Tu marca en booking"
            body="Logo, color y URL propia (agendaes.com/b/tu-salon). Tus clientes ven tu marca, no la nuestra."
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="planes" className="px-6 py-20 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-[#D4CFC8] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Planes para cada tamaño de negocio
          </h2>
          <p className="text-[#666] text-base">14 días de prueba gratis. Cancela cuando quieras.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PUBLIC_PLANS.map((key) => {
            const p = PLANS[key]
            const highlighted = key === 'pro'
            return (
              <div key={key} className={`relative bg-[#0D0D0D] border rounded-2xl p-6 flex flex-col gap-4 ${highlighted ? 'border-[#C8A96E]/40' : 'border-[#1A1A1A]'}`}>
                {highlighted && (
                  <span className="absolute -top-2 left-6 bg-[#C8A96E] text-[#080808] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Más popular
                  </span>
                )}
                <div>
                  <p className="text-[#E8E3DC] text-lg font-medium">{p.name}</p>
                  <p className="text-[#C8A96E] text-3xl font-light mt-2 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                    ${p.price}<span className="text-[#444] text-sm">/mes</span>
                  </p>
                </div>
                <ul className="space-y-2 flex-1">
                  {p.features?.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[#C8C3BC] text-sm">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="2.5" strokeLinecap="round" className="mt-1 shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all text-center ${
                    highlighted ? 'bg-[#C8A96E] text-[#080808] hover:bg-[#D4B87A]' : 'bg-[#1A1A1A] text-[#C8C3BC] border border-[#2A2A2A] hover:border-[#3A3A3A]'
                  }`}
                >
                  Empezar gratis
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20 text-center max-w-3xl mx-auto space-y-6">
        <h2 className="text-[#F0EBE3] text-3xl md:text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
          ¿Listo para llenar tu agenda?
        </h2>
        <p className="text-[#888] text-base">
          Crea tu cuenta en 2 minutos. Sin tarjeta, sin instalaciones, sin contratos.
        </p>
        <Link href="/signup" className="inline-block bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-base font-semibold px-6 py-3 rounded-xl transition-all">
          Empezar gratis 14 días →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#111] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[#444] text-xs">© 2026 AgendaFlow Beauty</p>
          <div className="flex items-center gap-5 text-[#666] text-xs">
            <Link href="/legal/terminos" className="hover:text-[#C8C3BC] transition-colors">Términos</Link>
            <Link href="/legal/privacidad" className="hover:text-[#C8C3BC] transition-colors">Privacidad</Link>
            <Link href="/login" className="hover:text-[#C8C3BC] transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
