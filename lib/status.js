// Mapa canónico de estados de cita.
// Importar desde aquí — no redefinir en cada página.
export const STATUS_MAP = {
  pending:      { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pendiente'    },
  confirmed:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Confirmada'   },
  completed:    { bg: 'bg-sky-500/10',     text: 'text-sky-400',     dot: 'bg-sky-400',     label: 'Completada'   },
  cancelled:    { bg: 'bg-red-500/10',     text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelada'    },
  no_show:      { bg: 'bg-zinc-500/10',    text: 'text-zinc-500',    dot: 'bg-zinc-500',    label: 'No asistió'   },
  rescheduled:  { bg: 'bg-purple-500/10',  text: 'text-purple-400',  dot: 'bg-purple-400',  label: 'Reprogramada' },
}

export const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
