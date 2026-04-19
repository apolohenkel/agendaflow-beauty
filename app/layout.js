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

export const metadata = {
  title: 'AgendaFlow Beauty',
  description: 'Panel de gestión para salones de belleza',
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
