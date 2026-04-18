'use client'

import Link from 'next/link'
import { useOrg } from '@/lib/org-context'

export default function PaymentFailedBanner() {
  const { subscription, loading } = useOrg()

  if (loading || subscription?.status !== 'past_due') return null

  return (
    <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3 flex items-center justify-between gap-4">
      <p className="text-red-300 text-sm">
        <strong>Pago fallido.</strong> Actualiza tu método de pago para mantener tu suscripción activa.
      </p>
      <Link
        href="/dashboard/billing"
        className="shrink-0 bg-red-400 hover:bg-red-300 text-[#080808] text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
      >
        Arreglar pago
      </Link>
    </div>
  )
}
