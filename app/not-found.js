import Link from 'next/link'

export const metadata = {
  title: '404 · AgendaFlow Beauty',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-5">
        <p className="text-[#C8A96E] text-[10px] tracking-[0.3em] uppercase">Error 404</p>
        <h1 className="text-[#F0EBE3] text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
          Página no encontrada
        </h1>
        <p className="text-[#555] text-sm">La página que buscas no existe o fue movida.</p>
        <Link
          href="/"
          className="inline-block bg-[#C8A96E] hover:bg-[#D4B87A] text-[#080808] text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
