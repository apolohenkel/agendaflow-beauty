'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STATUS_MAP } from '@/lib/status'
import { useOrg } from '@/lib/org-context'
import { calculateProgress, formatReward } from '@/lib/loyalty'
import { formatServicePrice } from '@/lib/plans'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

function FilterChip({ active, onClick, tone, children }) {
  const palette = active
    ? { bg: 'var(--dash-primary)', color: 'var(--dash-ink)', border: 'var(--dash-primary)' }
    : tone === 'warn'
      ? { bg: 'transparent', color: '#E89B7A', border: '#3A2A22' }
      : { bg: 'transparent', color: 'var(--dash-text-soft)', border: 'var(--dash-border)' }
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all hover:brightness-110"
      style={{ backgroundColor: palette.bg, color: palette.color, borderWidth: 1, borderStyle: 'solid', borderColor: palette.border }}
    >
      {children}
    </button>
  )
}

// ─── MODAL EDITAR CLIENTE ─────────────────────────────────────────────────────
function ClienteModal({ cliente, onClose, onSaved }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: cliente.name || '',
    phone: cliente.phone || '',
    email: cliente.email || '',
    birthday: cliente.birthday || '',
    notes: cliente.notes || '',
  })
  const [tags, setTags] = useState(Array.isArray(cliente.tags) ? cliente.tags : [])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function addTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t) || tags.length >= 6) { setTagInput(''); return }
    setTags((xs) => [...xs, t])
    setTagInput('')
  }

  function removeTag(t) {
    setTags((xs) => xs.filter((x) => x !== t))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('clients')
      .update({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        birthday: form.birthday || null,
        tags,
        notes: form.notes.trim() || null,
      })
      .eq('id', cliente.id)
    if (err) { setError('Error al guardar.'); setLoading(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--dash-ink-sunken)] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
          <h2 className="text-[var(--dash-text)] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Editar cliente
          </h2>
          <button onClick={onClose} className="text-[var(--dash-text-dim)] hover:text-[var(--dash-text-muted)] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Nombre *</p>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors" />
          </div>
          <div className="space-y-1">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Teléfono / WhatsApp</p>
            <input type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Correo</p>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="cliente@correo.com"
                className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Cumpleaños</p>
              <input type="date" value={form.birthday} onChange={(e) => set('birthday', e.target.value)}
                className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Etiquetas <span className="normal-case text-[var(--dash-text-dim)]">(hasta 6)</span></p>
            {tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-[var(--dash-primary)]/10 text-[var(--dash-primary)] border border-[var(--dash-primary)]/30 px-2.5 py-1 rounded-full">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-[var(--dash-primary)]/60 hover:text-[var(--dash-primary)]" aria-label="Quitar">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="VIP, Primeriza, Alergia al amoniaco…"
                className="flex-1 bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors" />
              <button type="button" onClick={addTag}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--dash-border)] border border-[var(--dash-border)] text-[var(--dash-text-soft)] hover:border-[#3A3A3A] transition-all">
                Agregar
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest">Notas internas</p>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              placeholder="Preferencias, alergias, etc."
              className="w-full bg-[var(--dash-ink-raised)] border border-[#222] rounded-xl px-4 py-2.5 text-[var(--dash-text)] text-sm placeholder-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]/50 transition-colors resize-none" />
          </div>
          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[var(--dash-text-dim)] border border-[var(--dash-border)] hover:border-[var(--dash-border)] transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--dash-primary)] hover:bg-[var(--dash-primary-soft)] text-[var(--dash-ink)] transition-all disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PANEL DETALLE CLIENTE ────────────────────────────────────────────────────
function daysSince(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function isBirthdayToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getUTCMonth() === now.getMonth() && d.getUTCDate() === now.getDate()
}

function ClienteDrawer({ cliente, onClose, onEdit }) {
  const supabase = createClient()
  const { businessId, business } = useOrg()
  const currency = business?.currency || 'gtq'
  const [appts, setAppts] = useState([])
  const [rules, setRules] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      // Traemos appointments, reglas activas y servicios en paralelo
      const [apptsRes, rulesRes, svcsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, starts_at, ends_at, status, service_id, services(name, price), staff(name)')
          .eq('client_id', cliente.id)
          .order('starts_at', { ascending: false }),
        businessId
          ? supabase
              .from('loyalty_rules')
              .select('*')
              .eq('business_id', businessId)
              .eq('active', true)
              .order('visits_required', { ascending: true })
          : Promise.resolve({ data: [] }),
        businessId
          ? supabase
              .from('services')
              .select('id, name, price')
              .eq('business_id', businessId)
          : Promise.resolve({ data: [] }),
      ])
      setAppts(apptsRes.data || [])
      setRules(rulesRes.data || [])
      setServices(svcsRes.data || [])
      setLoading(false)
    }
    loadAll()
  }, [cliente.id, businessId])

  const completedAppts = appts.filter((a) => a.status === 'completed')
  const completed = completedAppts.length
  const noShows = appts.filter((a) => a.status === 'no_show').length
  const totalSpent = completedAppts
    .filter((a) => a.services?.price != null)
    .reduce((sum, a) => sum + Number(a.services.price), 0)

  // Frecuencia promedio entre visitas completadas
  const avgFrequencyDays = (() => {
    if (completedAppts.length < 2) return null
    const sorted = [...completedAppts].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    const diffs = []
    for (let i = 1; i < sorted.length; i++) {
      diffs.push((new Date(sorted[i].starts_at) - new Date(sorted[i - 1].starts_at)) / (1000 * 60 * 60 * 24))
    }
    return Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length)
  })()

  const daysAgo = daysSince(cliente.last_visit)
  const inactive = daysAgo !== null && avgFrequencyDays && daysAgo > avgFrequencyDays * 2
  const birthdayToday = isBirthdayToday(cliente.birthday)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--dash-ink-raised)] h-full flex flex-col shadow-2xl"
        style={{ borderLeft: '1px solid var(--dash-border-hover)' }}>

        {/* Hairline decorativo dorado top */}
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--dash-primary) 50%, transparent)',
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--dash-border)]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border"
              style={{ background: 'var(--dash-primary-bg-8)', borderColor: 'var(--dash-border-hover)' }}
            >
              <span
                className="text-[var(--dash-primary)] text-sm font-medium"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {cliente.name ? cliente.name[0].toUpperCase() : '?'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[var(--dash-text)] text-sm font-medium">{cliente.name}</p>
                {birthdayToday && (
                  <span className="text-xs select-none" title="Hoy es su cumpleaños" aria-label="Cumpleaños">✦</span>
                )}
              </div>
              <p className="text-[var(--dash-text-muted)] text-xs">{cliente.phone || 'Sin teléfono'}</p>
              {cliente.email && <p className="text-[var(--dash-text-muted)] text-xs">{cliente.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit}
              aria-label="Editar"
              className="p-2 text-[var(--dash-text-dim)] hover:text-[var(--dash-primary)] hover:bg-[var(--dash-primary-bg-8)] rounded-lg transition-all">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button onClick={onClose}
              aria-label="Cerrar"
              className="p-2 text-[var(--dash-text-dim)] hover:text-[var(--dash-text-soft)] rounded-lg transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-px bg-[var(--dash-border)]">
          {[
            { label: 'Visitas', value: completed },
            { label: 'Ausencias', value: noShows },
            { label: 'Total gastado', value: formatServicePrice(totalSpent, currency) },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--dash-ink-raised)] px-4 py-4 text-center">
              <p className="text-[var(--dash-primary)] text-xl tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}>{s.value}</p>
              <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.12em] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* CRM stats: última visita + frecuencia */}
        {(daysAgo !== null || avgFrequencyDays) && (
          <div className="px-6 py-3 border-b border-[var(--dash-border)] space-y-1">
            {daysAgo !== null && (
              <p className="text-xs" style={{ color: inactive ? '#E89B7A' : 'var(--dash-text-muted)' }}>
                <span className="text-[var(--dash-text-muted)]">Última visita:</span> hace {daysAgo} {daysAgo === 1 ? 'día' : 'días'}
                {inactive && <span className="ml-1 text-[#E89B7A]">· suele venir cada {avgFrequencyDays}d</span>}
              </p>
            )}
            {!inactive && avgFrequencyDays && (
              <p className="text-xs text-[var(--dash-text-muted)]">
                <span className="text-[var(--dash-text-muted)]">Viene cada:</span> ~{avgFrequencyDays} días
              </p>
            )}
            {cliente.birthday && (
              <p className="text-xs text-[var(--dash-text-muted)]">
                <span className="text-[var(--dash-text-muted)]">Cumpleaños:</span> {new Date(cliente.birthday).toLocaleDateString('es-GT', { day: 'numeric', month: 'long' })}
                {birthdayToday && <span className="ml-1 text-[var(--dash-primary)]">🎂 hoy</span>}
              </p>
            )}
          </div>
        )}

        {/* Tags */}
        {Array.isArray(cliente.tags) && cliente.tags.length > 0 && (
          <div className="px-6 py-3 border-b border-[var(--dash-border)]">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.14em] mb-2">Etiquetas</p>
            <div className="flex gap-1.5 flex-wrap">
              {cliente.tags.map((t) => (
                <span key={t} className="text-[10px] text-[var(--dash-primary-soft)] bg-[var(--dash-primary-bg-8)] border border-[var(--dash-primary)]/20 px-2 py-0.5 rounded-full uppercase tracking-[0.08em]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progreso de fidelidad */}
        {rules.length > 0 && (
          <div className="px-6 py-4 border-b border-[var(--dash-border)] space-y-3">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.14em]">Progreso de fidelidad</p>
            {rules.map((r) => {
              const progress = calculateProgress(appts, r)
              const pct = progress.required === 0
                ? 0
                : Math.round((progress.progressInCycle / progress.required) * 100)
              const rewardService = r.reward_service_id ? services.find((s) => s.id === r.reward_service_id) : null
              const rewardText = formatReward(r, rewardService?.name)
              const canRedeem = progress.visits > 0 && progress.progressInCycle === 0
              return (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[var(--dash-text-soft)] text-xs truncate">{r.name}</p>
                    <p className="text-[var(--dash-text)] text-xs tabular-nums shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
                      {progress.progressInCycle}<span className="text-[var(--dash-text-dim)]">/{progress.required}</span>
                    </p>
                  </div>
                  <div className="h-1.5 bg-[var(--dash-ink-sunken)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: canRedeem ? '100%' : `${pct}%`,
                        background: canRedeem
                          ? 'linear-gradient(90deg, var(--dash-primary), var(--dash-primary-soft))'
                          : 'var(--dash-primary)',
                      }}
                    />
                  </div>
                  <p className={`text-[10px] ${canRedeem ? 'text-[var(--dash-primary-soft)]' : 'text-[var(--dash-text-dim)]'}`}>
                    {canRedeem
                      ? `✦ Puede canjear: ${rewardText}`
                      : `Faltan ${progress.remaining} para ${rewardText}`}
                    {progress.redeemedCycles > 0 && (
                      <span className="text-[var(--dash-text-dim)]"> · {progress.redeemedCycles} ciclo{progress.redeemedCycles > 1 ? 's' : ''} canjeado{progress.redeemedCycles > 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Notas */}
        {cliente.notes && (
          <div className="px-6 py-4 border-b border-[var(--dash-border)]">
            <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest mb-1">Notas</p>
            <p className="text-[var(--dash-text-soft)] text-xs leading-relaxed">{cliente.notes}</p>
          </div>
        )}

        {/* Historial de citas */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-widest px-6 py-4">Historial de citas</p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
            </div>
          ) : appts.length === 0 ? (
            <p className="text-[var(--dash-border)] text-sm text-center py-12">Sin citas registradas</p>
          ) : (
            <div className="divide-y divide-[var(--dash-ink-sunken)]">
              {appts.map((a) => {
                const st = STATUS_MAP[a.status] || STATUS_MAP.pending
                return (
                  <div key={a.id} className="px-6 py-4 hover:bg-[var(--dash-ink-sunken)] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[var(--dash-text-soft)] text-xs font-medium">{fmtDate(a.starts_at)} · {fmtTime(a.starts_at)}</p>
                        <p className="text-[var(--dash-text)] text-sm mt-0.5 truncate">{a.services?.name || 'Servicio'}</p>
                        {a.staff?.name && <p className="text-[var(--dash-text-muted)] text-xs mt-0.5">{a.staff.name}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        {a.services?.price != null && (
                          <p className="text-[var(--dash-primary)] text-sm tabular-nums">{formatServicePrice(a.services.price, currency)}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          <span className="text-[var(--dash-text-muted)] text-[10px]">{st.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
const INACTIVITY_DAYS = 60

export default function ClientesPage() {
  const supabase = createClient()
  const { businessId } = useOrg()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all') // all | inactive | birthday | <tag>

  const load = useCallback(async () => {
    setLoading(true)
    // Cargamos clientes + agregamos por separado las appointments completadas
    // y calculamos last_visit + visits_count cliente-lado (la columna
    // clients.last_visit no siempre se mantiene al día, y así evitamos
    // depender de triggers en DB).
    const [clientsRes, apptsRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, phone, email, notes, created_at, last_visit, birthday, tags')
        .order('name'),
      businessId
        ? supabase
            .from('appointments')
            .select('client_id, starts_at')
            .eq('business_id', businessId)
            .eq('status', 'completed')
        : Promise.resolve({ data: [] }),
    ])

    // Indexar appointments por client_id → { last_visit, visits_count }
    const byClient = new Map()
    for (const a of apptsRes.data || []) {
      const prev = byClient.get(a.client_id)
      if (!prev) {
        byClient.set(a.client_id, { last_visit: a.starts_at, visits_count: 1 })
      } else {
        byClient.set(a.client_id, {
          last_visit: new Date(a.starts_at) > new Date(prev.last_visit) ? a.starts_at : prev.last_visit,
          visits_count: prev.visits_count + 1,
        })
      }
    }

    // Mezclar: si la DB tiene last_visit lo usamos como fallback, pero
    // calculado desde appointments gana (es la fuente de verdad).
    const enriched = (clientsRes.data || []).map((c) => {
      const agg = byClient.get(c.id)
      return {
        ...c,
        last_visit: agg?.last_visit ?? c.last_visit,
        visits_count: agg?.visits_count ?? 0,
      }
    })

    setClients(enriched)
    setLoading(false)
  }, [businessId])

  useEffect(() => { load() }, [load])

  // Todas las tags únicas que usan
  const allTags = [...new Set(clients.flatMap((c) => Array.isArray(c.tags) ? c.tags : []))].sort()

  const now = Date.now()
  const inactiveCount = clients.filter((c) => {
    if (!c.last_visit) return false
    return (now - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24) > INACTIVITY_DAYS
  }).length
  const birthdayCount = clients.filter((c) => isBirthdayToday(c.birthday)).length

  const filtered = (() => {
    let list = clients

    if (activeFilter === 'inactive') {
      list = list.filter((c) => c.last_visit && (now - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24) > INACTIVITY_DAYS)
    } else if (activeFilter === 'birthday') {
      list = list.filter((c) => isBirthdayToday(c.birthday))
    } else if (activeFilter !== 'all') {
      list = list.filter((c) => Array.isArray(c.tags) && c.tags.includes(activeFilter))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) => (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(q)
      ))
    }

    return list
  })()

  function waLink(phone) {
    const clean = String(phone || '').replace(/\D+/g, '')
    return clean ? `https://wa.me/${clean}` : null
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 space-y-5 md:space-y-8 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-[var(--dash-text-muted)] text-[10px] uppercase tracking-[0.24em]">
            Tu base
          </p>
          <h1
            className="text-[var(--dash-text)] text-3xl sm:text-4xl md:text-[44px] font-light leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Clientes
            {!loading && clients.length > 0 && (
              <span className="text-[var(--dash-primary)] text-2xl ml-3" style={{ fontStyle: 'italic' }}>
                {clients.length}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--dash-text-dim)]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-xl pl-10 pr-4 py-3 text-[var(--dash-text)] text-sm placeholder:text-[var(--dash-text-dim)] focus:outline-none focus:border-[var(--dash-primary)]/40 transition-colors"
        />
      </div>

      {/* Filtros */}
      {!loading && (clients.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          <FilterChip active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
            Todas <span className="text-[var(--dash-text-dim)]">· {clients.length}</span>
          </FilterChip>
          {birthdayCount > 0 && (
            <FilterChip active={activeFilter === 'birthday'} onClick={() => setActiveFilter('birthday')}>
              🎂 Cumpleañeras <span className="text-[var(--dash-text-dim)]">· {birthdayCount}</span>
            </FilterChip>
          )}
          {inactiveCount > 0 && (
            <FilterChip active={activeFilter === 'inactive'} onClick={() => setActiveFilter('inactive')} tone="warn">
              Inactivas {INACTIVITY_DAYS}+ d <span className="text-[var(--dash-text-dim)]">· {inactiveCount}</span>
            </FilterChip>
          )}
          {allTags.map((t) => (
            <FilterChip key={t} active={activeFilter === t} onClick={() => setActiveFilter(t)}>
              {t}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-5 h-5 border border-[var(--dash-primary)]/20 border-t-[var(--dash-primary)] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--dash-ink-sunken)', border: '1px solid var(--dash-border)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--dash-primary)" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[var(--dash-text-soft)] text-base italic" style={{ fontFamily: 'var(--font-display)' }}>
              {search ? 'Sin resultados' : 'Aún no tienes clientes'}
            </p>
            <p className="text-[var(--dash-text-muted)] text-xs mt-1">
              {search ? 'Prueba con otro nombre o teléfono' : 'Los clientes aparecen aquí cuando agendan una cita'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[var(--dash-border)]">
            {filtered.map((c) => {
              const daysAgo = c.last_visit ? Math.floor((now - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24)) : null
              const isInactive = daysAgo !== null && daysAgo > INACTIVITY_DAYS
              const birthday = isBirthdayToday(c.birthday)
              const wa = activeFilter === 'inactive' ? waLink(c.phone) : null
              return (
                // Row entero clickeable — antes solo el <button> interno (avatar+info)
                // era tappable, así que en mobile si tocabas "Sin visitas" o el
                // chevron a la derecha no abría el detalle.
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(c)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(c) }
                  }}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-[var(--dash-ink)]/60 active:bg-[var(--dash-ink)]/80 transition-colors group cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                    style={{
                      background: 'var(--dash-primary-bg-8)',
                      borderColor: 'var(--dash-border-hover)',
                    }}>
                    <span className="text-[var(--dash-primary)] text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                      {c.name ? c.name[0].toUpperCase() : '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[var(--dash-text)] text-sm font-medium truncate">{c.name || '—'}</p>
                      {birthday && (
                        <span className="text-xs select-none" title="Cumpleaños hoy" aria-label="Cumpleaños">✦</span>
                      )}
                      {Array.isArray(c.tags) && c.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[9px] text-[var(--dash-primary-soft)] bg-[var(--dash-primary-bg-8)] border border-[var(--dash-primary)]/20 px-1.5 py-0.5 rounded-full uppercase tracking-[0.1em]">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <p className="text-[var(--dash-text-muted)] truncate">{c.phone || 'Sin teléfono'}</p>
                      {c.last_visit && (
                        <>
                          <span className="text-[var(--dash-text-dim)] shrink-0">·</span>
                          <p className={`shrink-0 ${isInactive ? 'text-[var(--dash-warn)]' : 'text-[var(--dash-text-muted)]'}`}>
                            {c.visits_count > 0 && `${c.visits_count} ${c.visits_count === 1 ? 'visita' : 'visitas'} · `}
                            {daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : `hace ${daysAgo}d`}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Acción WhatsApp (opcional, cuando filtro inactivas) — usa
                      stopPropagation para no abrir el drawer al tocar */}
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[#3DBA6E]/10 text-[#3DBA6E] border border-[#3DBA6E]/30 hover:bg-[#3DBA6E]/20 transition-all"
                      aria-label="Enviar WhatsApp"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      Saludar
                    </a>
                  ) : (
                    <svg className="text-[var(--dash-text-dim)] transition-colors shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Drawer detalle */}
      {selected && (
        <ClienteDrawer
          cliente={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditTarget(selected); setSelected(null) }}
        />
      )}

      {/* Modal editar */}
      {editTarget && (
        <ClienteModal
          cliente={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { load(); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
