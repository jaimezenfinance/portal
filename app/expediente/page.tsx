'use client'
import { useState, useCallback } from 'react'
import Header from '@/components/Header'
import FileUploadSlot from '@/components/FileUploadSlot'
import Mascot from '@/components/Mascot'
import { compressImageFile } from '@/lib/compressImage'

interface Docs {
  dni: File[]
  nominas: File[]
  renta: File[]
  vidaLaboral: File[]
  contrato: File[]
  notaSimple: File[]
  arras: File[]
  extra1: File[]
  extra2: File[]
  extra3: File[]
}

const emptyDocs = (): Docs => ({
  dni: [], nominas: [], renta: [],
  vidaLaboral: [], contrato: [], notaSimple: [], arras: [],
  extra1: [], extra2: [], extra3: [],
})

// Maps each doc slot to the file prefix used when uploading
const DOC_PREFIXES: Record<keyof Docs, string> = {
  dni: 'DNI_',
  nominas: 'NOMINA_',
  renta: 'RENTA_',
  vidaLaboral: 'VIDALABORAL_',
  contrato: 'CONTRATO_',
  notaSimple: 'NOTASIMPLE_',
  arras: 'ARRAS_',
  extra1: 'EXTRA1_',
  extra2: 'EXTRA2_',
  extra3: 'EXTRA3_',
}

function hasPrefix(files: string[], prefix: string): boolean {
  return files.some(f => f.toUpperCase().startsWith(prefix))
}

export default function ExpedientePage() {
  const [phase, setPhase] = useState<'lookup' | 'upload' | 'processing' | 'done'>('lookup')
  const [dni, setDni] = useState('')
  const [folderId, setFolderId] = useState('')
  const [clientName, setClientName] = useState('')
  const [docs, setDocs] = useState<Docs>(emptyDocs())
  const [existingFiles, setExistingFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleDocFiles = useCallback((field: keyof Docs) => (files: File[]) => {
    setDocs(prev => ({ ...prev, [field]: files }))
  }, [])

  const handleLookup = async () => {
    if (!dni) { setError('Introduce tu DNI/NIE'); return }
    setError(null)

    // Check localStorage first
    const saved = localStorage.getItem('zen_client')
    if (saved) {
      const data = JSON.parse(saved)
      if (data.dni === dni.toUpperCase()) {
        setFolderId(data.folderId)
        setClientName(data.name)
        fetchExistingFiles(data.folderId)
        setPhase('upload')
        return
      }
    }

    // Fallback: search via API
    try {
      const res = await fetch(`/api/lookup?dni=${encodeURIComponent(dni.toUpperCase())}`)
      if (!res.ok) throw new Error('No se encontró ningún expediente con ese DNI')
      const data = await res.json()
      setFolderId(data.folderId)
      setClientName(data.name)
      fetchExistingFiles(data.folderId)
      setPhase('upload')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const fetchExistingFiles = async (folder: string) => {
    if (!folder) return
    try {
      const res = await fetch(`/api/files?folderId=${encodeURIComponent(folder)}`)
      if (res.ok) {
        const data = await res.json()
        setExistingFiles(data.files || [])
      }
    } catch {
      // Non-critical — silently ignore
    }
  }

  const handleUpload = async () => {
    const hasFiles = Object.values(docs).some(arr => arr.length > 0)
    if (!hasFiles) { setError('Sube al menos un documento'); return }

    // Check file sizes before uploading (4 MB max per PDF file)
    const MAX_PDF_MB = 4
    const allFiles = Object.values(docs).flat()
    const tooBig = allFiles.find(f => f.type === 'application/pdf' && f.size > MAX_PDF_MB * 1024 * 1024)
    if (tooBig) {
      setError(`"${tooBig.name}" es demasiado grande (${(tooBig.size / 1024 / 1024).toFixed(1)} MB). Máximo ${MAX_PDF_MB} MB por archivo PDF.`)
      return
    }

    setError(null)
    setPhase('processing')

    try {
      const formData = new FormData()
      formData.append('folderId', folderId)
      formData.append('clientName', clientName)
      formData.append('dni', dni.toUpperCase())
      formData.append('mode', 'returning')

      const c = compressImageFile
      if (docs.dni[0]) formData.append('dniFront', await c(docs.dni[0]))
      if (docs.dni[1]) formData.append('dniBack', await c(docs.dni[1]))
      for (const f of docs.nominas) formData.append('nominas', await c(f))
      if (docs.renta[0]) formData.append('renta', await c(docs.renta[0]))
      if (docs.vidaLaboral[0]) formData.append('vidaLaboral', await c(docs.vidaLaboral[0]))
      if (docs.contrato[0]) formData.append('contrato', await c(docs.contrato[0]))
      if (docs.notaSimple[0]) formData.append('notaSimple', await c(docs.notaSimple[0]))
      if (docs.arras[0]) formData.append('arras', await c(docs.arras[0]))
      if (docs.extra1[0]) formData.append('extra1', await c(docs.extra1[0]))
      if (docs.extra2[0]) formData.append('extra2', await c(docs.extra2[0]))
      if (docs.extra3[0]) formData.append('extra3', await c(docs.extra3[0]))

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        if (res.status === 413) throw new Error('Los archivos son demasiado grandes. Intenta subir documentos más pequeños.')
        const text = await res.text()
        let msg = 'Error al subir documentos'
        try { msg = JSON.parse(text).error || msg } catch {}
        throw new Error(msg)
      }
      setTimeout(() => setPhase('done'), 800)
    } catch (e: any) {
      setError(e.message)
      setPhase('upload')
    }
  }

  if (phase === 'processing') {
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
        </div>
      </div>
    )
  }

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
          <a href="/" className="inline-block bg-[#0f3693] text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-800 transition-colors">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (phase === 'upload') {
    const firstName = clientName.split(' ')[0]

    const slot = (field: keyof Docs, label: string, opts?: { multiple?: boolean; required?: boolean }) => {
      const alreadyUploaded = existingFiles.length > 0 && hasPrefix(existingFiles, DOC_PREFIXES[field])
      return (
        <FileUploadSlot
          key={field}
          label={label}
          fieldName={field}
          files={docs[field]}
          onFiles={handleDocFiles(field)}
          alreadyUploaded={alreadyUploaded}
          multiple={opts?.multiple}
          required={opts?.required}
        />
      )
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-lg mx-auto px-4 pb-24 py-6">
          {/* Personalized title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0f3693]">Hola, {firstName} 👋</h2>
            <p className="text-gray-500 text-sm mt-1">¿Qué documentos nos faltan?</p>
          </div>

          {/* Client badge */}
          <div className="bg-blue-50 rounded-2xl p-3 mb-5 flex items-center gap-2">
            <span className="text-[#0f3693]">👤</span>
            <div>
              <p className="text-xs text-gray-500">Expediente encontrado</p>
              <p className="text-sm font-semibold text-[#0f3693]">{clientName} · {dni.toUpperCase()}</p>
            </div>
          </div>

          {/* Legend if there are existing files */}
          {existingFiles.length > 0 && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 flex items-center gap-1.5">
              <span>✅</span>
              <span>Los documentos tachados ya están en tu expediente. Puedes reemplazarlos si lo necesitas.</span>
            </div>
          )}

          {slot('dni', 'DNI/NIE (parte delantera y trasera)', { multiple: true })}
          {slot('nominas', 'Últimas 3 nóminas', { multiple: true })}
          {slot('renta', 'Declaración de la renta')}
          {slot('vidaLaboral', 'Vida laboral')}
          {slot('contrato', 'Contrato de trabajo')}
          {slot('notaSimple', 'Nota simple del inmueble')}
          {slot('arras', 'Contrato de arras')}
          {slot('extra1', 'Documento adicional 1')}
          {slot('extra2', 'Documento adicional 2')}
          {slot('extra3', 'Documento adicional 3')}

          {error && <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>}
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

  // phase === 'lookup'
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
            placeholder="12345678A"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3693] uppercase placeholder:text-gray-300"
          />
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>}
        <button onClick={handleLookup} className="w-full py-3 rounded-xl bg-[#0f3693] text-white font-medium">
          Buscar expediente →
        </button>
        <a href="/" className="block text-center mt-4 text-sm text-gray-500 underline">Volver al inicio</a>
      </div>
    </div>
  )
}
