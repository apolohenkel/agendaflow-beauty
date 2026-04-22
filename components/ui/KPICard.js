// KPICard — Stat card premium con Fraunces, tickmark ornamental y variante "gold hero".
//
// Uso:
//   <KPICard label="Citas hoy" value={12} unit="agendadas" hero />
//   <KPICard label="Clientes" value="1.245" trend={+12} />
//   <KPICard label="Próxima cita" value="15:30" sub="Ana López" />
//
// Props:
//   label   — eyebrow uppercase pequeño (obligatorio)
//   value   — número o string grande (obligatorio). Se usa la clase .kpi-number
//   unit    — texto pequeño al lado del número (ej. "citas")
//   sub     — línea inferior descriptiva
//   trend   — número +/-; si se da, muestra pill de tendencia
//   hero    — si true, fondo con gradient dorado + corner ornamental
//   loading — reemplaza value con skeleton

export default function KPICard({
  label,
  value,
  unit,
  sub,
  trend,
  hero = false,
  loading = false,
}) {
  const isNeutral = trend === 0
  const isPositive = typeof trend === 'number' && trend > 0
  const isNegative = typeof trend === 'number' && trend < 0

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-6 card-sweep
        transition-colors duration-200
        ${hero
          ? 'bg-gradient-to-br from-[var(--dash-primary-bg-15)] via-[var(--dash-ink-raised)] to-[var(--dash-ink-raised2)] border border-[var(--dash-border-hover)]'
          : 'bg-[var(--dash-ink-raised)] border border-[var(--dash-border)] hover:border-[var(--dash-border-hover)]'
        }
      `}
    >
      {/* Tickmark ornamental en esquina sup-izq (solo hero) */}
      {hero && (
        <span
          aria-hidden
          className="absolute top-3 left-3 text-[10px] text-[var(--dash-primary)]/50 select-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ✦
        </span>
      )}

      {/* Eyebrow */}
      <p className="eyebrow mb-3">{label}</p>

      {/* Número + unidad */}
      <div className="flex items-baseline gap-2">
        {loading ? (
          <span className="block h-10 w-20 rounded bg-[var(--dash-ink-sunken)] animate-pulse" />
        ) : (
          <>
            <span
              className={`kpi-number text-5xl ${hero ? 'text-[var(--dash-primary-soft)]' : 'text-[var(--dash-text)]'}`}
            >
              {value}
            </span>
            {unit && (
              <span className="text-xs text-[var(--dash-text-muted)] lowercase">
                {unit}
              </span>
            )}
          </>
        )}
      </div>

      {/* Sub / trend */}
      <div className="mt-2 flex items-center gap-2">
        {sub && (
          <p className="text-xs text-[var(--dash-text-muted)] truncate">{sub}</p>
        )}
        {typeof trend === 'number' && !loading && (
          <span
            className={`
              inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full
              ${isPositive ? 'bg-[var(--dash-success)]/12 text-[var(--dash-success)]' : ''}
              ${isNegative ? 'bg-[var(--dash-danger)]/12 text-[var(--dash-danger)]' : ''}
              ${isNeutral ? 'bg-[var(--dash-border)] text-[var(--dash-text-muted)]' : ''}
            `}
          >
            {isPositive ? '↑' : isNegative ? '↓' : '·'}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  )
}
