'use client'

import Link from 'next/link'
import { useOrg } from '@/lib/org-context'

function daysUntil(iso) {
  if (!iso) return null
  const ms = new Date(iso) - new Date()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function TrialBanner() {
  const { orgId, trialEndsAt, subscription, loading } = useOrg()

  if (loading || !orgId) return null
  if (subscription && ['active', 'trialing'].includes(subscription.status)) return null

  const days = daysUntil(trialEndsAt)
  const expired = days !== null && days <= 0

  if (days === null) return null

  if (expired) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-red-300 text-sm">
          <strong>Tu prueba gratis expiró.</strong> Suscríbete a un plan para seguir usando la plataforma.
        </p>
        <Link
          href="/dashboard/billing"
          className="shrink-0 bg-red-400 hover:bg-red-300 text-[#080808] text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
        >
          Ver planes
        </Link>
      </div>
    )
  }

  if (days <= 7) {
    return (
      <div className="bg-[#C8A96E]/10 border-b border-[#C8A96E]/20 px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-[#C8A96E] text-sm">
          <strong>Tu prueba gratis termina en {days} {days === 1 ? 'día' : 'días'}.</strong> Suscríbete para no perder acceso.
        </p>
        <Link
          href="/dashboard/billing"
          className="shrink-0 bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
        >
          Ver planes
        </Link>
      </div>
    )
  }

  return null
}
