/**
 * Logo — componente oficial del brand AgendaFlow.
 *
 * Variantes:
 * - isotipo                 : AF en navy + swash dorado (bg claro)
 * - isotipo-reversa         : AF blanco + swash dorado (bg navy/oscuro)
 * - isotipo-blanco          : AF + swash en blanco (sobre fotos/color fuerte)
 * - isotipo-monocromo-navy  : AF + swash en navy (sello/factura/BN)
 * - horizontal              : isotipo + wordmark "AgendaFlow" (bg claro)
 * - horizontal-reversa      : isotipo + wordmark para bg oscuro
 * - horizontal-monocromo    : todo navy, una tinta
 * - apilado                 : isotipo arriba + wordmark abajo
 *
 * Colores oficiales:
 *   Navy  #17384A  — estructura
 *   Gold  #C8A263  — acento "flow"
 *   White #FFFFFF  — reversa
 */

const NAVY = '#17384A'
const GOLD = '#C8A263'
const WHITE = '#FFFFFF'

function Isotipo({ color = NAVY, accent = GOLD, monochrome = false }) {
  const c = color
  const a = monochrome ? color : accent
  return (
    <>
      <path d="M 12 82 L 28 18 L 44 82" fill="none" stroke={c} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="19.5" y1="60" x2="36.5" y2="60" stroke={c} strokeWidth="5" strokeLinecap="round" />
      <line x1="54" y1="18" x2="54" y2="82" stroke={c} strokeWidth="6.5" strokeLinecap="round" />
      <line x1="54" y1="18" x2="78" y2="18" stroke={c} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M 54 46 L 70 46 C 82.5 46 90 40 92 31" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round" />
    </>
  )
}

export default function Logo({ variant = 'horizontal', size, className = '', style, ariaLabel }) {
  const commonProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    role: 'img',
    'aria-label': ariaLabel || `AgendaFlow — ${variant}`,
    className,
    style,
  }

  // ISOTIPOS (cuadrados, viewBox 100x100)
  if (variant.startsWith('isotipo')) {
    const dim = size || 40
    let color = NAVY
    let accent = GOLD
    let monochrome = false
    if (variant === 'isotipo-reversa') {
      color = WHITE
      accent = GOLD
    } else if (variant === 'isotipo-blanco') {
      color = WHITE
      accent = WHITE
      monochrome = true
    } else if (variant === 'isotipo-monocromo-navy') {
      color = NAVY
      accent = NAVY
      monochrome = true
    }
    return (
      <svg {...commonProps} width={dim} height={dim} viewBox="0 0 100 100">
        <Isotipo color={color} accent={accent} monochrome={monochrome} />
      </svg>
    )
  }

  // HORIZONTAL (ratio 380:80)
  if (variant === 'horizontal' || variant === 'horizontal-reversa' || variant === 'horizontal-monocromo') {
    const h = size || 40
    const w = h * (380 / 80)
    const color = variant === 'horizontal-reversa' ? WHITE : NAVY
    const isMono = variant === 'horizontal-monocromo'
    return (
      <svg {...commonProps} width={w} height={h} viewBox="0 0 380 80">
        <g transform="translate(4, 4) scale(0.72)">
          <Isotipo color={color} accent={isMono ? color : GOLD} monochrome={isMono} />
        </g>
        <text
          x="90"
          y="52"
          fontFamily="var(--font-display), 'Onest', -apple-system, 'Segoe UI', system-ui, sans-serif"
          fontWeight="600"
          fontSize="32"
          letterSpacing="-1"
          fill={color}
        >
          {isMono ? (
            'AgendaFlow'
          ) : (
            <>
              Agenda<tspan fill={GOLD}>Flow</tspan>
            </>
          )}
        </text>
      </svg>
    )
  }

  // APILADO (cuadrado 240x240)
  if (variant === 'apilado') {
    const dim = size || 120
    return (
      <svg {...commonProps} width={dim} height={dim} viewBox="0 0 240 240">
        <g transform="translate(70, 20)">
          <Isotipo />
        </g>
        <text
          x="120"
          y="180"
          textAnchor="middle"
          fontFamily="var(--font-display), 'Onest', -apple-system, 'Segoe UI', system-ui, sans-serif"
          fontWeight="600"
          fontSize="36"
          letterSpacing="-1.2"
          fill={NAVY}
        >
          Agenda<tspan fill={GOLD}>Flow</tspan>
        </text>
      </svg>
    )
  }

  return null
}

// Helpers para consumidores que quieran los colores:
Logo.NAVY = NAVY
Logo.GOLD = GOLD
Logo.WHITE = WHITE
