'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TIMEZONES = [
  'America/Mexico_City',
  'America/Guatemala',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'Europe/Madrid',
]

const TYPES = ['Barbería', 'Salón de belleza', 'Spa', 'Salón de uñas', 'Estética', 'Otro']

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [type, setType] = useState('Barbería')
  const [timezone, setTimezone] = useState('America/Mexico_City')
  const [seed, setSeed] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleNameChange(value) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, type, timezone, seed }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'No se pudo completar el alta. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="max-w-lg w-full bg-white p-8 rounded-2xl shadow-sm border border-neutral-200">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-1">Configura tu negocio</h1>
        <p className="text-sm text-neutral-600 mb-6">Solo lo esencial. Podrás ajustar todo después.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre del negocio</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8A96E]"
              placeholder="Ej: Salón Bella"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Tu URL pública</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">agendaes.com/b/</span>
              <input
                type="text"
                required
                pattern="[a-z0-9-]+"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8A96E]"
                placeholder="salon-bella"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Solo letras, números y guiones.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de negocio</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8A96E]"
            >
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Zona horaria</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8A96E]"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <label className="flex items-start gap-2 text-sm text-neutral-700 bg-neutral-50 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={seed}
              onChange={(e) => setSeed(e.target.checked)}
              className="mt-0.5 accent-[#C8A96E]"
            />
            <span>
              <span className="font-medium">Empezar con servicios y horario sugeridos</span>
              <span className="block text-xs text-neutral-500">Crea 3 servicios y horario L-V 9-19 / Sáb 10-15. Podrás editarlos.</span>
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8A96E] text-white py-2.5 rounded-lg font-medium hover:bg-[#b8985d] disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Continuar al panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
