'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/lib/org-context'

const ROLES = ['Estilista', 'Colorista', 'Manicurista', 'Barbero', 'Esteticista', 'Admin', 'Otro']

const DIAS = [
  { key: 0, label: 'Dom' },
  { key: 1, label: 'Lun' },
  { key: 2, label: 'Mar' },
  { key: 3, label: 'Mié' },
  { key: 4, label: 'Jue' },
  { key: 5, label: 'Vie' },
  { key: 6, label: 'Sáb' },
]

const DEFAULT_HORARIO = { start: '09:00', end: '18:00' }

// ─── MODAL PERSONAL ───────────────────────────────────────────────────────────
function PersonalModal({ miembro, businessId, onClose, onSaved }) {
  const isEdit = Boolean(miembro)
  const [form, setForm] = useState({
    name: miembro?.name || '',
    role: miembro?.role || '',
    phone: miembro?.phone || '',
    active: miembro?.active ?? true,
  })
  // Días activos con su horario
  const [schedule, setSchedule] = useState(() => {
    if (miembro?.schedule_config) {
      try { return miembro.schedule_config } catch { }
    }
    // Por defecto Lun-Sáb
    return { 1: DEFAULT_HORARIO, 2: DEFAULT_HORARIO, 3: DEFAULT_HORARIO, 4: DEFAULT_HORARIO, 5: DEFAULT_HORARIO, 6: DEFAULT_HORARIO }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  function toggleDia(key) {
    setSchedule((prev) => {
      const next = { ...prev }
      if (next[key]) { delete next[key] } else { next[key] = DEFAULT_HORARIO }
      return next
    })
  }

  function setHorario(dia, field, val) {
    setSchedule((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: val },
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setLoading(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      role: form.role || null,
      phone: form.phone.trim() || null,
      active: form.active,
      schedule_config: schedule,
    }

    try {
      if (isEdit) {
        const { error: err } = await supabase.from('staff').update(payload).eq('id', miembro.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('staff').insert({ ...payload, business_id: businessId })
        if (err) throw err
      }
      onSaved()
      onClose()
    } catch (err) {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111] border border-[#222] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A] sticky top-0 bg-[#111] z-10">
          <h2 className="text-[#F0EBE3] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
            {isEdit ? 'Editar colaborador' : 'Nuevo colaborador'}
          </h2>
          <button onClick={onClose} className="text-[#444] hover:text-[#888] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Nombre y teléfono */}
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Nombre *</p>
              <input
                type="text"
                placeholder="Ej: María García"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[#555] text-[10px] uppercase tracking-widest">Teléfono</p>
              <input
                type="text"
                placeholder="Ej: +502 5555-1234"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
          </div>

          {/* Rol */}
          <div className="space-y-1">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Rol</p>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map((rol) => (
                <button
                  key={rol}
                  type="button"
                  onClick={() => set('role', form.role === rol ? '' : rol)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.role === rol
                      ? 'bg-[#C8A96E]/15 text-[#C8A96E] border border-[#C8A96E]/30'
                      : 'bg-[#0D0D0D] text-[#555] border border-[#1E1E1E] hover:border-[#333]'
                  }`}
                >
                  {rol}
                </button>
              ))}
            </div>
          </div>

          {/* Horario semanal */}
          <div className="space-y-3">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Horario semanal</p>
            <div className="space-y-2">
              {DIAS.map(({ key, label }) => {
                const active = Boolean(schedule[key])
                return (
                  <div key={key} className={`rounded-xl border transition-colors ${active ? 'border-[#2A2A2A] bg-[#0D0D0D]' : 'border-[#161616] bg-transparent'}`}>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleDia(key)}
                        className={`relative w-8 h-5 rounded-full transition-colors shrink-0 ${active ? 'bg-[#C8A96E]' : 'bg-[#2A2A2A]'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${active ? 'left-3.5' : 'left-0.5'}`} />
                      </button>
                      <p className={`text-xs font-medium w-8 ${active ? 'text-[#C8C3BC]' : 'text-[#333]'}`}>{label}</p>
                      {active && (
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="time"
                            value={schedule[key]?.start || '09:00'}
                            onChange={(e) => setHorario(key, 'start', e.target.value)}
                            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2 py-1 text-[#E8E3DC] text-xs focus:outline-none focus:border-[#C8A96E]/50 w-24"
                          />
                          <span className="text-[#333] text-xs">—</span>
                          <input
                            type="time"
                            value={schedule[key]?.end || '18:00'}
                            onChange={(e) => setHorario(key, 'end', e.target.value)}
                            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-2 py-1 text-[#E8E3DC] text-xs focus:outline-none focus:border-[#C8A96E]/50 w-24"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activo */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[#C8C3BC] text-sm">Colaborador activo</p>
              <p className="text-[#444] text-xs mt-0.5">Aparece disponible para asignar citas</p>
            </div>
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-[#C8A96E]' : 'bg-[#2A2A2A]'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.active ? 'left-5' : 'left-1'}`} />
            </button>
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
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] transition-all disabled:opacity-50">
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── AVATAR INICIAL ───────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div className="w-10 h-10 rounded-xl bg-[#C8A96E]/10 border border-[#C8A96E]/20 flex items-center justify-center shrink-0">
      <span className="text-[#C8A96E] text-sm font-semibold">{initials}</span>
    </div>
  )
}

// ─── CHIPS DE HORARIO ─────────────────────────────────────────────────────────
function HorarioChips({ schedule }) {
  if (!schedule) return null
  const activos = DIAS.filter((d) => schedule[d.key])
  if (activos.length === 0) return <p className="text-[#333] text-xs">Sin horario</p>
  return (
    <div className="flex gap-1 flex-wrap">
      {activos.map(({ key, label }) => (
        <span key={key} className="text-[10px] text-[#555] border border-[#1E1E1E] px-1.5 py-0.5 rounded">
          {label} {schedule[key]?.start}–{schedule[key]?.end}
        </span>
      ))}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function PersonalPage() {
  const { businessId } = useOrg()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('business_id', businessId)
      .order('name')
    setStaff(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    await supabase.from('staff').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  function openNew() { setEditTarget(null); setShowModal(true) }
  function openEdit(m) { setEditTarget(m); setShowModal(true) }

  const activeCount = staff.filter((s) => s.active).length

  return (
    <div className="min-h-screen bg-[#080808] p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Personal
          </h1>
          <p className="text-[#383430] text-xs mt-1">
            {loading ? '...' : `${staff.length} colaboradores · ${activeCount} activos`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo colaborador
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#1C1C1C] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E2E2E" strokeWidth="1.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[#383430] text-sm">Sin colaboradores aún</p>
            <p className="text-[#222] text-xs mt-1">Agrega a tu equipo de trabajo</p>
          </div>
          <button
            onClick={openNew}
            className="mt-2 px-4 py-2 bg-[#C8A96E]/10 hover:bg-[#C8A96E]/15 text-[#C8A96E] text-xs font-medium rounded-xl border border-[#C8A96E]/20 transition-all"
          >
            Agregar primer colaborador
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {staff.map((m) => (
            <div
              key={m.id}
              className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl px-6 py-5 flex items-start gap-5 hover:border-[#2A2A2A] transition-colors group"
            >
              <Avatar name={m.name} />

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-[#E8E3DC] text-sm font-medium truncate">{m.name}</p>
                  {m.role && (
                    <span className="text-[#555] text-[10px] border border-[#1E1E1E] px-2 py-0.5 rounded-full shrink-0">
                      {m.role}
                    </span>
                  )}
                  {!m.active && (
                    <span className="text-[#444] text-[10px] bg-[#111] border border-[#1E1E1E] px-2 py-0.5 rounded-full shrink-0">
                      Inactivo
                    </span>
                  )}
                </div>
                {m.phone && (
                  <p className="text-[#444] text-xs">{m.phone}</p>
                )}
                <HorarioChips schedule={m.schedule_config} />
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                <button
                  onClick={() => openEdit(m)}
                  className="p-2 text-[#444] hover:text-[#C8A96E] hover:bg-[#C8A96E]/10 rounded-lg transition-all"
                  title="Editar"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteConfirm(m)}
                  className="p-2 text-[#444] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Eliminar"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PersonalModal
          miembro={editTarget}
          businessId={businessId}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={load}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[#111] border border-[#222] rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-[#F0EBE3] text-base font-medium">Eliminar colaborador</h3>
            <p className="text-[#666] text-sm">
              ¿Eliminar a <span className="text-[#C8C3BC]">{deleteConfirm.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[#555] border border-[#1E1E1E] hover:border-[#333] transition-all">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
