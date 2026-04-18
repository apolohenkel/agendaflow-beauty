// Structured logger minimal. Loggea JSON en Vercel/stdout.
// Si `globalThis.Sentry` está disponible (cargado via @sentry/nextjs),
// captura automáticamente errores a Sentry. No fuerza la dependencia.

function emit(level, scope, msg, extra) {
  const payload = {
    level,
    scope,
    msg: typeof msg === 'string' ? msg : undefined,
    ...(extra || {}),
    ts: new Date().toISOString(),
  }
  if (msg && typeof msg !== 'string') payload.err = serializeErr(msg)
  const out = JSON.stringify(payload)
  if (level === 'error') console.error(out)
  else if (level === 'warn') console.warn(out)
  else console.log(out)
}

function serializeErr(err) {
  if (!err) return null
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack }
  return err
}

function captureSentry(err, ctx) {
  try {
    const S = globalThis.Sentry
    if (S && typeof S.captureException === 'function') {
      S.captureException(err, ctx ? { extra: ctx } : undefined)
    }
  } catch { /* noop */ }
}

export const logger = {
  info(scope, msg, extra) { emit('info', scope, msg, extra) },
  warn(scope, msg, extra) { emit('warn', scope, msg, extra) },
  error(scope, errOrMsg, extra) {
    emit('error', scope, errOrMsg, extra)
    if (errOrMsg instanceof Error) captureSentry(errOrMsg, { scope, ...extra })
  },
}
