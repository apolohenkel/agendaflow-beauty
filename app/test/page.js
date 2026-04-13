'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [status, setStatus] = useState('Conectando...')

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('businesses').select('*')
      if (error) {
        setStatus('❌ Error: ' + error.message)
      } else {
        setStatus('✅ Conexión exitosa con Supabase. Tablas listas.')
      }
    }
    testConnection()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>AgendaFlow Beauty</h1>
      <p>{status}</p>
    </div>
  )
}
