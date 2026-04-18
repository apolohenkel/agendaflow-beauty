'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function pct(num, den) {
  if (!den) return 0
  return Math.round((num / den) * 100)
}

function fmtCurrency(n) {
  return `Q${Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function startOf(date, unit) {
  const d = new Date(date)
  if (unit === 'day')   { d.setHours(0, 0, 0, 0) }
  if (unit === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0) }
  return d
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, gold, trend }) {
  return (
    <div className="bg-[#0F0F0F] border border-[#1C1C1C] rounded-2xl p-6 flex flex-col gap-2 hover:border-[#2A2A2A] transition-colors">
      <p className="text-[#888] text-[10px] uppercase tracking-[0.18em] font-medium">{label}</p>
      <p
        className={`text-4xl font-light leading-none ${gold ? 'text-[#C8A96E]' : 'text-[#F0EBE3]'}`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
      {(sub || trend != null) && (
        <div className="flex items-center gap-2 mt-1">
          {sub && <p className="text-[#777] text-xs">{sub}</p>}
          {trend != null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${trend >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── BARRA HORIZONTAL ─────────────────────────────────────────────────────────
function BarRow({ label, value, max, sub, color = '#C8A96E' }) {
  const w = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[#C8C3BC] text-sm truncate max-w-[60%]">{label}</p>
        <div className="flex items-center gap-2">
          {sub && <p className="text-[#A0A0A0] text-xs">{sub}</p>}
          <p className="text-[#E8E3DC] text-sm font-medium tabular-nums w-8 text-right">{value}</p>
        </div>
      </div>
      <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${w}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ─── MINI BARRAS DIARIAS ──────────────────────────────────────────────────────
function DailyBars({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const today = new Date()

  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => {
        const h = Math.max(Math.round((d.count / max) * 100), d.count > 0 ? 8 : 2)
        const isToday = d.label === today.toLocaleDateString('es-GT', { weekday: 'short' })
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            {d.count > 0 && (
              <p className="text-[#888] text-[9px] tabular-nums">{d.count}</p>
            )}
            <div
              className={`w-full rounded-t-sm transition-all duration-500 ${isToday ? 'bg-[#C8A96E]' : 'bg-[#1E1E1E]'}`}
              style={{ height: `${h}%`, minHeight: '3px' }}
            />
            <p className={`text-[9px] ${isToday ? 'text-[#C8A96E]' : 'text-[#333]'}`}>{d.label}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── SELECTOR DE PERÍODO ──────────────────────────────────────────────────────
const PERIODOS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [periodo, setPeriodo] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const now = new Date()
      const periodoStart = new Date(now.getTime() - periodo * 24 * 60 * 60 * 1000)
      const prevStart   = new Date(periodoStart.getTime() - periodo * 24 * 60 * 60 * 1000)
      const monthStart  = startOf(now, 'month')

      // ── Citas del período actual y anterior
      const [{ data: appts }, { data: prevAppts }, { data: allClients }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, status, starts_at, ends_at, service_id, client_id, services(name, price), clients(id, created_at)')
          .gte('starts_at', periodoStart.toISOString()),
        supabase
          .from('appointments')
          .select('id, status')
          .gte('starts_at', prevStart.toISOString())
          .lt('starts_at', periodoStart.toISOString()),
        supabase
          .from('clients')
          .select('id, created_at'),
      ])

      const list = appts || []
      const prev = prevAppts || []
      const clients = allClients || []

      // ── Métricas base
      const total = list.length
      const completed = list.filter((a) => a.status === 'completed').length
      const noShows  = list.filter((a) => a.status === 'no_show').length
      const cancelled = list.filter((a) => a.status === 'cancelled').length
      const noShowRate = pct(noShows, total)

      // ── Ingresos realizados (completadas) y proyectados (confirmed + pending)
      const revenue = list
        .filter((a) => a.status === 'completed' && a.services?.price != null)
        .reduce((sum, a) => sum + Number(a.services.price), 0)

      const revenueProjected = list
        .filter((a) => ['confirmed', 'pending'].includes(a.status) && a.services?.price != null)
        .reduce((sum, a) => sum + Number(a.services.price), 0)

      // ── Tendencia vs período anterior
      const prevTotal = prev.length
      const trendCitas = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null

      // ── Clientes nuevos en el período
      const newClients = clients.filter((c) => new Date(c.created_at) >= periodoStart).length

      // ── Servicios más solicitados
      const svcMap = {}
      list.forEach((a) => {
        if (a.services?.name) {
          svcMap[a.services.name] = (svcMap[a.services.name] || 0) + 1
        }
      })
      const topServices = Object.entries(svcMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      // ── Citas por día (últimos 14 días para el gráfico)
      const dias14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (13 - i))
        d.setHours(0, 0, 0, 0)
        return d
      })

      const { data: recentAppts } = await supabase
        .from('appointments')
        .select('starts_at')
        .gte('starts_at', dias14[0].toISOString())

      const dailyMap = {}
      ;(recentAppts || []).forEach((a) => {
        const key = new Date(a.starts_at).toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric' })
        dailyMap[key] = (dailyMap[key] || 0) + 1
      })

      const dailyData = dias14.map((d) => ({
        label: d.toLocaleDateString('es-GT', { weekday: 'short' }),
        date: d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' }),
        count: dailyMap[d.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric' })] || 0,
      }))

      // ── Distribución de estados
      const statusDist = [
        { label: 'Completadas', value: completed, color: '#38bdf8' },
        { label: 'No asistió',  value: noShows,   color: '#71717a' },
        { label: 'Canceladas',  value: cancelled,  color: '#f87171' },
        { label: 'Pendientes / Confirmadas', value: total - completed - noShows - cancelled, color: '#C8A96E' },
      ].filter((s) => s.value > 0)

      setData({
        total, completed, noShows, cancelled, noShowRate,
        revenue, revenueProjected, trendCitas, newClients,
        topServices, dailyData, statusDist,
        totalClients: clients.length,
      })
      setLoading(false)
    }

    load()
  }, [periodo])

  return (
    <div className="min-h-screen bg-[#080808] p-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            Reportes
          </h1>
          <p className="text-[#777] text-xs mt-1">Métricas de tu negocio</p>
        </div>

        {/* Selector período */}
        <div className="flex bg-[#111] border border-[#1E1E1E] rounded-xl p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriodo(p.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periodo === p.days ? 'bg-[#1E1E1E] text-[#E8E3DC]' : 'text-[#444] hover:text-[#888]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="w-5 h-5 border border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Citas totales"
              value={data.total}
              sub={`últimos ${periodo} días`}
              trend={data.trendCitas}
              gold
            />
            <StatCard
              label="Tasa no-show"
              value={`${data.noShowRate}%`}
              sub={`${data.noShows} de ${data.total} citas`}
            />
            <StatCard
              label="Clientes nuevos"
              value={data.newClients}
              sub={`de ${data.totalClients} totales`}
            />
            {/* Tarjeta de ingresos con realizados y proyectados */}
            <div className="bg-[#0F0F0F] border border-[#1C1C1C] rounded-2xl p-6 flex flex-col gap-2 hover:border-[#2A2A2A] transition-colors">
              <p className="text-[#888] text-[10px] uppercase tracking-[0.18em] font-medium">Ingresos</p>
              <p className="text-[#C8A96E] text-4xl font-light leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                {fmtCurrency(data.revenue)}
              </p>
              <p className="text-[#777] text-xs">realizados ({data.completed} completadas)</p>
              {data.revenueProjected > 0 && (
                <div className="mt-1 pt-2 border-t border-[#1C1C1C]">
                  <p className="text-[#686460] text-sm font-light tabular-nums">{fmtCurrency(data.revenueProjected)}</p>
                  <p className="text-[#2E2E2E] text-[10px] mt-0.5">proyectados (confirmadas/pendientes)</p>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico diario + Distribución */}
          <div className="grid grid-cols-3 gap-4">

            {/* Citas por día (últimos 14 días) */}
            <div className="col-span-2 bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[#D4CFC8] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
                  Citas por día
                </h2>
                <p className="text-[#666] text-xs">últimos 14 días</p>
              </div>
              <DailyBars data={data.dailyData} />
            </div>

            {/* Distribución de estados */}
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-6 space-y-4">
              <h2 className="text-[#D4CFC8] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
                Estado de citas
              </h2>
              {data.total === 0 ? (
                <p className="text-[#333] text-sm text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-4">
                  {data.statusDist.map((s) => (
                    <BarRow
                      key={s.label}
                      label={s.label}
                      value={s.value}
                      max={data.total}
                      sub={`${pct(s.value, data.total)}%`}
                      color={s.color}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Servicios más solicitados */}
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-6 space-y-4">
            <h2 className="text-[#D4CFC8] text-base font-light" style={{ fontFamily: 'var(--font-display)' }}>
              Servicios más solicitados
            </h2>
            {data.topServices.length === 0 ? (
              <p className="text-[#333] text-sm text-center py-8">
                Sin datos — las citas con servicio asignado aparecerán aquí
              </p>
            ) : (
              <div className="space-y-4">
                {data.topServices.map(([name, count], i) => (
                  <BarRow
                    key={name}
                    label={`${i + 1}. ${name}`}
                    value={count}
                    max={data.topServices[0][1]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Resumen ejecutivo */}
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-6">
            <h2 className="text-[#D4CFC8] text-base font-light mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Resumen del período
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#161616] rounded-xl overflow-hidden">
              {[
                { label: 'Completadas', value: data.completed, pct: pct(data.completed, data.total) },
                { label: 'No asistió',  value: data.noShows,   pct: pct(data.noShows, data.total) },
                { label: 'Canceladas',  value: data.cancelled, pct: pct(data.cancelled, data.total) },
                { label: 'Otras',       value: data.total - data.completed - data.noShows - data.cancelled, pct: pct(data.total - data.completed - data.noShows - data.cancelled, data.total) },
              ].map((s) => (
                <div key={s.label} className="bg-[#0D0D0D] px-6 py-5 text-center">
                  <p className="text-[#E8E3DC] text-2xl font-light tabular-nums">{s.value}</p>
                  <p className="text-[#777] text-xs mt-1">{s.label}</p>
                  <p className="text-[#C8A96E] text-[10px] mt-1">{s.pct}%</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
