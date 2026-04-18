import { DM_Sans, Cormorant_Garamond } from 'next/font/google'
import Sidebar from '@/components/dashboard/Sidebar'
import AuthGuard from '@/components/dashboard/AuthGuard'
import TrialBanner from '@/components/dashboard/TrialBanner'
import PaymentFailedBanner from '@/components/dashboard/PaymentFailedBanner'
import { OrgProvider } from '@/lib/org-context'

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
        <OrgProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto scrollbar-hide flex flex-col">
            <TrialBanner />
            <PaymentFailedBanner />
            <div className="flex-1">{children}</div>
          </main>
        </OrgProvider>
      </AuthGuard>
    </div>
  )
}
