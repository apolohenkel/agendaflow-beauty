// Open Graph image generada con edge runtime.
// Se sirve automáticamente en /opengraph-image y se usa en metadata.openGraph.images.
// La imagen es 1200x630 (recomendado por Facebook, Twitter, LinkedIn).

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AgendaFlow Beauty — Agenda con WhatsApp IA'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
          background: 'linear-gradient(135deg, #FAF6F0 0%, #EDE5DB 100%)',
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
            background: '#B8824B',
          }}
        />

        {/* Top: logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #B8824B, #8C5E35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(184,130,75,0.3)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
              <path d="M4.5 20 L12 4 L19.5 20" />
              <path d="M7.8 13.8 C12 13 15 13.3 21 18.2" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 32, color: '#2B1810', letterSpacing: '0.01em', lineHeight: 1 }}>
              AgendaFlow
            </span>
            <span style={{ fontSize: 12, color: '#B8824B', letterSpacing: '0.3em', marginTop: 6, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Beauty
            </span>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              color: '#2B1810',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Tu agenda se llena</span>
            <span style={{ fontStyle: 'italic', color: '#B8824B' }}>sola</span>
          </div>
          <p style={{ fontSize: 28, color: '#6B5A4F', fontFamily: 'sans-serif', maxWidth: 800, lineHeight: 1.35 }}>
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
                  border: '1px solid #EDE5DB',
                  color: '#2B1810',
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
              background: '#2B1810',
              color: '#FAF6F0',
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
