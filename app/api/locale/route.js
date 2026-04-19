import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { currencyForCountry } from '../../../lib/plans'

// Endpoint liviano que lee el header geo de Vercel y devuelve el país + moneda
// correspondiente. El landing hace fetch al montar para ajustar precios.

export async function GET() {
  const h = await headers()
  const country = h.get('x-vercel-ip-country') || null
  const currency = currencyForCountry(country)

  return NextResponse.json(
    { country, currency },
    {
      headers: {
        'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
