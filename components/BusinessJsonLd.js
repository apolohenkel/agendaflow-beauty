// LocalBusiness schema para cada negocio público — SEO local.
// Genera rich snippets en Google con horarios, ubicación, servicios.
// Google muestra "Reservar" si detecta LocalBusiness + Offer.

const SITE_URL = 'https://agendaes.com'

const DAY_SCHEMA = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

function toOpeningHoursSpec(openingHours) {
  if (!openingHours || typeof openingHours !== 'object') return []
  return Object.entries(openingHours)
    .map(([day, h]) => {
      const dayName = DAY_SCHEMA[Number(day)]
      if (!dayName || !h?.start || !h?.end) return null
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayName,
        opens: h.start,
        closes: h.end,
      }
    })
    .filter(Boolean)
}

function verticalToBusinessType(vertical) {
  switch (vertical) {
    case 'barbershop': return 'HairSalon'
    case 'beauty_salon': return 'BeautySalon'
    case 'nail_salon': return 'NailSalon'
    case 'spa': return 'DaySpa'
    default: return 'BeautySalon'
  }
}

export default function BusinessJsonLd({ org, business, services = [] }) {
  if (!org || !business) return null

  const url = `${SITE_URL}/b/${org.slug}`
  const businessType = verticalToBusinessType(org.vertical)

  const schema = {
    '@context': 'https://schema.org',
    '@type': businessType,
    '@id': url,
    name: org.name || business.name,
    url,
    description: `Reserva tu cita en ${org.name || business.name} con link propio, disponibilidad en tiempo real y confirmación automática.`,
    image: org.logo_url || undefined,
    telephone: business.whatsapp_number || business.phone || undefined,
    address: business.address ? {
      '@type': 'PostalAddress',
      streetAddress: business.address,
    } : undefined,
    openingHoursSpecification: toOpeningHoursSpec(business.opening_hours),
    priceRange: services.length > 0 ? (() => {
      const prices = services.filter((s) => s.price != null).map((s) => Number(s.price))
      if (prices.length === 0) return undefined
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      return min === max ? `Q${min}` : `Q${min}-Q${max}`
    })() : undefined,
    hasOfferCatalog: services.length > 0 ? {
      '@type': 'OfferCatalog',
      name: 'Servicios',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.category || undefined,
        },
        price: s.price != null ? String(s.price) : undefined,
        priceCurrency: 'GTQ',
      })),
    } : undefined,
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: url,
        actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
      },
      result: { '@type': 'Reservation', name: 'Cita' },
    },
  }

  // Limpia undefined para que el JSON-LD no tenga ruido
  const clean = JSON.parse(JSON.stringify(schema, (_, v) => (v === undefined ? undefined : v)))

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  )
}
