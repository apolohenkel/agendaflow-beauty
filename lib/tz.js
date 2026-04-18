// Helpers IANA timezone sin dependencias externas.

export function dayOfWeekInTz(dateStr, tz) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(d)
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[name] ?? 0
}

export function localToUtcIso(dateStr, hh, mm, tz) {
  const [Y, M, D] = dateStr.split('-').map(Number)
  const guess = Date.UTC(Y, M - 1, D, hh, mm, 0)
  const tzStr = new Date(guess).toLocaleString('sv-SE', { timeZone: tz, hour12: false })
  const [dateP, timeP] = tzStr.split(' ')
  const [tY, tM, tD] = dateP.split('-').map(Number)
  const [th, tm, ts] = timeP.split(':').map(Number)
  const tzGuessMs = Date.UTC(tY, tM - 1, tD, th, tm, ts)
  const offset = tzGuessMs - guess
  return new Date(guess - offset).toISOString()
}

export function dayBoundsUtcIso(dateStr, tz) {
  const start = localToUtcIso(dateStr, 0, 0, tz)
  const [Y, M, D] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(Y, M - 1, D + 1)).toISOString().slice(0, 10)
  const end = localToUtcIso(next, 0, 0, tz)
  return { start, end }
}
