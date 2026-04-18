import Link from 'next/link'

export const metadata = { title: 'Política de Privacidad — AgendaFlow' }

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#C8C3BC]">
      <nav className="border-b border-[#111] px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-[#888] hover:text-[#E8E3DC] text-sm">← Volver</Link>
        </div>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 space-y-6 text-sm leading-relaxed">
        <h1 className="text-[#F0EBE3] text-3xl font-light" style={{ fontFamily: 'var(--font-display)' }}>Política de Privacidad</h1>
        <p className="text-[#666]">Última actualización: 16 de abril de 2026</p>

        <p>En AgendaFlow nos tomamos en serio la privacidad de tus datos y los de tus clientes. Esta política explica qué información recopilamos, cómo la usamos y cuáles son tus derechos bajo el RGPD.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">1. Responsable del tratamiento</h2>
        <p>AgendaFlow Beauty (en lo sucesivo, "nosotros") es el Responsable del tratamiento de los datos de registro de cuenta. Para los datos que tu negocio carga sobre sus propios clientes (nombres, teléfonos, historial de citas), tú eres el Responsable y nosotros actuamos como Encargado del Tratamiento.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">2. Datos que recopilamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>De tu cuenta:</strong> email, contraseña hasheada, nombre del negocio.</li>
          <li><strong>De tu uso:</strong> logs de acceso, IPs, errores técnicos.</li>
          <li><strong>De tus clientes (que tú cargas):</strong> nombre, teléfono, notas, historial de citas, mensajes WhatsApp intercambiados.</li>
          <li><strong>De pagos:</strong> procesados por Stripe; nosotros nunca vemos tu tarjeta.</li>
        </ul>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">3. Finalidades</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prestación del Servicio de gestión de citas y bot WhatsApp.</li>
          <li>Facturación y cobro de la suscripción.</li>
          <li>Soporte técnico y comunicaciones del Servicio.</li>
          <li>Mejora del producto (datos agregados y anonimizados).</li>
        </ul>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">4. Encargados (subprocesadores)</h2>
        <p>Compartimos datos estrictamente necesarios con:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> (Postgres y autenticación, Irlanda).</li>
          <li><strong>Vercel</strong> (hosting, EE.UU. con cláusulas tipo).</li>
          <li><strong>Stripe</strong> (pagos, EE.UU.).</li>
          <li><strong>Anthropic</strong> (IA del bot WhatsApp, EE.UU.). Los mensajes intercambiados con clientes finales son enviados al modelo para generar respuesta. No se usan para entrenamiento.</li>
          <li><strong>Meta WhatsApp Business Platform</strong> (entrega de mensajes).</li>
          <li><strong>Resend</strong> (envío de correos transaccionales).</li>
        </ul>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">5. Conservación</h2>
        <p>Conservamos los datos durante la vigencia de tu cuenta. Tras la cancelación, los datos se eliminan en un plazo máximo de 30 días, salvo obligaciones legales (facturación: 5 años).</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">6. Tus derechos</h2>
        <p>Bajo el RGPD tienes derecho de acceso, rectificación, supresión, oposición, limitación y portabilidad. Para ejercerlos: <a href="mailto:privacidad@agendaes.com" className="text-[#C8A96E] hover:underline">privacidad@agendaes.com</a>. También puedes presentar reclamación ante la AEPD.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">7. Cookies</h2>
        <p>Usamos solo cookies estrictamente necesarias para el funcionamiento (sesión de login). No usamos cookies de tracking publicitario.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">8. Cambios a esta política</h2>
        <p>Te avisaremos con 30 días de antelación de cambios sustanciales por correo.</p>

        <h2 className="text-[#E8E3DC] text-xl font-medium pt-4">9. Contacto</h2>
        <p>Para cualquier duda: <a href="mailto:privacidad@agendaes.com" className="text-[#C8A96E] hover:underline">privacidad@agendaes.com</a></p>
      </article>
    </div>
  )
}
