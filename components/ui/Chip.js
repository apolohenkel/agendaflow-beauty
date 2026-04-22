// Chip — pill de estado con dot + label uppercase.
// Consistente para todos los estados del sistema. Usa tokens del dashboard.
//
// Uso:
//   <Chip variant="gold">Activo</Chip>
//   <Chip variant="success">Completada</Chip>
//   <Chip variant="warn">Pendiente</Chip>
//   <Chip variant="danger">Cancelada</Chip>
//   <Chip variant="muted">Sin asignar</Chip>

const VARIANTS = {
  gold: {
    bg: 'bg-[var(--dash-primary-bg-8)]',
    text: 'text-[var(--dash-primary-soft)]',
    dot: 'bg-[var(--dash-primary)]',
    border: 'border-[var(--dash-primary)]/20',
  },
  success: {
    bg: 'bg-[var(--dash-success)]/10',
    text: 'text-[var(--dash-success)]',
    dot: 'bg-[var(--dash-success)]',
    border: 'border-[var(--dash-success)]/20',
  },
  warn: {
    bg: 'bg-[var(--dash-warn)]/10',
    text: 'text-[var(--dash-warn)]',
    dot: 'bg-[var(--dash-warn)]',
    border: 'border-[var(--dash-warn)]/20',
  },
  danger: {
    bg: 'bg-[var(--dash-danger)]/10',
    text: 'text-[var(--dash-danger)]',
    dot: 'bg-[var(--dash-danger)]',
    border: 'border-[var(--dash-danger)]/20',
  },
  info: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
    border: 'border-sky-500/20',
  },
  muted: {
    bg: 'bg-[var(--dash-ink-sunken)]',
    text: 'text-[var(--dash-text-muted)]',
    dot: 'bg-[var(--dash-text-muted)]',
    border: 'border-[var(--dash-border)]',
  },
}

export default function Chip({
  variant = 'muted',
  children,
  size = 'md',
  className = '',
}) {
  const v = VARIANTS[variant] || VARIANTS.muted
  const sizeCls = size === 'sm'
    ? 'text-[9px] px-2 py-0.5 tracking-[0.14em]'
    : 'text-[10px] px-2.5 py-1 tracking-[0.12em]'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium uppercase shrink-0
        ${sizeCls} ${v.bg} ${v.text} ${v.border} ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {children}
    </span>
  )
}

// Mapa canónico estado → variant Chip
export const STATUS_TO_CHIP = {
  pending:     'warn',
  confirmed:   'success',
  completed:   'info',
  cancelled:   'danger',
  no_show:     'muted',
  rescheduled: 'gold',
}
