'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }) {
  const router  = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Verificar sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })

    // Escuchar cambios de sesión (logout desde otra pestaña, expiración)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080808]">
        <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
      </div>
    )
  }

  return children
}
