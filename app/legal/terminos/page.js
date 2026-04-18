import Link from 'next/link'

export const metadata = { title: 'Términos y Condiciones — AgendaFlow' }

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#C8C3BC]">
      <nav className="border-b border-[#111] px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-[#888] hover:text-[#E8E3DC] text-sm">← Volver</Link>
        </div>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 space-y-6 text-sm leading-relaxed">
        <h1 className="text-[#F0EBE3] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Términos y Condiciones</h1>
        <p className="text-[#666]">Última actualización: 16 de abril de 2026</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">1. Aceptación de los términos</h2>
        <p>Al acceder y utilizar AgendaFlow ("el Servicio"), aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo, no debes usar el Servicio.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">2. Descripción del servicio</h2>
        <p>AgendaFlow es una plataforma SaaS para gestión de citas, clientes y comunicaciones por WhatsApp dirigida a negocios del sector belleza. Operamos como Encargado del Tratamiento respecto a los datos personales que tu negocio almacena en la plataforma.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">3. Cuenta y suscripciones</h2>
        <p>Para usar el Servicio debes crear una cuenta proporcionando información verídica. Las suscripciones se facturan mensualmente por adelantado. Ofrecemos un periodo de prueba de 14 días sin coste y sin requerir tarjeta. Puedes cancelar tu suscripción en cualquier momento desde el panel de facturación; el acceso continuará hasta el final del periodo ya pagado.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">4. Uso aceptable</h2>
        <p>Te comprometes a no usar el Servicio para fines ilegales, enviar spam, suplantar a terceros, vulnerar derechos de propiedad intelectual o cargar contenido ofensivo. Nos reservamos el derecho a suspender cuentas que incumplan estas reglas.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">5. Mensajería WhatsApp</h2>
        <p>El Servicio se integra con WhatsApp Business Platform de Meta. Eres responsable de cumplir con las políticas de comercio y mensajería de WhatsApp y obtener el consentimiento de tus clientes para recibir mensajes automatizados.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">6. Propiedad intelectual</h2>
        <p>El software, marca, diseño y código de AgendaFlow son propiedad exclusiva de sus creadores. Te otorgamos una licencia limitada, no exclusiva e intransferible para usar el Servicio mientras tu suscripción esté activa.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">7. Limitación de responsabilidad</h2>
        <p>El Servicio se proporciona "tal cual". No nos hacemos responsables de daños indirectos derivados del uso o imposibilidad de uso del Servicio. Nuestra responsabilidad máxima se limita al importe pagado en los últimos 12 meses.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">8. Cambios y terminación</h2>
        <p>Podemos modificar estos términos avisando con 30 días de antelación. Podemos suspender el Servicio por mantenimiento o por incumplimiento.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">9. Ley aplicable</h2>
        <p>Estos términos se rigen por la legislación española. Cualquier disputa se someterá a los tribunales competentes de Madrid, salvo lo dispuesto por la normativa de protección al consumidor.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">10. Contacto</h2>
        <p>Para cualquier consulta sobre estos términos: <a href="mailto:hola@agendaes.com" className="text-[#C8A96E] hover:underline">hola@agendaes.com</a></p>
      </article>
    </div>
  )
}
