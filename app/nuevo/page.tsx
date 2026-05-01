'use client'
import { useState, useCallback } from 'react'
import Header from '@/components/Header'
import Stepper from '@/components/Stepper'
import FileUploadSlot from '@/components/FileUploadSlot'
import Mascot from '@/components/Mascot'
import { compressImageFile, compressFiles } from '@/lib/compressImage'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoTrabajador = 'espana' | 'gibraltar' | 'autonomo'

interface Titular {
  nombre: string
  apellido1: string
  dni: string
  telefono: string
  email: string
}

interface Inmueble {
  tipoVia: string
  calle: string
  area: string
  precioCompra: string
  entradaArras: string
}

interface Docs {
  dniFront: File[]
  dniBack: File[]
  nominas: File[]
  renta: File[]
  vidaLaboral: File[]
  vidaLaboralGib: File[]
  p7: File[]
  recibosAutonomo: File[]
  recibosSS: File[]
  mod131: File[]
  mod303: File[]
  mod390: File[]
  contrato: File[]
  bancarios: File[]
  notaSimple: File[]
  arras: File[]
  extra1: File[]
  extra2: File[]
  extra3: File[]
}

const emptyTitular = (): Titular => ({
  nombre: '', apellido1: '', dni: '', telefono: '', email: ''
})

const emptyDocs = (): Docs => ({
  dniFront: [], dniBack: [], nominas: [], renta: [],
  vidaLaboral: [], vidaLaboralGib: [], p7: [],
  recibosAutonomo: [], recibosSS: [], mod131: [], mod303: [], mod390: [],
  contrato: [], bancarios: [], notaSimple: [], arras: [],
  extra1: [], extra2: [], extra3: [],
})

// ─── Sub-components (defined at module level to avoid re-mount on re-render) ─

interface TitularFormProps {
  index: number
  data: Titular
  onChange: (index: number, field: keyof Titular, value: string) => void
}

function TitularForm({ index, data, onChange }: TitularFormProps) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
      <h3 className="font-semibold text-[#0f3693] mb-3 text-sm uppercase tracking-wide">
        {index === 0 ? 'Titular 1' : 'Titular 2'}
      </h3>
      <div className="space-y-3">
        {(['nombre', 'apellido1'] as const).map(field => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
              {field === 'apellido1' ? 'Primer apellido' : 'Nombre'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data[field]}
              onChange={e => onChange(index, field, e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] focus:border-transparent placeholder:text-gray-300"
              placeholder={field === 'apellido1' ? 'Primer apellido' : 'Nombre'}
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">DNI/NIE <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={data.dni}
            onChange={e => onChange(index, 'dni', e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] uppercase placeholder:text-gray-300"
            placeholder="12345678A"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono <span className="text-red-500">*</span></label>
          <input
            type="tel"
            value={data.telefono}
            onChange={e => onChange(index, 'telefono', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] placeholder:text-gray-300"
            placeholder="600 000 000"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={data.email}
            onChange={e => onChange(index, 'email', e.target.value.toLowerCase())}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] placeholder:text-gray-300"
            placeholder="correo@ejemplo.com"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Page component ────────────────────────────────────────────────────────────

export default function NuevoPage() {
  const [step, setStep] = useState(1)
  const [compraConPareja, setCompraConPareja] = useState(false)
  const [tipoTrabajador, setTipoTrabajador] = useState<TipoTrabajador>('espana')
  const [titulares, setTitulares] = useState<Titular[]>([emptyTitular()])
  const [inmueble, setInmueble] = useState<Inmueble>({ tipoVia: 'C/', calle: '', area: '', precioCompra: '', entradaArras: '' })
  const [docs, setDocs] = useState<Docs>(emptyDocs())
  const [error, setError] = useState<string | null>(null)
  const [clienteDni, setClienteDni] = useState('')

  // ── Titular handlers ───────────────────────────────────────────────────────
  const handleTitularChange = useCallback((index: number, field: keyof Titular, value: string) => {
    setTitulares(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const handleTogglePareja = (conPareja: boolean) => {
    setCompraConPareja(conPareja)
    if (conPareja) {
      setTitulares([titulares[0], emptyTitular()])
    } else {
      setTitulares([titulares[0]])
    }
  }

  // ── Inmueble handlers ──────────────────────────────────────────────────────
  const handleInmuebleChange = (field: keyof Inmueble, value: string) => {
    setInmueble(prev => ({ ...prev, [field]: value }))
  }

  // ── Docs handlers (stable refs — one per slot, never recreated) ──────────
  const handleDocFiles = useCallback((field: keyof Docs) => {
    return (files: File[]) => setDocs(prev => ({ ...prev, [field]: files }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // deps intentionally empty — setter is stable

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    for (const t of titulares) {
      if (!t.nombre || !t.apellido1 || !t.dni || !t.telefono || !t.email) {
        return 'Por favor, completa todos los campos de los titulares.'
      }
    }
    return null
  }

  const validateStep2 = () => {
    if (!inmueble.precioCompra || !inmueble.calle || !inmueble.area) return 'Por favor, completa todos los campos del inmueble.'
    return null
  }

  const validateStep3 = () => {
    if (docs.dniFront.length === 0) return 'El DNI/NIE (parte delantera) es obligatorio.'
    return null
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 1) {
      const err = validateStep1()
      if (err) { setError(err); return }
    }
    if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
    }
    setError(null)
    setStep(s => s + 1)
  }

  const goBack = () => {
    setError(null)
    setStep(s => s - 1)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateStep3()
    if (err) { setError(err); return }
    setError(null)
    setStep(4) // Processing screen

    try {
      const formData = new FormData()
      formData.append('titulares', JSON.stringify(titulares))
      formData.append('inmueble', JSON.stringify(inmueble))
      formData.append('tipoTrabajador', tipoTrabajador)

      // Compress images before appending
      const c = compressImageFile
      const cs = compressFiles
      if (docs.dniFront[0]) formData.append('dniFront', await c(docs.dniFront[0]))
      if (docs.dniBack[0]) formData.append('dniBack', await c(docs.dniBack[0]))
      for (const f of await cs(docs.nominas)) formData.append('nominas', f)
      if (docs.renta[0]) formData.append('renta', await c(docs.renta[0]))
      if (docs.vidaLaboral[0]) formData.append('vidaLaboral', await c(docs.vidaLaboral[0]))
      if (docs.contrato[0]) formData.append('contrato', await c(docs.contrato[0]))
      if (docs.notaSimple[0]) formData.append('notaSimple', await c(docs.notaSimple[0]))
      if (docs.arras[0]) formData.append('arras', await c(docs.arras[0]))
      for (const f of await cs(docs.bancarios)) formData.append('bancarios', f)
      if (docs.p7[0]) formData.append('p7', await c(docs.p7[0]))
      if (docs.vidaLaboralGib[0]) formData.append('vidaLaboralGib', await c(docs.vidaLaboralGib[0]))
      for (const f of await cs(docs.recibosAutonomo)) formData.append('recibosAutonomo', f)
      for (const f of await cs(docs.recibosSS)) formData.append('recibosSS', f)
      for (const f of await cs(docs.mod131)) formData.append('mod131', f)
      for (const f of await cs(docs.mod303)) formData.append('mod303', f)
      if (docs.mod390[0]) formData.append('mod390', await c(docs.mod390[0]))
      if (docs.extra1[0]) formData.append('extra1', await c(docs.extra1[0]))
      if (docs.extra2[0]) formData.append('extra2', await c(docs.extra2[0]))
      if (docs.extra3[0]) formData.append('extra3', await c(docs.extra3[0]))

      const res = await fetch('/api/upload', { method: 'POST', body: formData })

      if (!res.ok) {
        if (res.status === 413) throw new Error('Los archivos son demasiado grandes. Intenta subir documentos más pequeños.')
        const text = await res.text()
        let msg = 'Error al procesar la solicitud'
        try { msg = JSON.parse(text).error || msg } catch {}
        throw new Error(msg)
      }

      const result = await res.json()

      // Save to localStorage
      const dni = titulares[0].dni
      localStorage.setItem('zen_client', JSON.stringify({ dni, folderId: result.folderId, name: `${titulares[0].nombre} ${titulares[0].apellido1}` }))
      setClienteDni(dni)

      setTimeout(() => setStep(5), 1000)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Render steps ───────────────────────────────────────────────────────────

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
          <Mascot size={160} animate={true} />
          <h2 className="text-xl font-semibold text-[#0f3693] mt-6 mb-2">Procesando tu solicitud...</h2>
          <p className="text-gray-400 text-sm">Estamos organizando tus documentos. Un momento.</p>
          <div className="flex justify-center gap-2 mt-5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2.5 h-2.5 bg-[#ffbeb8] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm max-w-sm">
              {error}
              <button onClick={() => setStep(3)} className="block mt-2 text-[#0f3693] underline mx-auto">
                Volver e intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 5) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 text-center">
          <Mascot size={200} animate={false} />
          <h2 className="text-2xl font-bold text-[#0f3693] mt-4 mb-4">¡Documentación enviada!</h2>
          <div className="text-gray-600 leading-relaxed mb-6 space-y-1 px-4">
            <p>Muchas gracias por enviarnos tu documentación.</p>
            <p>Tu asesor se pondrá en contacto contigo en breve.</p>
          </div>
          <div className="bg-blue-50 border border-[#0f3693]/20 rounded-2xl p-4 mb-8">
            <p className="text-xs text-gray-500 mb-1">Número de referencia</p>
            <p className="text-lg font-bold text-[#0f3693]">{clienteDni}</p>
          </div>
          <a href="/" className="inline-block bg-[#0f3693] text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-800 transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 pb-24">
        <Stepper current={step} />

        {/* Step 1: Titulares */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-[#0f3693] mb-2">Titulares</h2>
            <p className="text-gray-500 text-sm mb-4">¿Cómo compras la vivienda?</p>

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => handleTogglePareja(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${!compraConPareja ? 'bg-[#0f3693] text-white border-[#0f3693]' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Compro sol@
              </button>
              <button
                type="button"
                onClick={() => handleTogglePareja(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${compraConPareja ? 'bg-[#0f3693] text-white border-[#0f3693]' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Compro con pareja
              </button>
            </div>

            {/* Worker type */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">Tipo de trabajador <span className="text-red-500">*</span></label>
              <select
                value={tipoTrabajador}
                onChange={e => setTipoTrabajador(e.target.value as TipoTrabajador)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] bg-white"
              >
                <option value="espana">Trabajador España</option>
                <option value="gibraltar">Trabajador Gibraltar</option>
                <option value="autonomo">Autónom@</option>
              </select>
            </div>

            {titulares.map((t, i) => (
              <TitularForm key={i} index={i} data={t} onChange={handleTitularChange} />
            ))}
          </div>
        )}

        {/* Step 2: Inmueble */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-[#0f3693] mb-2">Inmueble</h2>
            <p className="text-gray-500 text-sm mb-4">Datos de la propiedad a financiar</p>

            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Precio de compra (€) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={inmueble.precioCompra}
                  onChange={e => handleInmuebleChange('precioCompra', e.target.value)}
                  placeholder="150000"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] placeholder:text-gray-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Entrada / Arras (€)</label>
                <input
                  type="number"
                  value={inmueble.entradaArras}
                  onChange={e => handleInmuebleChange('entradaArras', e.target.value)}
                  placeholder="10000"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select
                  value={inmueble.tipoVia}
                  onChange={e => handleInmuebleChange('tipoVia', e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] w-28 bg-white"
                >
                  <option>C/</option>
                  <option>URB/</option>
                  <option>AVD/</option>
                </select>
                <input
                  type="text"
                  value={inmueble.calle}
                  onChange={e => handleInmuebleChange('calle', e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
                  placeholder="Nombre de la calle"
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Área <span className="text-red-500">*</span></label>
              <select
                value={inmueble.area}
                onChange={e => handleInmuebleChange('area', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] bg-white"
              >
                <option value="">Selecciona un área</option>
                <option>Algeciras</option>
                <option>Castellar</option>
                <option>La Línea</option>
                <option>Los Barrios</option>
                <option>San Roque</option>
                <option>Otro</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Documentos */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-[#0f3693] mb-1">Documentos</h2>
            <div className="bg-[#0f3693]/10 rounded-xl px-3 py-2 mb-3 text-xs font-medium text-[#0f3693]">
              {tipoTrabajador === 'espana' && '📋 Documentos para trabajadores en España'}
              {tipoTrabajador === 'gibraltar' && '📋 Documentos para trabajadores en Gibraltar'}
              {tipoTrabajador === 'autonomo' && '📋 Documentos para autónomos'}
            </div>
            <p className="text-gray-500 text-xs mb-4">
              Sube los documentos requeridos. Si no los tienes todos ahora, podrás volver a esta página para subirlos más tarde.
            </p>

            {/* Always shown */}
            <FileUploadSlot label="DNI/NIE (parte delantera)" fieldName="dniFront" required files={docs.dniFront} onFiles={handleDocFiles('dniFront')} />
            <FileUploadSlot label="DNI/NIE (parte trasera)" fieldName="dniBack" files={docs.dniBack} onFiles={handleDocFiles('dniBack')} />
            <FileUploadSlot label="Últimas 3 nóminas" fieldName="nominas" multiple files={docs.nominas} onFiles={handleDocFiles('nominas')} />
            <FileUploadSlot label="Declaración de la renta" fieldName="renta" files={docs.renta} onFiles={handleDocFiles('renta')} />

            {/* Gibraltar only: P7 after renta */}
            {tipoTrabajador === 'gibraltar' && (
              <FileUploadSlot label="P7" fieldName="p7" files={docs.p7} onFiles={handleDocFiles('p7')} />
            )}

            {/* Autónomo extras after renta */}
            {tipoTrabajador === 'autonomo' && (<>
              <FileUploadSlot label="3 últimos recibos cuota autónomo" fieldName="recibosAutonomo" multiple files={docs.recibosAutonomo} onFiles={handleDocFiles('recibosAutonomo')} />
              <FileUploadSlot label="Recibos pago seg. social" fieldName="recibosSS" multiple files={docs.recibosSS} onFiles={handleDocFiles('recibosSS')} />
              <FileUploadSlot label="Mod 131 IRPF trimestral" fieldName="mod131" multiple files={docs.mod131} onFiles={handleDocFiles('mod131')} />
              <FileUploadSlot label="Modelo 303 IVA trimestral" fieldName="mod303" multiple files={docs.mod303} onFiles={handleDocFiles('mod303')} />
              <FileUploadSlot label="Mod 390 IVA (si aplica)" fieldName="mod390" files={docs.mod390} onFiles={handleDocFiles('mod390')} />
            </>)}

            {/* Always shown after extras */}
            <FileUploadSlot label={tipoTrabajador === 'gibraltar' ? 'Vida Laboral España' : 'Vida laboral'} fieldName="vidaLaboral" files={docs.vidaLaboral} onFiles={handleDocFiles('vidaLaboral')} />

            {/* Gibraltar only: Vida Laboral Gibraltar after vida laboral */}
            {tipoTrabajador === 'gibraltar' && (
              <FileUploadSlot label="Vida laboral Gibraltar" fieldName="vidaLaboralGib" files={docs.vidaLaboralGib} onFiles={handleDocFiles('vidaLaboralGib')} />
            )}

            <FileUploadSlot label="Contrato de trabajo" fieldName="contrato" files={docs.contrato} onFiles={handleDocFiles('contrato')} />
            <FileUploadSlot label="3 meses movimientos banco" fieldName="bancarios" multiple files={docs.bancarios} onFiles={handleDocFiles('bancarios')} />
            <FileUploadSlot label="Nota simple del inmueble" fieldName="notaSimple" files={docs.notaSimple} onFiles={handleDocFiles('notaSimple')} />
            <FileUploadSlot label="Contrato de arras" fieldName="arras" files={docs.arras} onFiles={handleDocFiles('arras')} />
            <FileUploadSlot label="Documento adicional 1" fieldName="extra1" files={docs.extra1} onFiles={handleDocFiles('extra1')} />
            <FileUploadSlot label="Documento adicional 2" fieldName="extra2" files={docs.extra2} onFiles={handleDocFiles('extra2')} />
            <FileUploadSlot label="Documento adicional 3" fieldName="extra3" files={docs.extra3} onFiles={handleDocFiles('extra3')} />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 safe-area-pb">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={goBack}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Atrás
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={goNext}
              className="flex-1 py-3 rounded-xl bg-[#0f3693] text-white font-medium hover:bg-blue-800 transition-colors"
            >
              Continuar →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-[#0f3693] text-white font-medium hover:bg-blue-800 transition-colors"
            >
              Enviar documentación ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
