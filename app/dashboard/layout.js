import Sidebar from '@/components/dashboard/Sidebar'
import AuthGuard from '@/components/dashboard/AuthGuard'
import TrialBanner from '@/components/dashboard/TrialBanner'
import PaymentFailedBanner from '@/components/dashboard/PaymentFailedBanner'
import DashboardTheme from '@/components/dashboard/DashboardTheme'
import { OrgProvider } from '@/lib/org-context'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata = {
  title: 'AgendaFlow Beauty — Panel',
}

export default function DashboardLayout({ children }) {
  return (
    <ToastProvider>
      <AuthGuard>
        <OrgProvider>
          <DashboardTheme>
            <Sidebar />
            <main className="flex-1 overflow-auto scrollbar-hide flex flex-col">
              <TrialBanner />
              <PaymentFailedBanner />
              <div className="flex-1">{children}</div>
            </main>
          </DashboardTheme>
        </OrgProvider>
      </AuthGuard>
    </ToastProvider>
  )
}
