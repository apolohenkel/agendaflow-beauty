import { createAdminClient } from './supabase/admin'
import { logger } from './logger'

let _admin = null
function getAdmin() {
  if (!_admin) _admin = createAdminClient()
  return _admin
}

export async function rateLimit(key, quota, windowSeconds = 60) {
  try {
    const { data, error } = await getAdmin().rpc('rate_limit_check', {
      p_key: key,
      p_quota: quota,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      logger.warn('rate_limit', 'rpc_failed', { key, err: error.message })
      return { allowed: false, error: 'rate_limit_unavailable' }
    }
    return { allowed: data === true }
  } catch (err) {
    logger.warn('rate_limit', 'threw', { key, err: err?.message })
    return { allowed: false, error: 'rate_limit_unavailable' }
  }
}

export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
