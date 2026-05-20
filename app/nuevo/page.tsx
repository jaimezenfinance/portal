'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import Stepper from '@/components/Stepper'
import FileUploadSlot from '@/components/FileUploadSlot'
import Mascot from '@/components/Mascot'
import { compressImageFile, compressFiles } from '@/lib/compressImage'

// ─── Types ───────────────────────────────────────────────────────────────────

type TipoTrabajador = '' | 'espana' | 'gibraltar' | 'autonomo'

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

interface ExtraLabels {
  extra1: string
  extra2: string
  extra3: string
}

const emptyExtraLabels = (): ExtraLabels => ({ extra1: '', extra2: '', extra3: '' })

const emptyTitular = (): Titular => ({
  tipoTrabajador: '',
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
  labels?: Record<string, string>,
): Promise<void> {
  const fd = new FormData()
  fd.append('mode', 'returning')
  fd.append('folderId', folderId)
  fd.append('clientName', clientName)
  for (const [name, files] of Object.entries(fields)) {
    for (const f of files) fd.append(name, f)
  }
  if (labels) {
    for (const [name, val] of Object.entries(labels)) {
      if (val) fd.append(name, val)
    }
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

async function uploadTitularSlots(folderId: string, titular: Titular, d: TitularDocs, extraLabels?: { extra1: string; extra2: string; extra3: string }) {
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
  ]
  for (const [field, files] of singleSlots) {
    if (files.length === 0) continue
    await uploadReturningSlot(folderId, clientName, { [field]: [await c(files[0])] })
  }

  // Extra slots (with optional custom label → filename prefix)
  for (const field of ['extra1', 'extra2', 'extra3'] as const) {
    if (d[field].length === 0) continue
    const label = extraLabels?.[field] || ''
    await uploadReturningSlot(folderId, clientName, { [field]: [await c(d[field][0])] }, label ? { [`${field}Label`]: label } : undefined)
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

// ─── WhatsApp buttons (module level) ─────────────────────────────────────────

function WaButtons() {
  return (
    <div className="flex flex-col gap-2 mt-3 w-full max-w-xs">
      <a
        href="https://wa.me/34624616947"
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-[#0f3693] text-[#ffbeb8] rounded-full px-4 py-2.5 text-sm font-medium"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        WhatsApp Alejandro
      </a>
      <a
        href="https://wa.me/34614454567"
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-[#0f3693] text-[#ffbeb8] rounded-full px-4 py-2.5 text-sm font-medium"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        WhatsApp Jaime
      </a>
    </div>
  )
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
      }, 400)
    }, 7000)
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

        <div className="mt-8 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 flex items-center gap-2.5 max-w-xs">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <p className="text-xs font-medium text-amber-800 text-left">
            No cierres esta página mientras se suben tus documentos
          </p>
        </div>

        {error && (
          <div className="mt-6 bg-amber-50 border border-amber-300 rounded-2xl p-4 max-w-sm text-left">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              {error === 'CREATE_ERROR'
                ? '⚠️ No hemos podido crear tu expediente'
                : '⚠️ No hemos podido enviar un documento'}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              {error === 'CREATE_ERROR'
                ? 'Ha ocurrido un problema técnico. Inténtalo de nuevo en unos minutos o contacta con tu asesor:'
                : 'Comprueba tu conexión e inténtalo de nuevo. Si el problema continúa, contacta con tu asesor:'}
            </p>
            <WaButtons />
            <button
              onClick={onRetry}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-[#0f3693] text-[#0f3693] text-sm font-medium"
            >
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
            className={`w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] bg-white ${data.tipoTrabajador === '' ? 'text-gray-400' : 'text-gray-700'}`}
          >
            <option value="" disabled>Selecciona tipo de trabajador</option>
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
  '': '',
  espana: 'Trabajador España',
  gibraltar: 'Trabajador Gibraltar',
  autonomo: 'Autónom@',
}

interface TitularDocSectionProps {
  titularKey: 't1' | 't2'
  titular: Titular
  docs: TitularDocs
  handleDocFiles: (titularKey: 't1' | 't2', field: keyof TitularDocs) => (files: File[]) => void
}

function TitularDocSection({
  titularKey, titular, docs, handleDocFiles,
}: TitularDocSectionProps) {
  const { tipoTrabajador } = titular
  const num = titularKey === 't1' ? '1' : '2'
  const fullName = [titular.nombre, titular.apellido1].filter(Boolean).join(' ') ||
    `Titular ${num}`

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

  return (
    <div className="mb-4 rounded-2xl border-2 border-[#0f3693]/20 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#0f3693]/[0.06] px-4 py-3 border-b border-[#0f3693]/10">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#0f3693] text-white text-xs flex items-center justify-center font-bold shrink-0">{num}</span>
          <h3 className="font-semibold text-[#0f3693] text-base">Documentación de {fullName}</h3>
        </div>
        {tipoTrabajador && (
          <p className="text-xs text-gray-500 mt-1 ml-8">📋 {WORKER_LABEL[tipoTrabajador]}</p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
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

        {/* Documentos adicionales */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="font-semibold text-[#0f3693] text-xs uppercase tracking-wide mb-1">Documentos adicionales</h4>
          <p className="text-gray-500 text-xs mb-3 leading-relaxed">
            Sube cualquier otra documentación que nos pueda ayudar: certificados, recibos de préstamos, cartas de empleo, etc.
          </p>
          {(['extra1', 'extra2', 'extra3'] as const).map((field, i) => (
            <div key={field} className="mb-3">
              <FileUploadSlot
                label={`Documento adicional ${i + 1}`}
                fieldName={`${titularKey}_${field}`}
                files={docs[field]}
                onFiles={handleDocFiles(titularKey, field)}
              />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ─── InmuebleDocSection (module level) ───────────────────────────────────────

interface InmuebleDocs {
  notaSimple: File[]
  arras: File[]
}

interface InmuebleDocSectionProps {
  docs: InmuebleDocs
  onFiles: (field: keyof InmuebleDocs) => (files: File[]) => void
}

function InmuebleDocSection({ docs, onFiles }: InmuebleDocSectionProps) {
  return (
    <div className="mb-4 rounded-2xl border-2 border-[#0f3693]/20 bg-white shadow-sm overflow-hidden">
      <div className="bg-[#0f3693]/[0.06] px-4 py-3 border-b border-[#0f3693]/10">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#ffbeb8] text-[#0f3693] text-xs flex items-center justify-center font-bold shrink-0">🏠</span>
          <h3 className="font-semibold text-[#0f3693] text-sm">Datos de la Vivienda</h3>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <FileUploadSlot
          label="Nota simple del inmueble"
          fieldName="inmueble_notaSimple"
          files={docs.notaSimple}
          onFiles={onFiles('notaSimple')}
        />
        <FileUploadSlot
          label="Contrato de arras"
          fieldName="inmueble_arras"
          files={docs.arras}
          onFiles={onFiles('arras')}
        />
      </div>
    </div>
  )
}

// ─── Page component ────────────────────────────────────────────────────────────

export default function NuevoPage() {
  const [step, setStep] = useState(1)
  const [compraConPareja, setCompraConPareja] = useState<boolean | null>(null)
  const [titulares, setTitulares] = useState<Titular[]>([emptyTitular()])
  const [inmueble, setInmueble] = useState<Inmueble>({
    tipoVia: 'C/', calle: '', area: '', precioCompra: '', entradaArras: '',
  })
  const [docs, setDocs] = useState<AllDocs>(emptyAllDocs())
  const [extraLabels, setExtraLabels] = useState<{ t1: ExtraLabels; t2: ExtraLabels }>({ t1: emptyExtraLabels(), t2: emptyExtraLabels() })
  const [inmuebleDocs, setInmuebleDocs] = useState<InmuebleDocs>({ notaSimple: [], arras: [] })
  const [revealed, setRevealed] = useState({ t1: false, t2: false, inmueble: false })
  const [error, setError] = useState<string | null>(null)
  const [clienteDni, setClienteDni] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)

  // Scroll to error automatically when it appears on step 3
  useEffect(() => {
    if (error && step === 3) {
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    }
  }, [error, step])

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

  // ── Inmueble doc handler ───────────────────────────────────────────────────
  const handleInmuebleFiles = useCallback(
    (field: keyof InmuebleDocs) => (files: File[]) =>
      setInmuebleDocs(prev => ({ ...prev, [field]: files })),
    [],
  )

  // ── Extra label handler ────────────────────────────────────────────────────
  const handleExtraLabel = useCallback(
    (tKey: 't1' | 't2', field: keyof ExtraLabels, value: string) =>
      setExtraLabels(prev => ({ ...prev, [tKey]: { ...prev[tKey], [field]: value } })),
    [],
  )
  const handleExtraLabelT1 = useCallback((field: keyof ExtraLabels, value: string) => handleExtraLabel('t1', field, value), [handleExtraLabel])
  const handleExtraLabelT2 = useCallback((field: keyof ExtraLabels, value: string) => handleExtraLabel('t2', field, value), [handleExtraLabel])

  // ── Section reveal refs (for auto-scroll) ─────────────────────────────────
  const t1Ref = useRef<HTMLDivElement>(null)
  const t2Ref = useRef<HTMLDivElement>(null)
  const inmuebleRef = useRef<HTMLDivElement>(null)

  // ── Section toggle handlers (stable) ──────────────────────────────────────
  const revealT1 = useCallback(() => {
    setRevealed(r => ({ ...r, t1: true }))
    setTimeout(() => t1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [])
  const revealT2 = useCallback(() => {
    setRevealed(r => ({ ...r, t2: true }))
    setTimeout(() => t2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [])
  const revealInmueble = useCallback(() => {
    setRevealed(r => ({ ...r, inmueble: true }))
    setTimeout(() => inmuebleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [])

  const docNext = useCallback(() => {
    if (!revealed.t1) { revealT1() }
    else if (titulares.length > 1 && !revealed.t2) { revealT2() }
    else { revealInmueble() }
  }, [revealed, titulares.length, revealT1, revealT2, revealInmueble])

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (compraConPareja === null) return '¿Compras sol@ o con pareja?'
    for (const t of titulares) {
      if (!t.tipoTrabajador) return 'Selecciona el tipo de trabajador.'
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
    setStep(s => {
      if (s === 2) setRevealed({ t1: false, t2: false, inmueble: false })
      return s + 1
    })
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
    const MAX_PDF_MB = 4.3
    const labeledFiles = [
      ...Object.values(docs.t1).flat().map(f => ({ file: f, titular: titulares[0].nombre || 'Titular 1' })),
      ...Object.values(docs.t2).flat().map(f => ({ file: f, titular: titulares[1]?.nombre || 'Titular 2' })),
      ...Object.values(inmuebleDocs).flat().map(f => ({ file: f, titular: 'Inmueble' })),
    ]
    const tooBig = labeledFiles.filter(
      ({ file: f }) => f.type === 'application/pdf' && f.size > MAX_PDF_MB * 1024 * 1024,
    )
    if (tooBig.length > 0) {
      const lines = tooBig.map(
        ({ file: f, titular }) => `· ${titular}: "${f.name}" (${(f.size / 1024 / 1024).toFixed(1)} MB)`,
      )
      setError(`PDF_BIG:${lines.join('\n')}`)
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
        throw new Error('CREATE_ERROR')
      }
      const { folderId } = await metaRes.json()

      // ── Paso 2: subir docs slot por slot, un slot = una llamada ───────────
      await uploadTitularSlots(folderId, titulares[0], docs.t1, extraLabels.t1)
      if (titulares.length > 1) await uploadTitularSlots(folderId, titulares[1], docs.t2, extraLabels.t2)

      // Inmueble docs — always uploaded with T1's name
      const t1Name = `${titulares[0].nombre} ${titulares[0].apellido1}`
      const c = compressImageFile
      if (inmuebleDocs.notaSimple[0])
        await uploadReturningSlot(folderId, t1Name, { notaSimple: [await c(inmuebleDocs.notaSimple[0])] })
      if (inmuebleDocs.arras[0])
        await uploadReturningSlot(folderId, t1Name, { arras: [await c(inmuebleDocs.arras[0])] })

      const dni = titulares[0].dni
      localStorage.setItem('zen_client', JSON.stringify({
        dni,
        folderId,
        name: `${titulares[0].nombre} ${titulares[0].apellido1}`,
        t2Name: titulares.length > 1
          ? `${titulares[1].nombre} ${titulares[1].apellido1}`
          : undefined,
        t1Type: titulares[0].tipoTrabajador,
        t2Type: titulares.length > 1 ? titulares[1].tipoTrabajador : undefined,
      }))
      setClienteDni(dni)
      setTimeout(() => setStep(5), 800)
    } catch (e: any) {
      const msg = e.message || ''
      if (msg === 'CREATE_ERROR') {
        setError('CREATE_ERROR')
      } else {
        setError('UPLOAD_ERROR')
      }
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
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
          {/* Checkmark */}
          <div className="w-20 h-20 rounded-full bg-[#0f3693] flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffbeb8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[#0f3693] mb-2">¡Todo listo!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-7">
            Hemos recibido tu documentación.<br />Te contactaremos en breve.
          </p>

          {/* DNI */}
          <div className="bg-white border border-gray-200 rounded-2xl px-8 py-4 mb-7 shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tu número de referencia</p>
            <p className="text-2xl font-bold text-[#0f3693] tracking-wide">{clienteDni}</p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full max-w-xs mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 whitespace-nowrap">¿Quieres añadir más documentos?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
            Accede a <span className="font-semibold text-[#0f3693]">Ya tengo expediente</span> e introduce el DNI del Titular 1
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <a href="/" className="w-full py-3.5 rounded-2xl bg-[#0f3693] text-white font-semibold text-sm text-center">
              Volver al inicio
            </a>
            <a href="/expediente" className="w-full py-3.5 rounded-2xl border-2 border-[#0f3693] text-[#0f3693] font-semibold text-sm text-center">
              Añadir más documentos →
            </a>
          </div>
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
                  ${compraConPareja === false ? 'bg-[#0f3693] text-white border-[#0f3693]' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Compro sol@
              </button>
              <button
                type="button"
                onClick={() => handleTogglePareja(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all
                  ${compraConPareja === true ? 'bg-[#0f3693] text-white border-[#0f3693]' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Compro con pareja
              </button>
            </div>

            {compraConPareja !== null && titulares.map((t, i) => (
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

            {/* Intro card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
              <p className="text-gray-600 text-sm leading-relaxed">
                Sube aquí tu documentación personal y la del inmueble.
              </p>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                Si no tienes todo ahora, no te preocupes — podrás añadir más documentos en cualquier momento desde{' '}
                <span className="font-medium text-[#0f3693]">Ya tengo expediente</span>.
                Solo necesitas subir tu <strong className="text-gray-500">DNI</strong> para crear tu expediente hoy.
              </p>
            </div>

            {/* Titular 1 */}
            {revealed.t1 && (
              <div ref={t1Ref}>
                <TitularDocSection
                  titularKey="t1"
                  titular={titulares[0]}
                  docs={docs.t1}
                  handleDocFiles={handleDocFiles}
                />
              </div>
            )}

            {/* Titular 2 (solo si hay pareja y se ha revelado) */}
            {twoTitulares && revealed.t2 && (
              <div ref={t2Ref}>
                <TitularDocSection
                  titularKey="t2"
                  titular={titulares[1]}
                  docs={docs.t2}
                  handleDocFiles={handleDocFiles}
                />
              </div>
            )}

            {/* Inmueble */}
            {revealed.inmueble && (
              <div ref={inmuebleRef}>
                <InmuebleDocSection
                  docs={inmuebleDocs}
                  onFiles={handleInmuebleFiles}
                />
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && error.startsWith('PDF_BIG:') ? (
          <div ref={errorRef} className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-left">
            <p className="font-semibold text-red-700 mb-2">📄 Algunos archivos son demasiado grandes</p>
            <div className="text-red-600 mb-3 space-y-0.5">
              {error.replace('PDF_BIG:', '').split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="text-xs text-red-500">
              Comprime gratis en{' '}
              <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" rel="noopener noreferrer"
                className="underline font-medium">ilovepdf.com</a>
              {' '}y vuelve a intentarlo.
            </p>
          </div>
        ) : error ? (
          <div ref={errorRef} className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        ) : null}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 py-3 safe-area-pb">
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
          ) : revealed.inmueble ? (
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-[#0f3693] text-white font-medium hover:bg-blue-800 transition-colors"
            >
              Enviar documentación ✓
            </button>
          ) : (
            <button
              onClick={docNext}
              className="flex-1 py-3 rounded-xl bg-[#0f3693] text-white font-medium hover:bg-blue-800 transition-colors"
            >
              Continuar →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
