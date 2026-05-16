'use client'
import { useState, useCallback } from 'react'
import Header from '@/components/Header'
import FileUploadSlot from '@/components/FileUploadSlot'
import Mascot from '@/components/Mascot'
import { compressImageFile, compressFiles } from '@/lib/compressImage'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoTrabajador = 'espana' | 'gibraltar' | 'autonomo'

interface Docs {
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
  notaSimple: File[]
  arras: File[]
  bancarios: File[]
  extra1: File[]
  extra2: File[]
  extra3: File[]
}

const emptyDocs = (): Docs => ({
  dni: [], nominas: [], renta: [],
  vidaLaboral: [], vidaLaboralGib: [], p7: [],
  recibosAutonomo: [], recibosSS: [], mod131: [], mod303: [], mod390: [],
  contrato: [], notaSimple: [], arras: [], bancarios: [],
  extra1: [], extra2: [], extra3: [],
})

const DOC_PREFIXES: Record<keyof Docs, string> = {
  dni: 'DNI_', nominas: 'NOMINA_', renta: 'RENTA_',
  vidaLaboral: 'VIDALABORAL_', vidaLaboralGib: 'VIDALABORALGIB_', p7: 'P7_',
  recibosAutonomo: 'RECIBOSAUTONOMO_', recibosSS: 'RECIBOSSS_',
  mod131: 'MOD131_', mod303: 'MOD303_', mod390: 'MOD390_',
  contrato: 'CONTRATO_', notaSimple: 'NOTASIMPLE_',
  arras: 'ARRAS_', bancarios: 'BANCARIOS_',
  extra1: 'EXTRA1_', extra2: 'EXTRA2_', extra3: 'EXTRA3_',
}

function hasPrefix(files: string[], prefix: string) {
  return files.some(f => f.toUpperCase().startsWith(prefix))
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

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
    if (res.status === 413) throw new Error('Un archivo es demasiado grande. Comprime el PDF e inténtalo de nuevo.')
    const text = await res.text()
    let msg = 'Error al subir documento'
    try { msg = JSON.parse(text).error || msg } catch {}
    throw new Error(msg)
  }
}

async function uploadDocsSlotBySlot(folderId: string, clientName: string, d: Docs) {
  const c = compressImageFile
  const cs = compressFiles

  if (d.dni[0]) {
    const fields: Record<string, File[]> = { dniFront: [await c(d.dni[0])] }
    if (d.dni[1]) fields.dniBack = [await c(d.dni[1])]
    await uploadReturningSlot(folderId, clientName, fields)
  }

  const singleSlots: [string, File[]][] = [
    ['renta',          d.renta],
    ['vidaLaboral',    d.vidaLaboral],
    ['vidaLaboralGib', d.vidaLaboralGib],
    ['p7',             d.p7],
    ['mod390',         d.mod390],
    ['contrato',       d.contrato],
    ['notaSimple',     d.notaSimple],
    ['arras',          d.arras],
    ['extra1',         d.extra1],
    ['extra2',         d.extra2],
    ['extra3',         d.extra3],
  ]
  for (const [field, files] of singleSlots) {
    if (files.length === 0) continue
    await uploadReturningSlot(folderId, clientName, { [field]: [await c(files[0])] })
  }

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

// ─── DocSlots (module level) ──────────────────────────────────────────────────

interface DocSlotsProps {
  tKey: 't1' | 't2'
  docs: Docs
  onFiles: (tKey: 't1' | 't2', field: keyof Docs) => (files: File[]) => void
  existingFiles: string[]
  tipoTrabajador: TipoTrabajador
  isOpen: boolean
  onToggle: () => void
  collapsible: boolean
  label: string
}

function DocSlots({
  tKey, docs, onFiles, existingFiles, tipoTrabajador,
  isOpen, onToggle, collapsible, label,
}: DocSlotsProps) {
  const slot = (field: keyof Docs, slotLabel: string, opts?: { multiple?: boolean }) => {
    const alreadyUploaded = existingFiles.length > 0 && hasPrefix(existingFiles, DOC_PREFIXES[field])
    return (
      <FileUploadSlot
        key={`${tKey}_${field}`}
        label={slotLabel}
        fieldName={`${tKey}_${field}`}
        files={docs[field]}
        onFiles={onFiles(tKey, field)}
        alreadyUploaded={alreadyUploaded}
        multiple={opts?.multiple}
      />
    )
  }

  const content = (
    <>
      {slot('dni', 'DNI/NIE (parte delantera y trasera)', { multiple: true })}

      {/* Nóminas — solo España y Gibraltar */}
      {tipoTrabajador !== 'autonomo' && slot('nominas', 'Últimas 3 nóminas', { multiple: true })}

      {slot('renta', 'Declaración de la renta')}

      {/* P7 — solo Gibraltar */}
      {tipoTrabajador === 'gibraltar' && slot('p7', 'P7')}

      {/* Autónomo */}
      {tipoTrabajador === 'autonomo' && (
        <>
          {slot('recibosAutonomo', '3 últimos recibos cuota autónomo', { multiple: true })}
          {slot('recibosSS', 'Recibos pago seg. social', { multiple: true })}
          {slot('mod131', 'Mod 131 IRPF trimestral', { multiple: true })}
          {slot('mod303', 'Modelo 303 IVA trimestral', { multiple: true })}
          {slot('mod390', 'Mod 390 IVA (si aplica)')}
        </>
      )}

      {slot('vidaLaboral', tipoTrabajador === 'gibraltar' ? 'Vida laboral España' : 'Vida laboral')}
      {tipoTrabajador === 'gibraltar' && slot('vidaLaboralGib', 'Vida laboral Gibraltar')}

      {/* Contrato — solo España y Gibraltar */}
      {tipoTrabajador !== 'autonomo' && slot('contrato', 'Contrato de trabajo')}

      {slot('bancarios', '3 meses movimientos banco', { multiple: true })}
      {slot('notaSimple', 'Nota simple del inmueble')}
      {slot('arras', 'Contrato de arras')}
      {slot('extra1', 'Documento adicional 1')}
      {slot('extra2', 'Documento adicional 2')}
      {slot('extra3', 'Documento adicional 3')}
    </>
  )

  if (!collapsible) return <div>{content}</div>

  return (
    <div className="mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="w-7 h-7 rounded-full bg-[#0f3693] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {tKey === 't1' ? '1' : '2'}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0f3693]">{label}</p>
            <p className="text-xs text-gray-400">Toca para subir documentación</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpedientePage() {
  const [phase, setPhase] = useState<'lookup' | 'upload' | 'processing' | 'done'>('lookup')
  const [dni, setDni] = useState('')
  const [folderId, setFolderId] = useState('')
  const [clientName, setClientName] = useState('')
  const [t2Name, setT2Name] = useState('')
  const [t1Type, setT1Type] = useState<TipoTrabajador>('espana')
  const [t2Type, setT2Type] = useState<TipoTrabajador>('espana')
  const [docsT1, setDocsT1] = useState<Docs>(emptyDocs())
  const [docsT2, setDocsT2] = useState<Docs>(emptyDocs())
  const [existingFiles, setExistingFiles] = useState<string[]>([])
  const [openT1, setOpenT1] = useState(true)
  const [openT2, setOpenT2] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleT1 = useCallback(() => setOpenT1(v => !v), [])
  const toggleT2 = useCallback(() => setOpenT2(v => !v), [])

  const handleFiles = useCallback(
    (tKey: 't1' | 't2', field: keyof Docs) =>
      (files: File[]) => {
        if (tKey === 't1') setDocsT1(prev => ({ ...prev, [field]: files }))
        else setDocsT2(prev => ({ ...prev, [field]: files }))
      },
    [],
  )

  const fetchExistingFiles = async (folder: string) => {
    if (!folder) return
    try {
      const res = await fetch(`/api/files?folderId=${encodeURIComponent(folder)}`)
      if (res.ok) setExistingFiles((await res.json()).files || [])
    } catch {}
  }

  const handleLookup = async () => {
    if (!dni) { setError('Introduce tu DNI/NIE'); return }
    setError(null)

    const saved = localStorage.getItem('zen_client')
    if (saved) {
      const data = JSON.parse(saved)
      if (data.dni === dni.toUpperCase()) {
        setFolderId(data.folderId)
        setClientName(data.name)
        if (data.t2Name) setT2Name(data.t2Name)
        if (data.t1Type) setT1Type(data.t1Type as TipoTrabajador)
        if (data.t2Type) setT2Type(data.t2Type as TipoTrabajador)
        fetchExistingFiles(data.folderId)
        setPhase('upload')
        return
      }
    }

    try {
      const res = await fetch(`/api/lookup?dni=${encodeURIComponent(dni.toUpperCase())}`)
      if (!res.ok) throw new Error('No se encontró ningún expediente con ese DNI')
      const data = await res.json()
      setFolderId(data.folderId)
      setClientName(data.name)
      if (data.t2Name) setT2Name(data.t2Name)
      if (data.t1Type) setT1Type(data.t1Type as TipoTrabajador)
      if (data.t2Type) setT2Type(data.t2Type as TipoTrabajador)
      fetchExistingFiles(data.folderId)
      setPhase('upload')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleUpload = async () => {
    const hasT1 = Object.values(docsT1).some(a => a.length > 0)
    const hasT2 = Object.values(docsT2).some(a => a.length > 0)
    if (!hasT1 && !hasT2) { setError('Sube al menos un documento'); return }

    const MAX_PDF_MB = 4
    const allFiles = [...Object.values(docsT1).flat(), ...Object.values(docsT2).flat()]
    const tooBig = allFiles.filter(f => f.type === 'application/pdf' && f.size > MAX_PDF_MB * 1024 * 1024)
    if (tooBig.length > 0) {
      const lines = tooBig.map(f => `• "${f.name}" (${(f.size / 1024 / 1024).toFixed(1)} MB)`)
      setError(`Los siguientes PDFs superan el límite de ${MAX_PDF_MB} MB:\n\n${lines.join('\n')}`)
      return
    }

    setError(null)
    setPhase('processing')

    try {
      if (hasT1) await uploadDocsSlotBySlot(folderId, clientName, docsT1)
      if (hasT2 && t2Name) await uploadDocsSlotBySlot(folderId, t2Name, docsT2)
      setTimeout(() => setPhase('done'), 800)
    } catch (e: any) {
      setError(e.message)
      setPhase('upload')
    }
  }

  // ── Processing ───────────────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
          <Mascot size={160} animate={true} />
          <h2 className="text-xl font-semibold text-[#0f3693] mt-6 mb-2">Procesando tu solicitud...</h2>
          <p className="text-gray-400 text-sm">Estamos organizando tus documentos. Un momento.</p>
          <div className="flex justify-center gap-2 mt-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 bg-[#ffbeb8] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
          <div className="mt-8 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 flex items-center gap-2.5 max-w-xs">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <p className="text-xs font-medium text-amber-800 text-left">
              No cierres esta página mientras se suben tus documentos
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 text-center">
          <Mascot size={200} animate={false} />
          <h2 className="text-2xl font-bold text-[#0f3693] mt-4 mb-4">¡Documentos añadidos!</h2>
          <div className="text-gray-600 leading-relaxed mb-8 space-y-1">
            <p>Muchas gracias por enviarnos tu documentación.</p>
            <p>Tu asesor se pondrá en contacto contigo en breve.</p>
          </div>
          <a href="/" className="inline-block bg-[#0f3693] text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-800 transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  // ── Upload ────────────────────────────────────────────────────────────────────
  if (phase === 'upload') {
    const firstName1 = clientName.split(' ')[0]
    const hasTwoTitulares = !!t2Name

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 pb-24 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0f3693]">Hola, {firstName1} 👋</h2>
            <p className="text-gray-500 text-sm mt-1">¿Qué documentos nos faltan?</p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-3 mb-5 flex items-center gap-2">
            <span className="text-[#0f3693]">👤</span>
            <div>
              <p className="text-xs text-gray-500">Expediente encontrado</p>
              <p className="text-sm font-semibold text-[#0f3693]">{clientName} · {dni.toUpperCase()}</p>
            </div>
          </div>

          {existingFiles.length > 0 && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex items-center gap-1.5">
              <span>✅</span>
              <span>Los documentos tachados ya están en tu expediente. Puedes reemplazarlos si lo necesitas.</span>
            </div>
          )}

          {hasTwoTitulares ? (
            <>
              <DocSlots
                tKey="t1" docs={docsT1} onFiles={handleFiles}
                existingFiles={existingFiles}
                tipoTrabajador={t1Type}
                isOpen={openT1} onToggle={toggleT1}
                collapsible={true} label={clientName}
              />
              <DocSlots
                tKey="t2" docs={docsT2} onFiles={handleFiles}
                existingFiles={[]}
                tipoTrabajador={t2Type}
                isOpen={openT2} onToggle={toggleT2}
                collapsible={true} label={t2Name}
              />
            </>
          ) : (
            <DocSlots
              tKey="t1" docs={docsT1} onFiles={handleFiles}
              existingFiles={existingFiles}
              tipoTrabajador={t1Type}
              isOpen={true} onToggle={() => {}}
              collapsible={false} label={clientName}
            />
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm whitespace-pre-line">
              {error}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
          <div className="max-w-lg mx-auto">
            <button onClick={handleUpload} className="w-full py-3 rounded-xl bg-[#0f3693] text-white font-medium">
              Subir documentos ✓
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Lookup ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-10">
        <h2 className="text-xl font-semibold text-[#0f3693] mb-2">Ya tengo expediente</h2>
        <p className="text-gray-500 text-sm mb-6">Introduce tu DNI/NIE para acceder a tu expediente</p>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">DNI/NIE</label>
          <input
            type="text"
            value={dni}
            onChange={e => setDni(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="12345678A"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] uppercase placeholder:text-gray-300"
          />
        </div>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}
        <button onClick={handleLookup} className="w-full py-3 rounded-xl bg-[#0f3693] text-white font-medium">
          Buscar expediente →
        </button>
        <a href="/" className="block text-center mt-4 text-sm text-gray-500 underline">Volver al inicio</a>
      </div>
    </div>
  )
}
