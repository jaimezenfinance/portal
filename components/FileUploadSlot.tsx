'use client'
import { useRef } from 'react'

interface FileUploadSlotProps {
  label: string
  fieldName: string
  required?: boolean
  multiple?: boolean
  files: File[]
  onFiles: (files: File[]) => void
  alreadyUploaded?: boolean
}

export default function FileUploadSlot({ label, fieldName, required, multiple, files, onFiles, alreadyUploaded }: FileUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length > 0) {
      onFiles(multiple ? [...files, ...selected] : selected)
    }
  }

  const removeFile = (index: number) => {
    onFiles(files.filter((_, i) => i !== index))
    if (inputRef.current) inputRef.current.value = ''
  }

  const isDone = files.length > 0 || alreadyUploaded

  return (
    <div className="mb-4">
      {label && (
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>{label}</span>
          {required && <span className="text-red-500 text-xs">*</span>}
          {alreadyUploaded && files.length === 0 && (
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">✓ Subido</span>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl py-4 px-3 text-center text-sm transition-colors cursor-pointer ${
          alreadyUploaded && files.length === 0
            ? 'border-green-200 text-green-600 hover:border-green-400 hover:bg-green-50'
            : 'border-[#ffbeb8] text-gray-500 hover:border-[#0f3693] hover:bg-blue-50'
        }`}
      >
        {alreadyUploaded && files.length === 0
          ? '🔄 Reemplazar archivo'
          : multiple
            ? '📎 Pincha para subir (puedes seleccionar varios a la vez)'
            : '📎 Pincha para subir'}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleChange}
      />
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 text-xs">
              <span className="text-[#0f3693] font-medium truncate max-w-[80%]">✅ {f.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="flex items-center gap-1 text-red-400 hover:text-red-600 ml-2 flex-shrink-0 text-xs font-semibold">✕ Eliminar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
