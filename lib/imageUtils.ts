import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'

async function trimImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate()                                    // respeta orientación EXIF del móvil
      .trim({ background: '#ffffff', threshold: 15 })
      .jpeg({ quality: 92 })
      .toBuffer()
  } catch {
    return buffer
  }
}

async function imageToPdf(jpegBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const meta = await sharp(jpegBuffer).metadata()
  const img = await pdfDoc.embedJpg(jpegBuffer)
  const w = meta.width || img.width
  const h = meta.height || img.height
  const page = pdfDoc.addPage([w, h])
  page.drawImage(img, { x: 0, y: 0, width: w, height: h })
  return Buffer.from(await pdfDoc.save())
}

export async function combineDniImages(frontBuffer: Buffer, backBuffer: Buffer): Promise<Buffer> {
  const front = await trimImage(frontBuffer)
  const back = await trimImage(backBuffer)

  const frontMeta = await sharp(front).metadata()
  const backMeta = await sharp(back).metadata()
  const targetHeight = Math.max(frontMeta.height || 800, backMeta.height || 800)

  const frontResized = await sharp(front)
    .resize({ height: targetHeight, fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 92 })
    .toBuffer()
  const backResized = await sharp(back)
    .resize({ height: targetHeight, fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 92 })
    .toBuffer()

  const fMeta = await sharp(frontResized).metadata()
  const bMeta = await sharp(backResized).metadata()
  const totalWidth = (fMeta.width || 0) + (bMeta.width || 0) + 20

  const combined = await sharp({
    create: {
      width: totalWidth,
      height: targetHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: frontResized, left: 0, top: 0 },
      { input: backResized, left: (fMeta.width || 0) + 20, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer()

  return imageToPdf(combined)
}

export async function singleDniToPdf(buffer: Buffer): Promise<Buffer> {
  const trimmed = await trimImage(buffer)
  return imageToPdf(trimmed)
}

/** Converts any image (jpg, png, etc.) to PDF. Returns the buffer unchanged if it's already a PDF. */
export async function convertImageToPdf(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === 'application/pdf') return buffer
  const trimmed = await trimImage(buffer)
  return imageToPdf(trimmed)
}

/** Merges multiple files (PDFs or images) into a single PDF */
export async function mergeFilesToPdf(files: Array<{ buffer: Buffer; mimeType: string }>): Promise<Buffer> {
  const merged = await PDFDocument.create()
  for (const file of files) {
    let pdfBuf: Buffer
    if (file.mimeType === 'application/pdf') {
      pdfBuf = file.buffer
    } else {
      pdfBuf = await convertImageToPdf(file.buffer, file.mimeType)
    }
    try {
      const src = await PDFDocument.load(pdfBuf)
      const pages = await merged.copyPages(src, src.getPageIndices())
      pages.forEach(p => merged.addPage(p))
    } catch { /* skip unreadable pages */ }
  }
  return Buffer.from(await merged.save())
}
