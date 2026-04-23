import Link from 'next/link'
import Logo from '@/components/Logo'

export const metadata = {
  title: '404 · AgendaFlow Beauty',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#17384A] flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-5">
        <div className="mx-auto flex items-center justify-center">
          <Logo variant="isotipo-reversa" size={72} />
        </div>
        <p className="text-[#C8A263] text-[10px] tracking-[0.3em] uppercase">Error 404</p>
        <h1 className="text-white text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
          Página no encontrada
        </h1>
        <p className="text-white/60 text-sm">La página que buscas no existe o fue movida.</p>
        <Link
          href="/"
          className="inline-block bg-[#C8A263] hover:brightness-110 text-[#17384A] text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
