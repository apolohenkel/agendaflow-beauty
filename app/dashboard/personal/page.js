'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import { logger } from '@/lib/logger'

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
function PersonalModal({ miembro, businessId, orgId, onClose, onSaved }) {
  const supabase = createClient()
  const isEdit = Boolean(miembro)
  const [form, setForm] = useState({
    name: miembro?.name || '',
    role: miembro?.role || '',
    phone: miembro?.phone || '',
    bio: miembro?.bio || '',
    photo_url: miembro?.photo_url || null,
    active: miembro?.active ?? true,
  })
  const [specialties, setSpecialties] = useState(Array.isArray(miembro?.specialties) ? miembro.specialties : [])
  const [specialtyInput, setSpecialtyInput] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
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

  function addSpecialty() {
    const t = specialtyInput.trim()
    if (!t) return
    if (specialties.includes(t) || specialties.length >= 8) { setSpecialtyInput(''); return }
    setSpecialties((xs) => [...xs, t])
    setSpecialtyInput('')
  }

  function removeSpecialty(t) {
    setSpecialties((xs) => xs.filter((x) => x !== t))
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !orgId) return
    if (file.size > 2 * 1024 * 1024) { setError('La imagen supera los 2 MB.'); return }
    setUploadingPhoto(true)
    setError(null)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `staff/${orgId}/${miembro?.id || `new-${Date.now()}`}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) {
      setError('No se pudo subir la foto.')
      setUploadingPhoto(false)
      return
    }
    const { data: pub } = supabase.storage.from('logos').getPublicUrl(path)
    setForm((f) => ({ ...f, photo_url: `${pub.publicUrl}?v=${Date.now()}` }))
    setUploadingPhoto(false)
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
      bio: form.bio.trim().slice(0, 300) || null,
      photo_url: form.photo_url,
      specialties,
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

          {/* Foto */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#111] border border-[#1E1E1E] flex items-center justify-center overflow-hidden shrink-0">
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E2E2E" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a7 7 0 0 1 14 0v1" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#1A1A1A] border border-[#2A2A2A] text-[#C8C3BC] hover:border-[#3A3A3A] transition-all w-fit">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                {uploadingPhoto ? 'Subiendo…' : form.photo_url ? 'Cambiar foto' : 'Subir foto'}
              </label>
              {form.photo_url && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, photo_url: null }))}
                  className="text-[#666] hover:text-red-400 text-xs text-left transition-colors w-fit">
                  Eliminar foto
                </button>
              )}
              <p className="text-[#666] text-[10px]">PNG, JPG o WEBP · máx 2 MB</p>
            </div>
          </div>

          {/* Nombre y teléfono */}
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Nombre *</p>
              <input
                type="text"
                placeholder="Ej: María García"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Teléfono</p>
              <input
                type="text"
                placeholder="Ej: +502 5555-1234"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Bio corta <span className="normal-case text-[#555]">(opcional · visible al cliente)</span></p>
            <textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Ej: 8 años en coloración. Especialista en balayage y rubios."
              className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors resize-none"
            />
            <p className="text-[10px] text-right text-[#555] tabular-nums">{form.bio.length}/300</p>
          </div>

          {/* Especialidades */}
          <div className="space-y-2">
            <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Especialidades <span className="normal-case text-[#555]">(hasta 8)</span></p>
            {specialties.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {specialties.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-[#C8A96E]/10 text-[#C8A96E] border border-[#C8A96E]/30 px-2.5 py-1 rounded-full">
                    {t}
                    <button type="button" onClick={() => removeSpecialty(t)} className="text-[#C8A96E]/60 hover:text-[#C8A96E]" aria-label="Quitar">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty() } }}
                placeholder="Ej: balayage, corte hombre, pedicura spa"
                className="flex-1 bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors"
              />
              <button type="button" onClick={addSpecialty}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#1A1A1A] border border-[#2A2A2A] text-[#C8C3BC] hover:border-[#3A3A3A] transition-all">
                Agregar
              </button>
            </div>
          </div>

          {/* Rol */}
          <div className="space-y-1">
            <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Rol</p>
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
            <p className="text-[#9A9A9A] text-[10px] uppercase tracking-widest">Horario semanal</p>
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
                          <span className="text-[#666] text-xs">—</span>
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
              <p className="text-[#888] text-xs mt-0.5">Aparece disponible para asignar citas</p>
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
function Avatar({ name, photoUrl }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={name} className="w-10 h-10 rounded-xl object-cover border border-[#2A2A2A] shrink-0" />
    )
  }
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
  if (activos.length === 0) return <p className="text-[#666] text-xs">Sin horario</p>
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
  const supabase = createClient()
  const { businessId, orgId } = useOrg()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('staff')
        .select('*')
        .eq('business_id', businessId)
        .order('name')
      if (err) throw err
      setStaff(data || [])
    } catch (err) {
      logger.error('personal', err)
    } finally {
      setLoading(false)
    }
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
    <div className="min-h-screen p-10 space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
            Tu equipo
          </p>
          <h1
            className="text-[var(--dash-text)] text-[44px] font-light leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Personal
            {!loading && staff.length > 0 && (
              <span className="text-[var(--dash-primary)] text-2xl ml-3" style={{ fontStyle: 'italic' }}>
                {staff.length}
              </span>
            )}
          </h1>
          {!loading && staff.length > 0 && (
            <p className="text-[var(--dash-text-muted)] text-xs">
              {activeCount} activos · {staff.length - activeCount} pausados
            </p>
          )}
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-primary-deep))',
            color: 'var(--dash-ink)',
            boxShadow: '0 6px 24px -6px var(--dash-primary)',
          }}
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
          <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[var(--dash-text-soft)] text-base italic" style={{ fontFamily: 'var(--font-display)' }}>
              Tu equipo empieza aquí
            </p>
            <p className="text-[var(--dash-text-muted)] text-xs mt-1">Agrega a tu primer colaborador</p>
          </div>
          <button onClick={openNew} className="text-[var(--dash-primary)] text-xs link-gold">
            Agregar primer colaborador →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {staff.map((m) => (
            <div
              key={m.id}
              className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl px-6 py-5 flex items-start gap-5 hover:border-[var(--dash-border-hover)] transition-all group card-sweep"
            >
              <Avatar name={m.name} photoUrl={m.photo_url} />

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[var(--dash-text)] text-sm font-medium truncate">{m.name}</p>
                  {m.role && (
                    <span className="text-[var(--dash-text-soft)] text-[9px] uppercase tracking-[0.1em] border border-[var(--dash-border)] px-2 py-0.5 rounded-full shrink-0">
                      {m.role}
                    </span>
                  )}
                  {!m.active && (
                    <span className="text-[var(--dash-text-muted)] text-[9px] uppercase tracking-[0.1em] bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] px-2 py-0.5 rounded-full shrink-0">
                      Pausado
                    </span>
                  )}
                </div>
                {m.bio && (
                  <p className="text-[var(--dash-text-muted)] text-xs leading-relaxed line-clamp-2">{m.bio}</p>
                )}
                {Array.isArray(m.specialties) && m.specialties.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {m.specialties.slice(0, 6).map((t) => (
                      <span key={t} className="text-[9px] uppercase tracking-[0.1em] text-[var(--dash-primary-soft)] bg-[var(--dash-primary-bg-8)] border border-[var(--dash-primary)]/20 px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {m.phone && (
                  <p className="text-[var(--dash-text-muted)] text-xs">{m.phone}</p>
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
          orgId={orgId}
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
