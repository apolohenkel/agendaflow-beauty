import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700'],
  // Fraunces es variable: opsz (óptica) 9-144, soft 0-100. Usamos defaults.
  display: 'swap',
})

const SITE_URL = 'https://agendaes.com'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AgendaFlow Beauty — Agenda con WhatsApp y IA para salones, barberías y spas',
    template: '%s · AgendaFlow Beauty',
  },
  description: 'Software de agendamiento con bot de WhatsApp IA para salones de belleza, barberías, spas y nail studios en Latinoamérica. Reduce ausencias hasta 70% con recordatorios automáticos. 14 días gratis sin tarjeta.',
  applicationName: 'AgendaFlow Beauty',
  generator: 'Next.js',
  authors: [{ name: 'AgendaFlow', url: SITE_URL }],
  keywords: [
    'agenda salon belleza',
    'software barbería',
    'agendamiento online',
    'reservas WhatsApp',
    'bot WhatsApp salones',
    'sistema citas peluquería',
    'agenda spa',
    'agenda nail salon',
    'recordatorios automáticos citas',
    'booking salon Guatemala',
    'CRM salón de belleza',
    'reducir no-shows',
    'agenda online estética',
    'software para barbería Latinoamérica',
  ],
  category: 'business',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AgendaFlow Beauty — Tu agenda se llena sola con WhatsApp + IA',
    description: 'Software de agendamiento con bot de WhatsApp que contesta, agenda y recuerda por ti. Para salones, barberías, spas y nail studios. 14 días gratis.',
    url: SITE_URL,
    siteName: 'AgendaFlow Beauty',
    locale: 'es_LA',
    type: 'website',
    // Imagen generada dinámicamente por app/opengraph-image.js
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgendaFlow Beauty — Agenda con WhatsApp IA',
    description: 'Tu agenda se llena sola. Bot de WhatsApp con IA para salones, barberías y spas. 14 días gratis sin tarjeta.',
    // Imagen generada dinámicamente por app/twitter-image.js (usa el mismo OG)
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  verification: {
    // Rellenar cuando el dueño cree las propiedades en Search Console / Bing.
    // google: 'xxxx',
    // other: { 'msvalidate.01': 'xxxx' },
  },
}

// viewport separado en Next 16 — permite zoom, soporta safe-area (notch iOS)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0B0A08',
}

// Workaround Vercel CLI 51 + Next.js 16: el adapter no encuentra lambdas
// cuando hay rutas pre-renderizadas como Static (/legal/*, /login, /signup,
// etc). Forzar dinámico global genera lambdas para todas las rutas y
// desbloquea el deploy. Trade-off: sin SSG — aceptable para SaaS con auth.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-body)' }}>
        {children}
      </body>
    </html>
  )
}
