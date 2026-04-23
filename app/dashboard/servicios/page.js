'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import { logger } from '@/lib/logger'
import { formatServicePrice } from '@/lib/plans'

const CATEGORIAS = ['Corte', 'Color', 'Tratamiento', 'Uñas', 'Maquillaje', 'Spa', 'Otro']

const DURACIONES = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hora', value: 60 },
  { label: '1h 30min', value: 90 },
  { label: '2 horas', value: 120 },
  { label: '2h 30min', value: 150 },
  { label: '3 horas', value: 180 },
]

function fmtDuration(min) {
  if (!min) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

// ─── MODAL SERVICIO ───────────────────────────────────────────────────────────
function ServicioModal({ servicio, businessId, depositCurrency, depositEnabled, onClose, onSaved }) {
  const supabase = createClient()
  const isEdit = Boolean(servicio)
  const [form, setForm] = useState({
    name: servicio?.name || '',
    category: servicio?.category || '',
    duration_minutes: servicio?.duration_minutes || 60,
    price: servicio?.price != null ? String(servicio.price) : '',
    deposit: servicio?.deposit_amount ? (servicio.deposit_amount / 100).toFixed(2) : '',
    description: servicio?.description || '',
    active: servicio?.active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre del servicio es obligatorio.'); return }
    setLoading(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      category: form.category || null,
      duration_minutes: form.duration_minutes,
      price: form.price !== '' ? parseFloat(form.price) : null,
      deposit_amount: form.deposit !== '' ? Math.round(parseFloat(form.deposit) * 100) : 0,
      description: form.description.trim() || null,
      active: form.active,
    }

    try {
      if (isEdit) {
        const { error: err } = await supabase.from('services').update(payload).eq('id', servicio.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('services').insert({ ...payload, business_id: businessId })
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--dash-ink-sunken)] border border-[#222] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
          <h2 className="text-[var(--dash-text)] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
            {isEdit ? 'Editar servicio' : 'Nuevo servicio'}
          </h2>
          <button onClick={onClose} className="text-[var(--dash-text-dim)] hover:text-[var(--dash-text-muted)] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Nombre */}
          <div className="space-y-1">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Nombre *</p>
            <input
              type="text"
              placeholder="Ej: Corte de cabello"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
            />
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Categoría</p>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', form.category === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.category === cat
                      ? 'bg-[var(--dash-primary)]/15 text-[var(--dash-primary)] border border-[var(--dash-primary)]/30'
                      : 'bg-[var(--dash-ink-raised)] text-[var(--dash-text-dim)] border border-[var(--dash-border)] hover:border-[var(--dash-border)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-1">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Duración</p>
            <div className="flex gap-2 flex-wrap">
              {DURACIONES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => set('duration_minutes', d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.duration_minutes === d.value
                      ? 'bg-[var(--dash-primary)]/15 text-[var(--dash-primary)] border border-[var(--dash-primary)]/30'
                      : 'bg-[var(--dash-ink-raised)] text-[var(--dash-text-dim)] border border-[var(--dash-border)] hover:border-[var(--dash-border)]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Precio y seña */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Precio</p>
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="Ej: 150.00"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">
                Seña <span className="normal-case text-[var(--dash-text-dim)]">({(depositCurrency || 'usd').toUpperCase()}, opcional)</span>
              </p>
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="Ej: 20.00"
                value={form.deposit}
                onChange={(e) => set('deposit', e.target.value)}
                disabled={!depositEnabled}
                className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {!depositEnabled && (
                <p className="text-[10px] text-[var(--dash-text-dim)]">Activa la seña en <span className="text-[var(--dash-primary)]">Configuración</span> para cobrar.</p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Descripción</p>
            <textarea
              placeholder="Descripción del servicio..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors resize-none"
            />
          </div>

          {/* Activo */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[var(--dash-text-soft)] text-sm">Servicio activo</p>
              <p className="text-[var(--dash-text-muted)] text-xs mt-0.5">Aparece disponible para agendar</p>
            </div>
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-[var(--dash-primary)]' : 'bg-[var(--dash-border)]'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.active ? 'left-5' : 'left-1'}`} />
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--dash-text-dim)] border border-[var(--dash-border)] hover:border-[var(--dash-border)] hover:text-[var(--dash-text-muted)] transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--dash-primary)] hover:bg-[var(--dash-primary-soft)] text-[var(--dash-ink)] transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function ServiciosPage() {
  const supabase = createClient()
  const { businessId, business } = useOrg()
  const depositCurrency = business?.deposit_currency || 'usd'
  const depositEnabled = Boolean(business?.deposit_enabled)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [filterCat, setFilterCat] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('name')
      if (err) throw err
      setServices(data || [])
    } catch (err) {
      logger.error('servicios', err)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    await supabase.from('services').delete().eq('id', id)
    setDeleteConfirm(null)
    load()
  }

  function openNew() { setEditTarget(null); setShowModal(true) }
  function openEdit(s) { setEditTarget(s); setShowModal(true) }

  const categorias = ['all', ...CATEGORIAS]
  const filtered = filterCat === 'all'
    ? services
    : services.filter((s) => s.category === filterCat)

  const activeCount = services.filter((s) => s.active).length

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
            Tu oferta
          </p>
          <h1
            className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Servicios
            {!loading && services.length > 0 && (
              <span className="text-[var(--dash-primary)] text-2xl ml-3" style={{ fontStyle: 'italic' }}>
                {services.length}
              </span>
            )}
          </h1>
          {!loading && (
            <p className="text-[var(--dash-text-muted)] text-xs">
              {activeCount} activos · {services.length - activeCount} pausados
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
          Nuevo servicio
        </button>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 flex-wrap">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`
              px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-medium transition-all border
              ${filterCat === cat
                ? 'border-[var(--dash-primary)] bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary-soft)]'
                : 'border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-[var(--dash-border-hover)] hover:text-[var(--dash-text-soft)]'
              }
            `}
          >
            {cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {/* Lista de servicios */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[var(--dash-text-soft)] text-base italic" style={{ fontFamily: 'var(--font-display)' }}>
              Sin servicios todavía
            </p>
            <p className="text-[var(--dash-text-muted)] text-xs mt-1">Agrega los servicios que ofreces</p>
          </div>
          <button
            onClick={openNew}
            className="text-[var(--dash-primary)] text-xs link-gold"
          >
            Crear primer servicio →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl px-6 py-5 flex items-center gap-5 hover:border-[var(--dash-border-hover)] transition-all group card-sweep"
            >
              {/* Ícono / categoría */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--dash-primary-bg-8)', border: '1px solid var(--dash-border-hover)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[var(--dash-text)] text-sm font-medium truncate">{s.name}</p>
                  {s.category && (
                    <span className="text-[var(--dash-text-soft)] text-[9px] uppercase tracking-[0.1em] border border-[var(--dash-border)] px-2 py-0.5 rounded-full shrink-0">
                      {s.category}
                    </span>
                  )}
                  {depositEnabled && s.deposit_amount > 0 && (
                    <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--dash-primary-soft)] bg-[var(--dash-primary-bg-8)] border border-[var(--dash-primary)]/30 px-2 py-0.5 rounded-full shrink-0">
                      Seña {(s.deposit_amount / 100).toFixed(2)} {depositCurrency.toUpperCase()}
                    </span>
                  )}
                  {!s.active && (
                    <span className="text-[var(--dash-text-muted)] text-[10px] bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] px-2 py-0.5 rounded-full shrink-0">
                      Inactivo
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="text-[var(--dash-text-muted)] text-xs mt-0.5 truncate">{s.description}</p>
                )}
              </div>

              {/* Duración */}
              <div className="text-center shrink-0">
                <p className="text-[var(--dash-text-muted)] text-xs tabular-nums">{fmtDuration(s.duration_minutes)}</p>
                <p className="text-[var(--dash-text-dim)] text-[10px] mt-0.5">duración</p>
              </div>

              {/* Precio */}
              <div className="text-right shrink-0 w-20">
                {s.price != null ? (
                  <>
                    <p className="text-[var(--dash-primary)] text-base font-medium tabular-nums">{formatServicePrice(s.price, business?.currency)}</p>
                  </>
                ) : (
                  <p className="text-[var(--dash-border)] text-sm">—</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(s)}
                  className="p-2 text-[var(--dash-text-dim)] hover:text-[var(--dash-primary)] hover:bg-[var(--dash-primary)]/10 rounded-lg transition-all"
                  title="Editar"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteConfirm(s)}
                  className="p-2 text-[var(--dash-text-dim)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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

      {/* Modal crear/editar */}
      {showModal && (
        <ServicioModal
          servicio={editTarget}
          businessId={businessId}
          depositCurrency={depositCurrency}
          depositEnabled={depositEnabled}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={load}
        />
      )}

      {/* Confirm eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[var(--dash-ink-sunken)] border border-[#222] rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-[var(--dash-text)] text-base font-medium">Eliminar servicio</h3>
            <p className="text-[var(--dash-text-dim)] text-sm">
              ¿Eliminar <span className="text-[var(--dash-text-soft)]">{deleteConfirm.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[var(--dash-text-dim)] border border-[var(--dash-border)] hover:border-[var(--dash-border)] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
