/**
 * Compresses an image file using the Canvas API before upload.
 * Returns the original file unchanged if it's a PDF or already small enough.
 */
export async function compressImageFile(file: File, maxSizeMB = 0.2): Promise<File> {
  // Don't compress PDFs or non-images
  if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
    return file
  }

  const maxBytes = maxSizeMB * 1024 * 1024

  // If already small enough, skip compression
  if (file.size <= maxBytes) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Scale down proportionally so the file fits under maxBytes
      const ratio = Math.sqrt(maxBytes / file.size)
      const width = Math.round(img.width * ratio)
      const height = Math.round(img.height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
          resolve(compressed)
        },
        'image/jpeg',
        0.85
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

/** Compress an array of files sequentially to avoid browser memory exhaustion */
export async function compressFiles(files: File[], maxSizeMB = 0.2): Promise<File[]> {
  const results: File[] = []
  for (const f of files) {
    results.push(await compressImageFile(f, maxSizeMB))
  }
  return results
}
