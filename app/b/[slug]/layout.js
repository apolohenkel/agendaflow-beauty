import { createAdminClient } from '@/lib/supabase/admin'
import { getVertical, DEFAULT_VERTICAL } from '@/lib/verticals'

const SITE_URL = 'https://agendaes.com'

function verticalLabel(vertical) {
  switch (vertical) {
    case 'barbershop':  return 'Barbería'
    case 'beauty_salon':return 'Salón de belleza'
    case 'nail_salon':  return 'Nail studio'
    case 'spa':         return 'Spa'
    default:            return 'Salón'
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  try {
    const admin = createAdminClient()
    const { data: org } = await admin
      .from('organizations')
      .select('name, logo_url, vertical')
      .eq('slug', slug)
      .maybeSingle()

    if (!org) {
      return {
        title: 'Reserva tu cita',
        description: 'Este negocio no está disponible.',
        robots: { index: false, follow: false },
      }
    }

    const vertical = org.vertical || DEFAULT_VERTICAL
    const label = verticalLabel(vertical)
    const v = getVertical(vertical)
    const title = `${org.name} · Reservar cita`
    const description = `Reserva tu cita en ${org.name} (${label}) en línea, 24/7. Elige tu servicio, horario y confirma en minutos. Agendamiento con ${v.copy.staffTerm} y recordatorios automáticos.`
    const url = `${SITE_URL}/b/${slug}`

    return {
      title,
      description,
      alternates: { canonical: url },
      keywords: [
        `reservar cita ${org.name}`,
        `${label} online`,
        `agendar ${org.name}`,
        `${org.name} horario`,
        `${label} cerca de mí`,
      ],
      openGraph: {
        title,
        description,
        url,
        siteName: 'AgendaFlow Beauty',
        locale: 'es_LA',
        type: 'website',
        images: org.logo_url ? [{ url: org.logo_url, alt: org.name }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: org.logo_url ? [org.logo_url] : undefined,
      },
      robots: { index: true, follow: true },
    }
  } catch {
    return { title: 'Reservar cita · AgendaFlow Beauty' }
  }
}

export default function BookLayout({ children }) {
  return children
}
