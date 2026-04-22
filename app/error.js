'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    logger.error('app_error_boundary', error, { digest: error?.digest })
  }, [error])

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-5">
        <p className="text-red-400 text-[10px] tracking-[0.3em] uppercase">Algo salió mal</p>
        <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
          Ups, error inesperado
        </h1>
        <p className="text-[#555] text-sm">Intenta de nuevo. Si persiste, avísanos.</p>
        <button
          onClick={() => reset()}
          className="bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
