// Códigos de error compartidos entre cliente/servidor.
// Se propagan como strings; los UIs los mapean a mensajes amigables.

export const BookingError = {
  SLOT_UNAVAILABLE: 'slot_unavailable',
  PLAN_LIMIT_REACHED: 'plan_limit_reached',
  TRIAL_EXPIRED: 'trial_expired',
  NO_ACTIVE_PLAN: 'no_active_plan',
  BUSINESS_NOT_ACTIVE: 'business_not_active',
  NOT_AUTHORIZED: 'not_authorized',
  INVALID_RANGE: 'invalid_range',
}

export const ApiError = {
  RATE_LIMITED: 'rate_limited',
  NOT_ACCEPTING: 'not_accepting',
  MISSING_FIELDS: 'missing_fields',
  INVALID_DATE: 'invalid_date',
  ORG_NOT_FOUND: 'org_not_found',
  SERVICE_NOT_FOUND: 'service_not_found',
  BOOKING_FAILED: 'booking_failed',
  CLIENT_FAILED: 'client_failed',
}
