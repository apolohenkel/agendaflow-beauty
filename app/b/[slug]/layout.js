import { createAdminClient } from '@/lib/supabase/admin'

export async function generateMetadata({ params }) {
  const { slug } = await params
  try {
    const admin = createAdminClient()
    const { data: org } = await admin
      .from('organizations')
      .select('name, logo_url')
      .eq('slug', slug)
      .maybeSingle()

    if (!org) {
      return { title: 'Reserva · AgendaFlow Beauty' }
    }

    return {
      title: `Reservar cita · ${org.name}`,
      description: `Agenda tu cita en ${org.name} en línea, 24/7.`,
      openGraph: {
        title: `Reservar cita · ${org.name}`,
        description: `Agenda tu cita en ${org.name} en línea.`,
        images: org.logo_url ? [{ url: org.logo_url }] : undefined,
      },
    }
  } catch {
    return { title: 'Reservar cita · AgendaFlow Beauty' }
  }
}

export default function BookLayout({ children }) {
  return children
}
