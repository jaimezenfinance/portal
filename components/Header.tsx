'use client'

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-[#0a2a6e] to-[#1a4a9e] text-white px-5 py-3 flex items-center shadow-lg">
      <div className="w-11 h-11 rounded-full overflow-hidden bg-[#ffbeb8] flex-shrink-0 border-2 border-white/20">
        <img src="/logo.png" alt="Zen Finance" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
      </div>
      <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white text-center flex-1 mx-4">Portal de Documentación</h1>
      <div className="w-11 flex-shrink-0" />
    </header>
  )
}
