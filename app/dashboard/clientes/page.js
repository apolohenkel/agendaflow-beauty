'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_MAP = {
  pending:   { dot: 'bg-amber-400',   label: 'Pendiente'  },
  confirmed: { dot: 'bg-emerald-400', label: 'Confirmada' },
  completed: { dot: 'bg-sky-400',     label: 'Completada' },
  cancelled: { dot: 'bg-red-400',     label: 'Cancelada'  },
  no_show:   { dot: 'bg-zinc-500',    label: 'No asistió' },
}

// ─── MODAL EDITAR CLIENTE ─────────────────────────────────────────────────────
function ClienteModal({ cliente, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: cliente.name || '',
    phone: cliente.phone || '',
    notes: cliente.notes || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('clients')
      .update({ name: form.name.trim(), phone: form.phone.trim() || null, notes: form.notes.trim() || null })
      .eq('id', cliente.id)
    if (err) { setError('Error al guardar.'); setLoading(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#111] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A1A1A]">
          <h2 className="text-[#F0EBE3] text-lg font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Editar cliente
          </h2>
          <button onClick={onClose} className="text-[#444] hover:text-[#888] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Nombre *</p>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors" />
          </div>
          <div className="space-y-1">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Teléfono / WhatsApp</p>
            <input type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors" />
          </div>
          <div className="space-y-1">
            <p className="text-[#555] text-[10px] uppercase tracking-widest">Notas internas</p>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              placeholder="Preferencias, alergias, etc."
              className="w-full bg-[#0D0D0D] border border-[#222] rounded-xl px-4 py-2.5 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/50 transition-colors resize-none" />
          </div>
          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[#555] border border-[#1E1E1E] hover:border-[#333] transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] transition-all disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PANEL DETALLE CLIENTE ────────────────────────────────────────────────────
function ClienteDrawer({ cliente, onClose, onEdit }) {
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAppts() {
      const { data } = await supabase
        .from('appointments')
        .select('id, starts_at, ends_at, status, services(name, price), staff(name)')
        .eq('client_id', cliente.id)
        .order('starts_at', { ascending: false })
        .limit(20)
      setAppts(data || [])
      setLoading(false)
    }
    loadAppts()
  }, [cliente.id])

  const completed = appts.filter((a) => a.status === 'completed').length
  const noShows = appts.filter((a) => a.status === 'no_show').length
  const totalSpent = appts
    .filter((a) => a.status === 'completed' && a.services?.price != null)
    .reduce((sum, a) => sum + Number(a.services.price), 0)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#0D0D0D] border-l border-[#1A1A1A] h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C8A96E]/10 border border-[#C8A96E]/20 flex items-center justify-center">
              <span className="text-[#C8A96E] text-sm font-semibold">
                {cliente.name ? cliente.name[0].toUpperCase() : '?'}
              </span>
            </div>
            <div>
              <p className="text-[#E8E3DC] text-sm font-medium">{cliente.name}</p>
              <p className="text-[#444] text-xs">{cliente.phone || 'Sin teléfono'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit}
              className="p-2 text-[#444] hover:text-[#C8A96E] hover:bg-[#C8A96E]/10 rounded-lg transition-all">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button onClick={onClose}
              className="p-2 text-[#444] hover:text-[#888] rounded-lg transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-px bg-[#161616] border-b border-[#161616]">
          {[
            { label: 'Visitas', value: completed },
            { label: 'No show', value: noShows },
            { label: 'Total gastado', value: `Q${totalSpent.toFixed(0)}` },
          ].map((s) => (
            <div key={s.label} className="bg-[#0D0D0D] px-4 py-4 text-center">
              <p className="text-[#C8A96E] text-lg font-light tabular-nums">{s.value}</p>
              <p className="text-[#383430] text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Notas */}
        {cliente.notes && (
          <div className="px-6 py-4 border-b border-[#161616]">
            <p className="text-[#444] text-[10px] uppercase tracking-widest mb-1">Notas</p>
            <p className="text-[#888] text-xs">{cliente.notes}</p>
          </div>
        )}

        {/* Historial de citas */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-[#444] text-[10px] uppercase tracking-widest px-6 py-4">Historial de citas</p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
            </div>
          ) : appts.length === 0 ? (
            <p className="text-[#333] text-sm text-center py-12">Sin citas registradas</p>
          ) : (
            <div className="divide-y divide-[#111]">
              {appts.map((a) => {
                const st = STATUS_MAP[a.status] || STATUS_MAP.pending
                return (
                  <div key={a.id} className="px-6 py-4 hover:bg-[#111] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[#C8C3BC] text-xs font-medium">{fmtDate(a.starts_at)} · {fmtTime(a.starts_at)}</p>
                        <p className="text-[#E8E3DC] text-sm mt-0.5 truncate">{a.services?.name || 'Servicio'}</p>
                        {a.staff?.name && <p className="text-[#444] text-xs mt-0.5">{a.staff.name}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        {a.services?.price != null && (
                          <p className="text-[#C8A96E] text-sm tabular-nums">Q{Number(a.services.price).toFixed(2)}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          <span className="text-[#555] text-[10px]">{st.label}</span>
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
export default function ClientesPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [editTarget, setEditTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone, notes, created_at, last_visit')
      .order('name')
    setClients(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search.trim()
    ? clients.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      )
    : clients

  return (
    <div className="min-h-screen bg-[#080808] p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Clientes
          </h1>
          <p className="text-[#383430] text-xs mt-1">
            {loading ? '...' : `${clients.length} clientes registrados`}
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#333]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl pl-10 pr-4 py-3 text-[#E8E3DC] text-sm placeholder-[#333] focus:outline-none focus:border-[#C8A96E]/40 transition-colors"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#1C1C1C] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E2E2E" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[#383430] text-sm">
              {search ? 'Sin resultados' : 'Sin clientes aún'}
            </p>
            <p className="text-[#222] text-xs mt-1">
              {search ? 'Prueba con otro nombre o teléfono' : 'Los clientes aparecen aquí cuando agendan una cita'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[#111]">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#111] transition-colors text-left group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-[#C8A96E]/10 border border-[#C8A96E]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#C8A96E] text-sm font-semibold">
                    {c.name ? c.name[0].toUpperCase() : '?'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[#E8E3DC] text-sm font-medium truncate">{c.name || '—'}</p>
                  <p className="text-[#444] text-xs mt-0.5 truncate">{c.phone || 'Sin teléfono'}</p>
                </div>

                {/* Última visita */}
                <div className="text-right shrink-0">
                  {c.last_visit ? (
                    <>
                      <p className="text-[#888] text-xs">{fmtDate(c.last_visit)}</p>
                      <p className="text-[#333] text-[10px] mt-0.5">última visita</p>
                    </>
                  ) : (
                    <p className="text-[#333] text-xs">Sin visitas</p>
                  )}
                </div>

                {/* Flecha */}
                <svg className="text-[#2A2A2A] group-hover:text-[#444] transition-colors shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
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
