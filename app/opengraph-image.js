// Open Graph image generada con edge runtime.
// Se sirve automáticamente en /opengraph-image y se usa en metadata.openGraph.images.
// La imagen es 1200x630 (recomendado por Facebook, Twitter, LinkedIn).
//
// Brand AgendaFlow: navy #17384A + gold #C8A263 sobre cream #FBFAF7.

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AgendaFlow Beauty — Agenda con WhatsApp IA'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const NAVY = '#17384A'
const GOLD = '#C8A263'
const CREAM = '#FBFAF7'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: `linear-gradient(135deg, ${CREAM} 0%, #F1EEE8 100%)`,
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Corner ornamento dorado */}
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 48,
            width: 80,
            height: 2,
            background: GOLD,
          }}
        />

        {/* Top: isotipo AF + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="68" height="68" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <path d="M 12 82 L 28 18 L 44 82" fill="none" stroke={NAVY} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="19.5" y1="60" x2="36.5" y2="60" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
            <line x1="54" y1="18" x2="54" y2="82" stroke={NAVY} strokeWidth="6.5" strokeLinecap="round" />
            <line x1="54" y1="18" x2="78" y2="18" stroke={NAVY} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M 54 46 L 70 46 C 82.5 46 90 40 92 31" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 40, color: NAVY, letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 600 }}>
              Agenda<span style={{ color: GOLD }}>Flow</span>
            </span>
            <span style={{ fontSize: 13, color: GOLD, letterSpacing: '0.3em', marginTop: 6, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 500 }}>
              Beauty
            </span>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 80,
              lineHeight: 1.05,
              color: NAVY,
              fontWeight: 300,
              letterSpacing: '-0.03em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Tu agenda se llena</span>
            <span style={{ fontStyle: 'italic', color: GOLD }}>sola</span>
          </div>
          <p style={{ fontSize: 28, color: '#5C6B75', fontFamily: 'sans-serif', maxWidth: 880, lineHeight: 1.35 }}>
            Bot de WhatsApp con IA para salones, barberías, spas y nail studios.
          </p>
        </div>

        {/* Bottom: verticals + CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 20, fontFamily: 'sans-serif' }}>
            {['💇 Salones', '🪒 Barberías', '💅 Nails', '🧖 Spas'].map((v) => (
              <div
                key={v}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: 'white',
                  border: `1px solid rgba(23,56,74,0.12)`,
                  color: NAVY,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {v}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: '16px 32px',
              borderRadius: 999,
              background: NAVY,
              color: CREAM,
              fontSize: 22,
              fontFamily: 'sans-serif',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            14 días gratis →
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
