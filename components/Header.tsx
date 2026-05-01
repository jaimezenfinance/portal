'use client'
import { useEffect, useState } from 'react'

export default function Header() {
  const [fecha, setFecha] = useState('')
  useEffect(() => {
    setFecha(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])
  return (
    <header className="bg-gradient-to-r from-[#0a2a6e] to-[#1a4a9e] text-white px-5 py-3 flex items-center justify-between shadow-lg">
      <div className="w-11 h-11 rounded-full overflow-hidden bg-[#ffbeb8] flex-shrink-0 border-2 border-white/20">
        <img src="/logo.png" alt="Zen Finance" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
      </div>
      <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white text-center flex-1 mx-4">Portal de Documentación</h1>
      <span className="text-sm text-white font-semibold whitespace-nowrap">{fecha}</span>
    </header>
  )
}
