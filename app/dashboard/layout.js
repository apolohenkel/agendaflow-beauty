import { DM_Sans, Cormorant_Garamond } from 'next/font/google'
import Sidebar from '@/components/dashboard/Sidebar'
import AuthGuard from '@/components/dashboard/AuthGuard'

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
  title: 'AgendaFlow Beauty — Panel',
}

export default function DashboardLayout({ children }) {
  return (
    <div className={`${dmSans.variable} ${cormorant.variable} flex h-screen bg-[#080808] overflow-hidden`}
      style={{ fontFamily: 'var(--font-body)' }}>
      <AuthGuard>
        <Sidebar />
        <main className="flex-1 overflow-auto scrollbar-hide">
          {children}
        </main>
      </AuthGuard>
    </div>
  )
}
