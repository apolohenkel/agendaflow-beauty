import { describe, it, expect } from 'vitest'
import { isFallback, FALLBACK_PREFIXES } from '../lib/whatsapp/agent'

describe('isFallback', () => {
  it('detects known fallback messages', () => {
    expect(isFallback('Disculpa, tuve un problema procesando tu mensaje. Intenta de nuevo en un momento.')).toBe(true)
    expect(isFallback('Dame un momentito, estoy revisando la agenda.')).toBe(true)
    expect(isFallback('Se me complicó la conexión un segundo.')).toBe(true)
    expect(isFallback('Tuve un problema procesando tu mensaje. ¿Me escribes otra vez qué necesitas?')).toBe(true)
  })

  it('lets real assistant messages through', () => {
    expect(isFallback('Claro, te agendo el corte el martes a las 3pm.')).toBe(false)
    expect(isFallback('Tenemos disponibles: Corte (Q150), Balayage (Q450)...')).toBe(false)
    expect(isFallback('')).toBe(false)
    expect(isFallback(null)).toBe(false)
    expect(isFallback(undefined)).toBe(false)
  })

  it('has a reasonable prefix list', () => {
    expect(FALLBACK_PREFIXES.length).toBeGreaterThanOrEqual(3)
    expect(FALLBACK_PREFIXES.every((p) => typeof p === 'string' && p.length > 5)).toBe(true)
  })
})
