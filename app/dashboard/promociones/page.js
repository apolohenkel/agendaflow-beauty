'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/Toast'
import { logger } from '@/lib/logger'
import { summarizeRule, formatReward } from '@/lib/loyalty'
import Hairline from '@/components/ui/Hairline'
import Chip from '@/components/ui/Chip'

const REWARD_TYPES = [
  { value: 'free_service',     label: 'Servicio gratis',   hint: 'Regala un servicio específico de tu menú.' },
  { value: 'percent_off',      label: 'Descuento en %',    hint: 'Porcentaje sobre el precio del servicio.' },
  { value: 'fixed_amount_off', label: 'Descuento en Q',    hint: 'Monto fijo en quetzales a descontar.' },
]

// ─── MODAL EDITAR/CREAR ──────────────────────────────────────────────────────
function PromocionModal({ regla, services, businessId, onClose, onSaved }) {
  const supabase = createClient()
  const { toast } = useToast()
  const isEdit = Boolean(regla?.id)

  const [form, setForm] = useState({
    name:                regla?.name                || '',
    description:         regla?.description         || '',
    visits_required:     regla?.visits_required     ?? 10,
    counted_service_ids: regla?.counted_service_ids ?? [],  // [] = todos
    reward_type:         regla?.reward_type         || 'free_service',
    reward_value:        regla?.reward_value        ?? 100,
    reward_service_id:   regla?.reward_service_id   || '',
    reward_description:  regla?.reward_description  || '',
    active:              regla?.active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function toggleCountedService(id) {
    const current = Array.isArray(form.counted_service_ids) ? form.counted_service_ids : []
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id]
    set('counted_service_ids', next)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (form.visits_required < 1 || form.visits_required > 100) {
      setError('Las visitas requeridas deben estar entre 1 y 100.'); return
    }
    if (form.reward_type === 'free_service' && !form.reward_service_id) {
      setError('Elige el servicio a regalar.'); return
    }
    if ((form.reward_type === 'percent_off' || form.reward_type === 'fixed_amount_off') && form.reward_value <= 0) {
      setError('El valor del descuento debe ser mayor a 0.'); return
    }

    setLoading(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      visits_required: Number(form.visits_required),
      counted_service_ids: form.counted_service_ids.length > 0 ? form.counted_service_ids : null,
      reward_type: form.reward_type,
      reward_value: Number(form.reward_value) || 0,
      reward_service_id: form.reward_type === 'free_service' ? (form.reward_service_id || null) : null,
      reward_description: form.reward_description.trim() || null,
      active: Boolean(form.active),
    }

    try {
      if (isEdit) {
        const { error: err } = await supabase.from('loyalty_rules').update(payload).eq('id', regla.id)
        if (err) throw err
        toast('Promoción actualizada', 'success')
      } else {
        const { error: err } = await supabase.from('loyalty_rules').insert({ ...payload, business_id: businessId })
        if (err) throw err
        toast('Promoción creada', 'success')
      }
      onSaved()
      onClose()
    } catch (err) {
      logger.error('promociones_save', err)
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-[var(--dash-ink-sunken)] border border-[var(--dash-border)] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder:text-[var(--dash-text-dim)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 scrim-glass animate-scrim-in" onClick={onClose} />
      <div
        className="relative w-full max-w-[520px] max-h-[90vh] overflow-auto scrollbar-hide rounded-[14px] animate-modal-in"
        style={{
          background: 'var(--dash-ink-raised)',
          border: '1px solid var(--dash-border)',
          boxShadow: '0 1px 0 var(--dash-hairline) inset, 0 24px 64px -12px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-[var(--dash-text)] text-xl tracking-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
              {isEdit ? 'Editar promoción' : 'Nueva promoción'}
            </h2>
            <p className="text-[var(--dash-text-muted)] text-xs mt-1">
              Premia la fidelidad de tus clientes
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-[var(--dash-text-dim)] hover:text-[var(--dash-text-soft)] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <Hairline className="mx-6" />

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Nombre + descripción */}
          <div className="space-y-1.5">
            <p className="eyebrow">Nombre *</p>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Cliente fiel — 10 cortes"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <p className="eyebrow">Descripción</p>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Cómo funciona para tu cliente (opcional)"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Visitas requeridas */}
          <div className="space-y-1.5">
            <p className="eyebrow">Visitas requeridas *</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={100}
                value={form.visits_required}
                onChange={(e) => set('visits_required', parseInt(e.target.value) || 1)}
                className={`${inputCls} w-24 tabular-nums`}
              />
              <p className="text-[var(--dash-text-muted)] text-xs">
                visitas completadas para canjear la recompensa
              </p>
            </div>
          </div>

          {/* Ámbito: qué servicios cuentan */}
          {services.length > 0 && (
            <div className="space-y-2">
              <p className="eyebrow">¿Qué servicios cuentan?</p>
              <p className="text-[var(--dash-text-muted)] text-[11px] leading-relaxed">
                Selecciona uno o más. Si no eliges ninguno, cuentan todas las visitas completadas.
              </p>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const selected = form.counted_service_ids.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleCountedService(s.id)}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                        ${selected
                          ? 'border-[var(--dash-primary)] bg-[var(--dash-primary-bg-15)] text-[var(--dash-primary-soft)]'
                          : 'border-[var(--dash-border)] text-[var(--dash-text-muted)] hover:border-[var(--dash-border-hover)]'
                        }
                      `}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Hairline />

          {/* Tipo de recompensa */}
          <div className="space-y-2">
            <p className="eyebrow">Recompensa *</p>
            <div className="grid grid-cols-3 gap-2">
              {REWARD_TYPES.map((rt) => {
                const selected = form.reward_type === rt.value
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => set('reward_type', rt.value)}
                    className={`
                      px-3 py-2.5 rounded-xl text-xs font-medium transition-all border text-left
                      ${selected
                        ? 'border-[var(--dash-primary)] bg-[var(--dash-primary-bg-8)] text-[var(--dash-primary-soft)]'
                        : 'border-[var(--dash-border)] text-[var(--dash-text-soft)] hover:border-[var(--dash-border-hover)]'
                      }
                    `}
                  >
                    {rt.label}
                  </button>
                )
              })}
            </div>
            <p className="text-[var(--dash-text-muted)] text-[11px] leading-relaxed">
              {REWARD_TYPES.find((rt) => rt.value === form.reward_type)?.hint}
            </p>
          </div>

          {/* Campo dinámico según tipo */}
          {form.reward_type === 'free_service' && services.length > 0 && (
            <div className="space-y-1.5">
              <p className="eyebrow">Servicio a regalar *</p>
              <select
                value={form.reward_service_id}
                onChange={(e) => set('reward_service_id', e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
                style={{ color: form.reward_service_id ? 'var(--dash-text)' : 'var(--dash-text-dim)' }}
              >
                <option value="">Elige un servicio</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id} style={{ color: 'var(--dash-text)', background: 'var(--dash-ink-raised)' }}>
                    {s.name}{s.price != null ? ` — Q${Number(s.price).toFixed(0)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.reward_type === 'percent_off' && (
            <div className="space-y-1.5">
              <p className="eyebrow">% de descuento *</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.reward_value}
                  onChange={(e) => set('reward_value', parseInt(e.target.value) || 0)}
                  className={`${inputCls} w-24 tabular-nums`}
                />
                <span className="text-[var(--dash-text-soft)] text-sm">%</span>
              </div>
            </div>
          )}

          {form.reward_type === 'fixed_amount_off' && (
            <div className="space-y-1.5">
              <p className="eyebrow">Monto de descuento *</p>
              <div className="flex items-center gap-2">
                <span className="text-[var(--dash-text-soft)] text-sm">Q</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.reward_value}
                  onChange={(e) => set('reward_value', parseFloat(e.target.value) || 0)}
                  className={`${inputCls} w-32 tabular-nums`}
                />
              </div>
            </div>
          )}

          {/* Descripción custom de recompensa */}
          <div className="space-y-1.5">
            <p className="eyebrow">Texto visible al cliente</p>
            <input
              type="text"
              value={form.reward_description}
              onChange={(e) => set('reward_description', e.target.value)}
              placeholder={`Ej: ${formatReward(form, services.find((s) => s.id === form.reward_service_id)?.name) || 'Corte gratis'}`}
              className={inputCls}
            />
            <p className="text-[var(--dash-text-muted)] text-[11px]">
              Se muestra al cliente al canjear. Deja vacío para usar el automático.
            </p>
          </div>

          <Hairline />

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set('active', e.target.checked)}
              className="w-4 h-4 accent-[var(--dash-primary)]"
            />
            <span className="text-[var(--dash-text-soft)] text-sm">
              Promoción activa
            </span>
          </label>

          {error && (
            <p className="text-[var(--dash-danger)] text-xs bg-[var(--dash-danger)]/10 border border-[var(--dash-danger)]/20 px-4 py-2.5 rounded-xl">{error}</p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-medium text-[var(--dash-text-muted)] border border-[var(--dash-border)] hover:border-[var(--dash-border-hover)] transition-all uppercase tracking-[0.1em]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(135deg, var(--dash-primary), var(--dash-primary-deep))',
                color: 'var(--dash-ink)',
                boxShadow: '0 4px 16px -4px var(--dash-primary)',
              }}
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear promoción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function PromocionesPage() {
  const supabase = createClient()
  const { businessId } = useOrg()
  const { toast } = useToast()

  const [rules, setRules]     = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [editTarget, setEditTarget] = useState(null)  // null | regla | 'new'

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const [{ data: rulesData, error: err1 }, { data: svcs, error: err2 }] = await Promise.all([
        supabase
          .from('loyalty_rules')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('id, name, price')
          .eq('business_id', businessId)
          .eq('active', true)
          .order('name'),
      ])
      if (err1) throw err1
      if (err2) throw err2
      setRules(rulesData || [])
      setServices(svcs || [])
    } catch (err) {
      logger.error('promociones', err)
      setError('No se pudieron cargar las promociones.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function handleToggleActive(rule) {
    const { error: err } = await supabase
      .from('loyalty_rules')
      .update({ active: !rule.active })
      .eq('id', rule.id)
    if (err) {
      toast('No se pudo actualizar.', 'error')
    } else {
      toast(rule.active ? 'Promoción pausada' : 'Promoción activada', 'success')
      load()
    }
  }

  async function handleDelete(rule) {
    if (!confirm(`¿Eliminar "${rule.name}"? Los clientes dejan de ver esta promoción.`)) return
    const { error: err } = await supabase.from('loyalty_rules').delete().eq('id', rule.id)
    if (err) {
      toast('No se pudo eliminar.', 'error')
    } else {
      toast('Promoción eliminada', 'info')
      load()
    }
  }

  const serviceMap = new Map(services.map((s) => [s.id, s]))
  const activeCount = rules.filter((r) => r.active).length

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
            Tu programa de fidelidad
          </p>
          <h1
            className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Promociones
            {!loading && rules.length > 0 && (
              <span className="text-[var(--dash-primary)] text-2xl ml-3" style={{ fontStyle: 'italic' }}>
                {rules.length}
              </span>
            )}
          </h1>
          {!loading && rules.length > 0 && (
            <p className="text-[var(--dash-text-muted)] text-xs">
              {activeCount} activas · {rules.length - activeCount} pausadas
            </p>
          )}
        </div>
        <button
          onClick={() => setEditTarget('new')}
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
          Nueva promoción
        </button>
      </div>

      <Hairline />

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-[var(--dash-text-soft)] text-sm italic" style={{ fontFamily: 'var(--font-display)' }}>
            {error}
          </p>
          <button onClick={load} className="text-[var(--dash-primary)] text-xs link-gold">Reintentar</button>
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round">
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <div className="text-center max-w-sm">
            <p className="text-[var(--dash-text-soft)] text-base italic" style={{ fontFamily: 'var(--font-display)' }}>
              Premia a tus clientes fieles
            </p>
            <p className="text-[var(--dash-text-muted)] text-xs mt-2 leading-relaxed">
              Configura reglas como{' '}
              <span className="text-[var(--dash-primary-soft)]">"después de 10 cortes, 1 gratis"</span>
              {' '}y dales una razón extra para volver.
            </p>
          </div>
          <button onClick={() => setEditTarget('new')} className="text-[var(--dash-primary)] text-xs link-gold">
            Crear primera promoción →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {rules.map((r) => {
            const rewardService = r.reward_service_id ? serviceMap.get(r.reward_service_id) : null
            const rewardText = formatReward(r, rewardService?.name)
            const countedCount = Array.isArray(r.counted_service_ids) ? r.counted_service_ids.length : 0
            return (
              <div
                key={r.id}
                className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl px-6 py-5 flex items-start gap-5 hover:border-[var(--dash-border-hover)] transition-all group card-sweep"
              >
                {/* Icono regalo */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: r.active ? 'var(--dash-primary-bg-15)' : 'var(--dash-ink-sunken)',
                    border: '1px solid var(--dash-border-hover)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.active ? 'var(--dash-primary)' : 'var(--dash-text-dim)'} strokeWidth="1.5" strokeLinecap="round">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[var(--dash-text)] text-sm font-medium truncate">{r.name}</p>
                    {!r.active && <Chip variant="muted" size="sm">Pausada</Chip>}
                  </div>

                  <p
                    className="text-[var(--dash-primary-soft)] text-base"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}
                  >
                    {summarizeRule(r, rewardService?.name)}
                  </p>

                  {r.description && (
                    <p className="text-[var(--dash-text-muted)] text-xs leading-relaxed line-clamp-2">
                      {r.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--dash-text-dim)]">
                    <span>{countedCount === 0 ? 'Todos los servicios' : `${countedCount} servicio${countedCount > 1 ? 's' : ''} cuenta${countedCount > 1 ? 'n' : ''}`}</span>
                    <span>·</span>
                    <span>{rewardText}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleActive(r)}
                    title={r.active ? 'Pausar' : 'Activar'}
                    aria-label={r.active ? 'Pausar' : 'Activar'}
                    className="p-2 text-[var(--dash-text-dim)] hover:text-[var(--dash-primary)] hover:bg-[var(--dash-primary-bg-8)] rounded-lg transition-all"
                  >
                    {r.active ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => setEditTarget(r)}
                    title="Editar"
                    aria-label="Editar"
                    className="p-2 text-[var(--dash-text-dim)] hover:text-[var(--dash-primary)] hover:bg-[var(--dash-primary-bg-8)] rounded-lg transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    title="Eliminar"
                    aria-label="Eliminar"
                    className="p-2 text-[var(--dash-text-dim)] hover:text-[var(--dash-danger)] hover:bg-[var(--dash-danger)]/10 rounded-lg transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editTarget && (
        <PromocionModal
          regla={editTarget === 'new' ? null : editTarget}
          services={services}
          businessId={businessId}
          onClose={() => setEditTarget(null)}
          onSaved={() => { load(); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
