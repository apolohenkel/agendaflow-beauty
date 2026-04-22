// Separador dorado de 1px con fade en los extremos.
// Uso:
//   <Hairline />                     horizontal, full width
//   <Hairline className="my-8" />    con margen vertical
//   <Hairline vertical />            vertical, stretch a altura del contenedor flex

export default function Hairline({ vertical = false, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`${vertical ? 'hairline-gold-v' : 'hairline-gold-h'} ${className}`}
    />
  )
}
