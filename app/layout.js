import { DM_Sans, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
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
    <html lang="es" className={`${dmSans.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-body)' }}>
        {children}
      </body>
    </html>
  )
}
