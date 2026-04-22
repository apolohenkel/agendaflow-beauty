// Helpers puros para el sistema de fidelidad.
// Sin imports de supabase — reciben datos ya cargados.

// Cuenta las visitas completadas de un cliente que cuentan para una regla.
// Si la regla tiene `counted_service_ids`, sólo cuentan esos servicios.
// Si es null/[], cuentan todas las citas completadas.
//
// appointments: array de { status, service_id } ya filtrado al cliente.
export function countVisitsForRule(appointments, rule) {
  if (!Array.isArray(appointments) || !rule) return 0
  const filter = Array.isArray(rule.counted_service_ids) && rule.counted_service_ids.length > 0
    ? new Set(rule.counted_service_ids)
    : null
  return appointments.filter((a) => {
    if (a.status !== 'completed') return false
    if (filter && !filter.has(a.service_id)) return false
    return true
  }).length
}

// Calcula el progreso de un cliente hacia una regla.
// Retorna { visits, required, remaining, redeemedCycles, progressInCycle }.
//
// - redeemedCycles: cuántas veces el cliente YA ha completado el ciclo
//   (ej. 23 visitas con rule de 10 → 2 ciclos canjeados, 3 visitas en el ciclo actual)
// - progressInCycle: visitas dentro del ciclo actual (0..required-1)
// - remaining: cuántas visitas faltan para completar el ciclo actual
//
// NOTA: este cálculo asume que el canje consume visitas. Si el negocio prefiere
// "progreso acumulativo sin canje", basta con mirar `visits` y `remaining`
// y no preocuparse por redeemedCycles.
export function calculateProgress(appointments, rule) {
  const visits = countVisitsForRule(appointments, rule)
  const required = Math.max(1, Number(rule.visits_required) || 10)
  const redeemedCycles = Math.floor(visits / required)
  const progressInCycle = visits % required
  const remaining = required - progressInCycle
  const isReadyToRedeem = progressInCycle === 0 && visits > 0 // visitas exactamente divisibles y al menos una
  return {
    visits,
    required,
    redeemedCycles,
    progressInCycle,
    remaining,
    // Flag útil: el cliente acaba de completar un ciclo (está parado en 0 de N con visitas > 0)
    // NO es suficiente para canjear — depende de si ya fue canjeado
    isReadyToRedeem,
  }
}

// Genera un texto descriptivo legible para mostrar la recompensa.
// Ej: "1 corte gratis", "10% de descuento", "Q50 de descuento"
export function formatReward(rule, serviceName = null) {
  if (!rule) return ''
  if (rule.reward_description) return rule.reward_description
  const name = serviceName || 'servicio'
  switch (rule.reward_type) {
    case 'free_service':
      return `1 ${name} gratis`
    case 'percent_off':
      return `${Number(rule.reward_value || 0)}% de descuento`
    case 'fixed_amount_off':
      return `Q${Number(rule.reward_value || 0).toFixed(0)} de descuento`
    default:
      return ''
  }
}

// Resumen corto para listas: "10 visitas → 1 corte gratis"
export function summarizeRule(rule, serviceName = null) {
  if (!rule) return ''
  const reward = formatReward(rule, serviceName)
  return `${rule.visits_required} visitas → ${reward}`
}
