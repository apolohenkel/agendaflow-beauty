// Structured data (JSON-LD) para que Google, Bing, ChatGPT, Claude y
// Perplexity entiendan qué es AgendaFlow y lo citen/recomienden.
// Incluye 4 schemas estándar de schema.org:
//   1. SoftwareApplication (con pricing y rating)
//   2. Organization (con logo, social, sameAs)
//   3. FAQPage (los LLMs adoran esto — se usa directamente en respuestas)
//   4. WebSite (con SearchAction potencial para sitelinks search box)

import { PLANS } from '@/lib/plans'

const SITE_URL = 'https://agendaes.com'

export default function LandingJsonLd() {
  const softwareApp = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AgendaFlow Beauty',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: SITE_URL,
    description:
      'Software de agendamiento con bot de WhatsApp IA para salones de belleza, barberías, spas y nail studios en Latinoamérica. Reduce ausencias hasta 70% con recordatorios automáticos.',
    inLanguage: 'es',
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '160',
        priceCurrency: 'GTQ',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '160',
          priceCurrency: 'GTQ',
          billingIncrement: 1,
          billingDuration: 'P1M',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
        },
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '399',
        priceCurrency: 'GTQ',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '399',
          priceCurrency: 'GTQ',
          billingDuration: 'P1M',
        },
      },
      {
        '@type': 'Offer',
        name: 'Business',
        price: '799',
        priceCurrency: 'GTQ',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '799',
          priceCurrency: 'GTQ',
          billingDuration: 'P1M',
        },
      },
    ],
    featureList: [
      'Agenda online con vista calendario semanal',
      'Bot de WhatsApp con inteligencia artificial que agenda, reagenda y cancela',
      'Recordatorios automáticos 24h y 2h antes de cada cita',
      'Booking público con logo y color del negocio',
      'CRM con historial por cliente, etiquetas y cumpleaños',
      'Programa de fidelidad configurable',
      'Reportes de ingresos y ausencias',
      'Multi-sucursal en plan Business',
      'Multi-moneda y multi-timezone',
    ],
    screenshot: `${SITE_URL}/og-image.png`,
    softwareVersion: '1.0',
    releaseNotes: 'Bot de WhatsApp con IA · Booking público · CRM · Reportes',
  }

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AgendaFlow Beauty',
    legalName: 'Szofa',
    url: SITE_URL,
    logo: `${SITE_URL}/brand/agendaflow-app-icon-1024.svg`,
    foundingLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'GT',
        addressLocality: 'Ciudad de Guatemala',
      },
    },
    sameAs: [
      // Agregar cuando existan: Instagram, Facebook, LinkedIn, X
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Spanish', 'English'],
      email: 'no-reply@agendaes.com',
    },
  }

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Qué es AgendaFlow Beauty?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AgendaFlow Beauty es un software de agendamiento con bot de WhatsApp IA diseñado para salones de belleza, barberías, spas y nail studios en Latinoamérica. Automatiza la agenda, envía recordatorios automáticos y ofrece un link público de reservas con la marca del negocio.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cómo funciona el bot de WhatsApp?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'El bot se conecta a tu número de WhatsApp Business y contesta automáticamente a tus clientes usando inteligencia artificial. Puede consultar disponibilidad, agendar, reprogramar y cancelar citas sin intervención humana, como una recepcionista que trabaja 24/7.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuánto cuesta AgendaFlow?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Desde Q160 al mes (aproximadamente $19 USD). El plan Starter incluye 1 usuario y 100 citas mensuales. El plan Pro a Q399/mes agrega bot de WhatsApp con IA y usuarios ilimitados. El plan Business a Q799/mes permite hasta 3 sucursales. Todos tienen 14 días gratis sin tarjeta.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Es para salones grandes o pequeños?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Funciona para ambos. Desde un salón independiente con 1 estilista (plan Starter) hasta cadenas con 3 sucursales (plan Business). El software se adapta al tamaño del negocio y la paleta visual cambia según el rubro: beauty salon, barbería, nail studio o spa.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Reduce las ausencias (no-shows)?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sí. Los recordatorios automáticos 24h y 2h antes de cada cita reducen las ausencias hasta 70%. Los clientes pueden confirmar o cancelar con un solo toque desde WhatsApp. Además puedes cobrar una seña por servicio para comprometer la reserva.',
        },
      },
      {
        '@type': 'Question',
        name: '¿En qué países funciona?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Funciona en toda Latinoamérica y España. Los precios se muestran en la moneda local: GTQ (Guatemala), MXN (México), COP (Colombia), PEN (Perú), CLP (Chile), ARS (Argentina), EUR (España) y USD por defecto para otros países.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Puedo cancelar cuando quiera?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sí, sin permanencia. La cancelación es efectiva al final del ciclo ya pagado. Durante los 14 días de prueba no se hace ningún cobro — si cancelas antes, no pagas nada.',
        },
      },
    ],
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AgendaFlow Beauty',
    url: SITE_URL,
    inLanguage: 'es',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  )
}
