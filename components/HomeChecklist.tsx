'use client'
import { useState } from 'react'

const TIPOS = [
  {
    id: 'espana',
    emoji: '🇪🇸',
    label: 'Trabajador España',
    docs: ['DNI/NIE', 'Últimas 3 nóminas', 'Declaración de la renta', 'Vida laboral', 'Contrato de trabajo', 'Nota simple / Contrato de arras'],
  },
  {
    id: 'gibraltar',
    emoji: '🇬🇮',
    label: 'Trabajador Gibraltar',
    docs: ['DNI/NIE', 'Últimas 3 nóminas', 'Declaración de la renta', 'P7', 'Vida laboral España', 'Vida laboral Gibraltar', 'Contrato de trabajo', 'Nota simple / Contrato de arras'],
  },
  {
    id: 'autonomo',
    emoji: '💼',
    label: 'Autónom@',
    docs: ['DNI/NIE', 'Declaración de la renta', '3 recibos cuota autónomo', 'Recibos pago seg. social', 'Mod 131 / 303 / 390', 'Vida laboral', 'Nota simple / Contrato de arras'],
  },
]

export default function HomeChecklist() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="bg-gray-100 rounded-t-3xl -mx-4 px-4 pt-1">
      <div className="pt-4 pb-3 px-1 border-b border-gray-200">
        <h3 className="font-bold text-[#0f3693] text-base">¿Qué documentos necesitas?</h3>
        <p className="text-xs text-gray-400 mt-0.5">Solo el DNI es obligatorio para empezar.</p>
      </div>
      <div className="py-4 space-y-2 pb-6 px-0">
        {TIPOS.map(tipo => (
          <div key={tipo.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === tipo.id ? null : tipo.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span>{tipo.emoji}</span>
                <span className="font-semibold text-[#0f3693] text-sm">{tipo.label}</span>
              </div>
              <span className="text-gray-400 text-xs">{open === tipo.id ? '▲' : '▼'}</span>
            </button>
            {open === tipo.id && (
              <div className="border-t border-gray-100 px-4 py-3">
                <ul className="space-y-2 text-sm">
                  {tipo.docs.map(doc => (
                    <li key={doc} className="flex items-center gap-2 text-gray-500">
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-[9px] flex items-center justify-center shrink-0">○</span>
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 text-center leading-relaxed pb-6">
        Si no tienes todo ahora, podrás añadirlo más adelante desde{' '}
        <strong className="text-[#0f3693]">Ya tengo expediente</strong>.<br />
        Solo el DNI es obligatorio para crear tu expediente hoy.
      </p>
    </div>
  )
}
