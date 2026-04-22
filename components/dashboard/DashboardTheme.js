'use client'

import { useOrg } from '@/lib/org-context'
import { getVertical, DEFAULT_VERTICAL } from '@/lib/verticals'

// Aplica tokens CSS del dashboard y deriva --dash-primary del vertical del
// dueño. Orden de prioridad:
//   1. organizations.primary_color (override custom del dueño)
//   2. theme del vertical (beauty_salon, barbershop, nail_salon, spa)
//   3. #C8A96E default (champagne gold)

function hexWithAlpha(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return null
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  if ([r, g, b].some((x) => Number.isNaN(x))) return null
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function darken(hex, amount = 0.25) {
  if (!hex || !hex.startsWith('#')) return hex
  const c = hex.replace('#', '')
  let r = parseInt(c.slice(0, 2), 16)
  let g = parseInt(c.slice(2, 4), 16)
  let b = parseInt(c.slice(4, 6), 16)
  if ([r, g, b].some((x) => Number.isNaN(x))) return hex
  r = Math.round(r * (1 - amount))
  g = Math.round(g * (1 - amount))
  b = Math.round(b * (1 - amount))
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function lighten(hex, amount = 0.3) {
  if (!hex || !hex.startsWith('#')) return hex
  const c = hex.replace('#', '')
  let r = parseInt(c.slice(0, 2), 16)
  let g = parseInt(c.slice(2, 4), 16)
  let b = parseInt(c.slice(4, 6), 16)
  if ([r, g, b].some((x) => Number.isNaN(x))) return hex
  r = Math.round(r + (255 - r) * amount)
  g = Math.round(g + (255 - g) * amount)
  b = Math.round(b + (255 - b) * amount)
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export default function DashboardTheme({ children }) {
  const { vertical, primaryColorOverride } = useOrg()

  const verticalKey = vertical || DEFAULT_VERTICAL
  const v = getVertical(verticalKey)

  const primary = primaryColorOverride || v?.theme?.primary || '#C8A96E'
  const primaryDeep = darken(primary, 0.3)
  const primarySoft = lighten(primary, 0.35)

  const style = {
    '--dash-primary': primary,
    '--dash-primary-deep': primaryDeep,
    '--dash-primary-soft': primarySoft,
    '--dash-hairline': hexWithAlpha(primary, 0.25) || 'rgba(200, 169, 110, 0.25)',
    '--dash-border-hover': hexWithAlpha(primary, 0.18) || 'rgba(200, 169, 110, 0.18)',
    '--dash-primary-bg-8': hexWithAlpha(primary, 0.08) || 'rgba(200, 169, 110, 0.08)',
    '--dash-primary-bg-15': hexWithAlpha(primary, 0.15) || 'rgba(200, 169, 110, 0.15)',
  }

  return (
    <div className="dashboard-shell flex flex-col md:flex-row min-h-screen md:h-screen md:overflow-hidden" style={style}>
      {children}
    </div>
  )
}
