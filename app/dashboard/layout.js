import Sidebar from '@/components/dashboard/Sidebar'
import AuthGuard from '@/components/dashboard/AuthGuard'
import TrialBanner from '@/components/dashboard/TrialBanner'
import PaymentFailedBanner from '@/components/dashboard/PaymentFailedBanner'
import { OrgProvider } from '@/lib/org-context'

export const metadata = {
  title: 'AgendaFlow Beauty — Panel',
}

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#080808] overflow-hidden"
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
