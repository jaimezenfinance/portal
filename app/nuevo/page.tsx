'use client'
import { useState, useCallback, useEffect } from 'react'
import Header from '@/components/Header'
import Stepper from '@/components/Stepper'
import FileUploadSlot from '@/components/FileUploadSlot'
import Mascot from '@/components/Mascot'
import { compressImageFile, compressFiles } from '@/lib/compressImage'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoTrabajador = 'espana' | 'gibraltar' | 'autonomo'

interface Titular {
  tipoTrabajador: TipoTrabajador
  nombre: string
  apellido1: string
  edad: string
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

interface TitularDocs {
  dni: File[]
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

interface AllDocs {
  t1: TitularDocs
  t2: TitularDocs
}

const emptyTitular = (): Titular => ({
  tipoTrabajador: 'espana',
  nombre: '', apellido1: '', edad: '', dni: '', telefono: '', email: '',
})

const emptyTitularDocs = (): TitularDocs => ({
  dni: [], nominas: [], renta: [],
  vidaLaboral: [], vidaLaboralGib: [], p7: [],
  recibosAutonomo: [], recibosSS: [], mod131: [], mod303: [], mod390: [],
  contrato: [], bancarios: [], notaSimple: [], arras: [],
  extra1: [], extra2: [], extra3: [],
})

const emptyAllDocs = (): AllDocs => ({ t1: emptyTitularDocs(), t2: emptyTitularDocs() })

// ─── Quotes for processing screen ────────────────────────────────────────────

const QUOTES = [
  // Profesional
  'Tu documentación está en las mejores manos.',
  'Gestionamos cada detalle para que tú no tengas que hacerlo.',
  'Trabajamos para que tu hipoteca sea una realidad.',
  // Cercano
  'Casi listo, te lo prometemos 🙌',
  'Unos segundos más y ya está todo organizado.',
  'Estamos en ello, no tardamos nada.',
  // Motivacional
  'El primer paso hacia tu nuevo hogar.',
  'Cada documento nos acerca más a tu sueño.',
  'Tu casa te está esperando.',
]

// ─── Upload helpers (module level — can call fetch + compress) ────────────────

async function uploadReturningSlot(
  folderId: string,
  clientName: string,
  fields: Record<string, File[]>,
): Promise<void> {
  const fd = new FormData()
  fd.append('mode', 'returning')
  fd.append('folderId', folderId)
  fd.append('clientName', clientName)
  for (const [name, files] of Object.entries(fields)) {
    for (const f of files) fd.append(name, f)
  }
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    if (res.status === 413) throw new Error(
      'Un archivo es demasiado grande para subir solo. Comprime el PDF e inténtalo de nuevo.',
    )
    const text = await res.text()
    let msg = 'Error al subir documento'
    try { msg = JSON.parse(text).error || msg } catch {}
    throw new Error(msg)
  }
}

async function uploadTitularSlots(folderId: string, titular: Titular, d: TitularDocs) {
  const clientName = `${titular.nombre} ${titular.apellido1}`
  const c = compressImageFile
  const cs = compressFiles

  // DNI — front + back in a single call (API combines them)
  if (d.dni[0]) {
    const fields: Record<string, File[]> = { dniFront: [await c(d.dni[0])] }
    if (d.dni[1]) fields.dniBack = [await c(d.dni[1])]
    await uploadReturningSlot(folderId, clientName, fields)
  }

  // Single-file slots
  const singleSlots: [string, File[]][] = [
    ['renta',          d.renta],
    ['vidaLaboral',    d.vidaLaboral],
    ['vidaLaboralGib', d.vidaLaboralGib],
    ['contrato',       d.contrato],
    ['notaSimple',     d.notaSimple],
    ['arras',          d.arras],
    ['p7',             d.p7],
    ['mod390',         d.mod390],
    ['extra1',         d.extra1],
    ['extra2',         d.extra2],
    ['extra3',         d.extra3],
  ]
  for (const [field, files] of singleSlots) {
    if (files.length === 0) continue
    await uploadReturningSlot(folderId, clientName, { [field]: [await c(files[0])] })
  }

  // Multi-file slots
  const multiSlots: [string, File[]][] = [
    ['nominas',         d.nominas],
    ['bancarios',       d.bancarios],
    ['recibosAutonomo', d.recibosAutonomo],
    ['recibosSS',       d.recibosSS],
    ['mod131',          d.mod131],
    ['mod303',          d.mod303],
  ]
  for (const [field, files] of multiSlots) {
    if (files.length === 0) continue
    await uploadReturningSlot(folderId, clientName, { [field]: await cs(files) })
  }
}

// ─── ProcessingScreen component (module level — has its own quote state) ──────

function ProcessingScreen({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
        setFadeIn(true)
      }, 350)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <Mascot size={160} animate={true} />
        <h2 className="text-xl font-semibold text-[#0f3693] mt-6 mb-2">
          Procesando tu solicitud...
        </h2>
        <p
          className="text-gray-500 text-sm italic mt-1 min-h-[1.5rem] transition-opacity duration-300"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          {QUOTES[quoteIdx]}
        </p>
        <div className="flex justify-center gap-2 mt-5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-[#ffbeb8] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm max-w-sm whitespace-pre-line">
            {error}
            <button onClick={onRetry} className="block mt-2 text-[#0f3693] underline mx-auto">
              Volver e intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TitularForm (module level — prevents remount on re-render) ──────────────

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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Tipo de trabajador <span className="text-red-500">*</span>
          </label>
          <select
            value={data.tipoTrabajador}
            onChange={e => onChange(index, 'tipoTrabajador', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] bg-white"
          >
            <option value="espana">Trabajador España</option>
            <option value="gibraltar">Trabajador Gibraltar</option>
            <option value="autonomo">Autónom@</option>
          </select>
        </div>

        {(['nombre', 'apellido1'] as const).map(field => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
              {field === 'apellido1' ? 'Primer apellido' : 'Nombre'}{' '}
              <span className="text-red-500">*</span>
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
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Edad <span className="text-red-500">*</span>
          </label>
          <input
            type="number" min="18" max="99"
            value={data.edad}
            onChange={e => onChange(index, 'edad', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] placeholder:text-gray-300"
            placeholder="Ej: 35"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            DNI/NIE <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.dni}
            onChange={e => onChange(index, 'dni', e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] uppercase placeholder:text-gray-300"
            placeholder="12345678A"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Teléfono <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={data.telefono}
            onChange={e => onChange(index, 'telefono', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] placeholder:text-gray-300"
            placeholder="600 000 000"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
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

// ─── TitularDocSection (module level) ────────────────────────────────────────

const WORKER_LABEL: Record<TipoTrabajador, string> = {
  espana: 'Trabajador España',
  gibraltar: 'Trabajador Gibraltar',
  autonomo: 'Autónom@',
}

interface TitularDocSectionProps {
  titularKey: 't1' | 't2'
  titular: Titular
  docs: TitularDocs
  handleDocFiles: (titularKey: 't1' | 't2', field: keyof TitularDocs) => (files: File[]) => void
  isOpen: boolean
  onToggle: () => void
  collapsible: boolean
}

function TitularDocSection({
  titularKey, titular, docs, handleDocFiles,
  isOpen, onToggle, collapsible,
}: TitularDocSectionProps) {
  const { tipoTrabajador } = titular
  const fullName = [titular.nombre, titular.apellido1].filter(Boolean).join(' ') ||
    (titularKey === 't1' ? 'Titular 1' : 'Titular 2')

  const slot = (field: keyof TitularDocs, label: string, opts?: { multiple?: boolean; required?: boolean }) => (
    <FileUploadSlot
      key={`${titularKey}_${field}`}
      label={label}
      fieldName={`${titularKey}_${field}`}
      files={docs[field]}
      onFiles={handleDocFiles(titularKey, field)}
      multiple={opts?.multiple}
      required={opts?.required}
    />
  )

  const content = (
    <>
      {slot('dni', 'DNI/NIE (parte delantera y trasera)', { multiple: true, required: titularKey === 't1' })}
      {tipoTrabajador !== 'autonomo' && slot('nominas', 'Últimas 3 nóminas', { multiple: true })}
      {slot('renta', 'Declaración de la renta')}
      {tipoTrabajador === 'gibraltar' && slot('p7', 'P7')}
      {tipoTrabajador === 'autonomo' && (
        <>
          {slot('recibosAutonomo', '3 últimos recibos cuota autónomo', { multiple: true })}
          {slot('recibosSS', 'Recibos pago seg. social', { multiple: true })}
          {slot('mod131', 'Mod 131 IRPF trimestral', { multiple: true })}
          {slot('mod303', 'Modelo 303 IVA trimestral', { multiple: true })}
          {slot('mod390', 'Mod 390 IVA (si aplica)')}
        </>
      )}
      {slot('vidaLaboral', tipoTrabajador === 'gibraltar' ? 'Vida Laboral España' : 'Vida laboral')}
      {tipoTrabajador === 'gibraltar' && slot('vidaLaboralGib', 'Vida laboral Gibraltar')}
      {tipoTrabajador !== 'autonomo' && slot('contrato', 'Contrato de trabajo')}
      {slot('bancarios', '3 meses movimientos banco', { multiple: true })}
      {slot('notaSimple', 'Nota simple del inmueble')}
      {slot('arras', 'Contrato de arras')}
      {slot('extra1', 'Documento adicional 1')}
      {slot('extra2', 'Documento adicional 2')}
      {slot('extra3', 'Documento adicional 3')}
    </>
  )

  if (!collapsible) {
    return <div>{content}</div>
  }

  return (
    <div className="mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="w-7 h-7 rounded-full bg-[#0f3693] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {titularKey === 't1' ? '1' : '2'}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0f3693]">{fullName}</p>
            <p className="text-xs text-gray-400">
              {WORKER_LABEL[tipoTrabajador]} · Toca para subir documentación
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-100">
          {content}
        </div>
      )}
    </div>
  )
}

// ─── Page component ────────────────────────────────────────────────────────────

export default function NuevoPage() {
  const [step, setStep] = useState(1)
  const [compraConPareja, setCompraConPareja] = useState(false)
  const [titulares, setTitulares] = useState<Titular[]>([emptyTitular()])
  const [inmueble, setInmueble] = useState<Inmueble>({
    tipoVia: 'C/', calle: '', area: '', precioCompra: '', entradaArras: '',
  })
  const [docs, setDocs] = useState<AllDocs>(emptyAllDocs())
  const [openSections, setOpenSections] = useState({ t1: true, t2: false })
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
      setTitulares(prev => [prev[0], emptyTitular()])
    } else {
      setTitulares(prev => [prev[0]])
    }
  }

  // ── Inmueble handlers ──────────────────────────────────────────────────────
  const handleInmuebleChange = (field: keyof Inmueble, value: string) => {
    setInmueble(prev => ({ ...prev, [field]: value }))
  }

  // ── Docs handlers ──────────────────────────────────────────────────────────
  const handleDocFiles = useCallback(
    (tKey: 't1' | 't2', field: keyof TitularDocs) =>
      (files: File[]) =>
        setDocs(prev => ({ ...prev, [tKey]: { ...prev[tKey], [field]: files } })),
    [],
  )

  // ── Section toggle handlers (stable) ──────────────────────────────────────
  const toggleT1 = useCallback(() => setOpenSections(prev => ({ ...prev, t1: !prev.t1 })), [])
  const toggleT2 = useCallback(() => setOpenSections(prev => ({ ...prev, t2: !prev.t2 })), [])

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    for (const t of titulares) {
      if (!t.nombre || !t.apellido1 || !t.edad || !t.dni || !t.telefono || !t.email) {
        return 'Por favor, completa todos los campos de los titulares.'
      }
    }
    return null
  }

  const validateStep2 = () => {
    if (!inmueble.precioCompra || !inmueble.calle || !inmueble.area)
      return 'Por favor, completa todos los campos del inmueble.'
    return null
  }

  const validateStep3 = () => {
    if (docs.t1.dni.length === 0) return 'El DNI/NIE del Titular 1 es obligatorio.'
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

    // Report ALL oversized PDFs before uploading anything
    const MAX_PDF_MB = 4
    const labeledFiles = [
      ...Object.values(docs.t1).flat().map(f => ({ file: f, titular: titulares[0].nombre || 'Titular 1' })),
      ...Object.values(docs.t2).flat().map(f => ({ file: f, titular: titulares[1]?.nombre || 'Titular 2' })),
    ]
    const tooBig = labeledFiles.filter(
      ({ file: f }) => f.type === 'application/pdf' && f.size > MAX_PDF_MB * 1024 * 1024,
    )
    if (tooBig.length > 0) {
      const lines = tooBig.map(
        ({ file: f, titular }) => `• ${titular}: "${f.name}" (${(f.size / 1024 / 1024).toFixed(1)} MB)`,
      )
      setError(
        `Los siguientes PDFs superan el límite de ${MAX_PDF_MB} MB. Comprime o reduce su tamaño antes de subir:\n\n${lines.join('\n')}`,
      )
      return
    }

    setError(null)
    setStep(4)

    try {
      // ── Paso 1: crear carpeta + entrada Notion (sin archivos) ──────────────
      const metaFd = new FormData()
      metaFd.append('mode', 'createOnly')
      metaFd.append('titulares', JSON.stringify(titulares))
      metaFd.append('inmueble', JSON.stringify(inmueble))

      const metaRes = await fetch('/api/upload', { method: 'POST', body: metaFd })
      if (!metaRes.ok) {
        const text = await metaRes.text()
        let msg = 'Error al crear el expediente'
        try { msg = JSON.parse(text).error || msg } catch {}
        throw new Error(msg)
      }
      const { folderId } = await metaRes.json()

      // ── Paso 2: subir docs slot por slot, un slot = una llamada ───────────
      await uploadTitularSlots(folderId, titulares[0], docs.t1)
      if (titulares.length > 1) await uploadTitularSlots(folderId, titulares[1], docs.t2)

      const dni = titulares[0].dni
      localStorage.setItem('zen_client', JSON.stringify({
        dni,
        folderId,
        name: `${titulares[0].nombre} ${titulares[0].apellido1}`,
      }))
      setClienteDni(dni)
      setTimeout(() => setStep(5), 800)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Processing screen ──────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <ProcessingScreen
        error={error}
        onRetry={() => { setError(null); setStep(3) }}
      />
    )
  }

  // ── Done screen ────────────────────────────────────────────────────────────
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

  // ── Steps 1–3 ─────────────────────────────────────────────────────────────
  const twoTitulares = titulares.length > 1

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 pb-24">
        <Stepper current={step} />

        {/* ── Step 1: Titulares ── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-[#0f3693] mb-2">Titulares</h2>
            <p className="text-gray-500 text-sm mb-4">¿Cómo compras la vivienda?</p>

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => handleTogglePareja(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all
                  ${!compraConPareja ? 'bg-[#0f3693] text-white border-[#0f3693]' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Compro sol@
              </button>
              <button
                type="button"
                onClick={() => handleTogglePareja(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all
                  ${compraConPareja ? 'bg-[#0f3693] text-white border-[#0f3693]' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Compro con pareja
              </button>
            </div>

            {titulares.map((t, i) => (
              <TitularForm key={i} index={i} data={t} onChange={handleTitularChange} />
            ))}
          </div>
        )}

        {/* ── Step 2: Inmueble ── */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-[#0f3693] mb-2">Inmueble</h2>
            <p className="text-gray-500 text-sm mb-4">Datos de la propiedad a financiar</p>

            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Precio de compra (€) <span className="text-red-500">*</span>
                </label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Dirección <span className="text-red-500">*</span>
              </label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Área <span className="text-red-500">*</span>
              </label>
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

        {/* ── Step 3: Documentos ── */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-[#0f3693] mb-2">Documentos</h2>
            <p className="text-gray-500 text-sm mb-4">
              Sube aquí tu documentación personal y la del inmueble.
              Si no tienes todo ahora, podrás añadir más documentos más adelante desde{' '}
              <span className="font-medium text-[#0f3693]">Ya tengo expediente</span>.
            </p>

            {twoTitulares ? (
              <>
                <TitularDocSection
                  titularKey="t1"
                  titular={titulares[0]}
                  docs={docs.t1}
                  handleDocFiles={handleDocFiles}
                  isOpen={openSections.t1}
                  onToggle={toggleT1}
                  collapsible={true}
                />
                <TitularDocSection
                  titularKey="t2"
                  titular={titulares[1]}
                  docs={docs.t2}
                  handleDocFiles={handleDocFiles}
                  isOpen={openSections.t2}
                  onToggle={toggleT2}
                  collapsible={true}
                />
              </>
            ) : (
              <TitularDocSection
                titularKey="t1"
                titular={titulares[0]}
                docs={docs.t1}
                handleDocFiles={handleDocFiles}
                isOpen={true}
                onToggle={() => {}}
                collapsible={false}
              />
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm whitespace-pre-line">
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
