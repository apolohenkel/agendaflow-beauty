'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const DURACIONES = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hora', value: 60 },
  { label: '1h 30min', value: 90 },
  { label: '2 horas', value: 120 },
]

export default function NuevaCitaModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    clientName: '',
    clientPhone: '',
    serviceName: '',
    staffName: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.clientName || !form.clientPhone || !form.date || !form.time) {
      setError('Completa los campos obligatorios.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // 1. Obtener o crear negocio por defecto
      let businessId = null
      const { data: businesses } = await supabase.from('businesses').select('id').limit(1)
      if (businesses && businesses.length > 0) {
        businessId = businesses[0].id
      } else {
        const { data: newBiz } = await supabase
          .from('businesses')
          .insert({ name: 'Mi Negocio', timezone: 'America/Guatemala' })
          .select('id')
          .single()
        businessId = newBiz?.id
      }

      // 2. Obtener o crear cliente
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
        const { data: newClient } = await supabase
          .from('clients')
          .insert({ business_id: businessId, name: form.clientName, phone: form.clientPhone, whatsapp_phone: form.clientPhone })
          .select('id')
          .single()
        clientId = newClient?.id
      }

      // 3. Obtener o crear servicio si se especificó
      let serviceId = null
      if (form.serviceName.trim()) {
        const { data: existingService } = await supabase
          .from('services')
          .select('id')
          .eq('name', form.serviceName.trim())
          .eq('business_id', businessId)
          .maybeSingle()

        if (existingService) {
          serviceId = existingService.id
        } else {
          const { data: newService } = await supabase
            .from('services')
            .insert({ business_id: businessId, name: form.serviceName.trim(), duration_minutes: form.duration })
            .select('id')
            .single()
          serviceId = newService?.id
        }
      }

      // 4. Obtener o crear staff si se especificó
      let staffId = null
      if (form.staffName.trim()) {
        const { data: existingStaff } = await supabase
          .from('staff')
          .select('id')
          .eq('name', form.staffName.trim())
          .eq('business_id', businessId)
          .maybeSingle()

        if (existingStaff) {
          staffId = existingStaff.id
        } else {
          const { data: newStaff } = await supabase
            .from('staff')
            .insert({ business_id: businessId, name: form.staffName.trim() })
            .select('id')
            .single()
          staffId = newStaff?.id
        }
      }

      // 5. Crear la cita
      const startsAt = new Date(`${form.date}T${form.time}:00`)
      const endsAt = new Date(startsAt.getTime() + form.duration * 60000)

      await supabase.from('appointments').insert({
        business_id: businessId,
        client_id: clientId,
        service_id: serviceId,
        staff_id: staffId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'confirmed',
        notes: form.notes || null,
        source: 'manual',
      })

      onCreated()
      onClose()
    } catch (err) {
      setError('Error al crear la cita. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A]">
          <h2 className="text-[#F0EBE3] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Nueva cita
          </h2>
          <button onClick={onClose} className="text-[#444] hover:text-[#888] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Cliente */}
          <div className="space-y-1">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Cliente *</p>
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
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Servicio</p>
              <input
                type="text"
                placeholder="Ej: Corte de cabello"
                value={form.serviceName}
                onChange={(e) => set('serviceName', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Colaborador</p>
              <input
                type="text"
                placeholder="Ej: Carlos"
                value={form.staffName}
                onChange={(e) => set('staffName', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Fecha *</p>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Hora *</p>
              <input
                type="time"
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-1">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Duración</p>
            <div className="flex gap-2 flex-wrap">
              {DURACIONES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => set('duration', d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.duration === d.value
                      ? 'bg-[#C8A96E]/15 text-[#C8A96E] border border-[#C8A96E]/30'
                      : 'bg-[#0D0D0D] text-[#555] border border-[#1E1E1E] hover:border-[#333]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Notas</p>
            <textarea
              placeholder="Indicaciones especiales..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[#555] border border-[#1E1E1E] hover:border-[#333] hover:text-[#888] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
