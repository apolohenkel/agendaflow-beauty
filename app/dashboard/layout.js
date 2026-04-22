import Sidebar from '@/components/dashboard/Sidebar'
import AuthGuard from '@/components/dashboard/AuthGuard'
import TrialBanner from '@/components/dashboard/TrialBanner'
import PaymentFailedBanner from '@/components/dashboard/PaymentFailedBanner'
import DashboardTheme from '@/components/dashboard/DashboardTheme'
import MobileTopBar from '@/components/dashboard/MobileTopBar'
import MobileBottomNav from '@/components/dashboard/MobileBottomNav'
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
            {/* Sidebar solo desktop */}
            <div className="hidden md:flex shrink-0">
              <Sidebar />
            </div>

            <div className="flex-1 flex flex-col md:overflow-auto">
              {/* Top bar solo mobile */}
              <MobileTopBar />

              <main className="flex-1 md:overflow-auto scrollbar-hide flex flex-col pb-20 md:pb-0">
                <TrialBanner />
                <PaymentFailedBanner />
                <div className="flex-1">{children}</div>
              </main>

              {/* Bottom nav solo mobile */}
              <MobileBottomNav />
            </div>
          </DashboardTheme>
        </OrgProvider>
      </AuthGuard>
    </ToastProvider>
  )
}
