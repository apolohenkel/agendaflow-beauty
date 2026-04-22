'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/Toast'
import { localToUtcIso } from '@/lib/tz'

export default function NuevaCitaModal({ onClose, onCreated }) {
  const { businessId, business } = useOrg()
  const { toast } = useToast()
  const supabase = createClient()

  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    staffId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    notes: '',
  })
  const [services, setServices] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  // Duración calculada desde el servicio seleccionado
  const selectedService = services.find((s) => s.id === form.serviceId)
  const duration = selectedService?.duration_minutes || 60

  useEffect(() => {
    if (!businessId) return
    async function loadData() {
      const [{ data: svcs }, { data: stf }] = await Promise.all([
        supabase.from('services').select('id, name, duration_minutes, price').eq('business_id', businessId).eq('active', true).order('name'),
        supabase.from('staff').select('id, name, role').eq('business_id', businessId).eq('active', true).order('name'),
      ])
      setServices(svcs || [])
      setStaff(stf || [])
      setLoadingData(false)
    }
    loadData()
  }, [businessId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.clientName || !form.clientPhone || !form.date || !form.time) {
      setError('Completa los campos obligatorios.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // Obtener o crear cliente
      let clientId = null
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', form.clientPhone)
        .eq('business_id', businessId)
        .maybeSingle()

      if (existingClient) {
        clientId = existingClient.id
      } else {
        const { data: newClient, error: insertErr } = await supabase
          .from('clients')
          .insert({ business_id: businessId, name: form.clientName, phone: form.clientPhone, whatsapp_phone: form.clientPhone })
          .select('id').single()
        if (insertErr) throw insertErr
        clientId = newClient?.id
        // BUG 4 fix: propagar error explícito si el insert no retornó ID
        if (!clientId) throw new Error('No se pudo registrar al cliente. Intenta de nuevo.')
      }

      // BUG 3 fix: convertir hora local del negocio a UTC correctamente
      const [hh, mm] = form.time.split(':').map(Number)
      const tz = business?.timezone || 'America/Guatemala'
      const startsAtIso = localToUtcIso(form.date, hh, mm, tz)
      const endsAtIso = new Date(new Date(startsAtIso).getTime() + duration * 60000).toISOString()

      const { error: bookErr } = await supabase.rpc('book_appointment', {
        p_business_id: businessId,
        p_client_id: clientId,
        p_service_id: form.serviceId || null,
        p_staff_id: form.staffId || null,
        p_starts_at: startsAtIso,
        p_ends_at: endsAtIso,
        p_status: 'confirmed',
        p_source: 'manual',
        p_notes: form.notes || null,
      })
      if (bookErr) throw bookErr

      // OPP 3: confirmar creación antes de cerrar
      toast('Cita creada correctamente', 'success')
      onCreated()
      onClose()
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('slot_unavailable')) {
        setError('Ese horario ya tiene una cita. Elige otra hora.')
      } else if (msg.includes('plan_limit_reached')) {
        setError('Alcanzaste el límite de citas de tu plan este mes. Actualiza tu plan en Facturación.')
      } else if (msg.includes('trial_expired') || msg.includes('no_active_plan')) {
        setError('Tu prueba terminó o no tienes plan activo. Ve a Facturación para suscribirte.')
      } else if (msg.includes('No se pudo registrar')) {
        setError(msg)
      } else {
        setError('Error al crear la cita. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A]">
          <h2 className="text-[#F0EBE3] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Nueva cita
          </h2>
          <button onClick={onClose} className="text-[#444] hover:text-[#888] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Cliente */}
            <div className="space-y-1">
              <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Cliente *</p>
              <input
                type="text"
                placeholder="Nombre completo"
                value={form.clientName}
                onChange={(e) => set('clientName', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
              <input
                type="text"
                placeholder="Teléfono / WhatsApp *"
                value={form.clientPhone}
                onChange={(e) => set('clientPhone', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>

            {/* Servicio y Staff */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Servicio</p>
                <select
                  value={form.serviceId}
                  onChange={(e) => set('serviceId', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors appearance-none"
                  style={{ color: form.serviceId ? '#E8E3DC' : '#333' }}
                >
                  <option value="">Sin asignar</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id} style={{ color: '#E8E3DC', background: '#111' }}>
                      {s.name}{s.price != null ? ` — Q${Number(s.price).toFixed(0)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Colaborador</p>
                <select
                  value={form.staffId}
                  onChange={(e) => set('staffId', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors appearance-none"
                  style={{ color: form.staffId ? '#E8E3DC' : '#333' }}
                >
                  <option value="">Cualquiera</option>
                  {staff.map((m) => (
                    <option key={m.id} value={m.id} style={{ color: '#E8E3DC', background: '#111' }}>
                      {m.name}{m.role ? ` (${m.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duración calculada */}
            {selectedService && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#C8A96E]/5 border border-[#C8A96E]/15 rounded-xl">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-[#C8A96E] text-xs">
                  Duración: {duration < 60 ? `${duration} min` : `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}min` : ''}`}
                </p>
              </div>
            )}

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Fecha *</p>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Hora *</p>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => set('time', e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Notas</p>
              <textarea
                placeholder="Indicaciones especiales..."
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[#555] border border-[#1E1E1E] hover:border-[#333] hover:text-[#888] transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Guardando...' : 'Crear cita'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
