import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createFolder, uploadFile, getAreaColor } from '@/lib/drive'
import { createClientEntry } from '@/lib/notion'
import { combineDniImages, singleDniToPdf, convertImageToPdf, mergeFilesToPdf } from '@/lib/imageUtils'

export const maxDuration = 60

function titleCase(s: string) {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function getDocPrefix(fieldName: string): string {
  const map: Record<string, string> = {
    dniFront: 'DNI',
    dniBack: 'DNI',
    nominas: 'NOMINA',
    renta: 'RENTA',
    vidaLaboral: 'VIDALABORAL',
    contrato: 'CONTRATO',
    notaSimple: 'NOTASIMPLE',
    arras: 'ARRAS',
    bancarios: 'BANCARIOS',
    p7: 'P7',
    vidaLaboralGib: 'VIDALABORALGIB',
    recibosAutonomo: 'RECIBOSAUTONOMO',
    recibosSS: 'RECIBOSSS',
    mod131: 'MOD131',
    mod303: 'MOD303',
    mod390: 'MOD390',
    extra1: 'EXTRA1',
    extra2: 'EXTRA2',
    extra3: 'EXTRA3',
  }
  return map[fieldName] || fieldName.toUpperCase()
}

const OTHER_DOC_FIELDS = [
  'nominas', 'renta', 'vidaLaboral', 'contrato', 'notaSimple', 'arras',
  'bancarios', 'p7', 'vidaLaboralGib', 'recibosAutonomo', 'recibosSS',
  'mod131', 'mod303', 'mod390', 'extra1', 'extra2', 'extra3',
]


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const mode = formData.get('mode') as string | null

    const PARENT_FOLDER_ID = process.env.DRIVE_PARENT_FOLDER_ID!

    // ── Create-only mode: folder + Notion entry, no file uploads ──────────
    if (mode === 'createOnly') {
      const titularesRaw = formData.get('titulares') as string
      const inmuebleRaw = formData.get('inmueble') as string
      const titulares = JSON.parse(titularesRaw)
      const inmueble = JSON.parse(inmuebleRaw)
      const titular1 = titulares[0]

      const calleStr = `${inmueble.tipoVia} ${inmueble.calle}`.toUpperCase()
      const areaStr = inmueble.area.toUpperCase()
      const folderName = `${titleCase(titular1.nombre)} ${titleCase(titular1.apellido1)} - ${calleStr} ${areaStr}`

      const folderColor = getAreaColor(inmueble.area)
      const folderId = await createFolder(folderName, PARENT_FOLDER_ID, folderColor)

      // Auto-upload docx template
      const docxPath = path.join(process.cwd(), 'public', 'Expediente_HIPOTECA.docx')
      if (fs.existsSync(docxPath)) {
        const docxBuf = fs.readFileSync(docxPath)
        await uploadFile(folderId, 'Expediente_HIPOTECA.docx', docxBuf,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      }

      // Create subfolders
      await createFolder('Otros', folderId)
      await createFolder('Tasación', folderId)
      const liquidacionesFolderId = await createFolder('Liquidaciones', folderId)

      const plantillaPath = path.join(process.cwd(), 'public', 'PLANTILLA LIQUIDACIÓN COMPRAVENTA.xlsx')
      if (fs.existsSync(plantillaPath)) {
        const plantillaBuf = fs.readFileSync(plantillaPath)
        await uploadFile(liquidacionesFolderId, 'PLANTILLA LIQUIDACIÓN COMPRAVENTA.xlsx', plantillaBuf,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      }

      // Create Notion entry
      const precioCompra = inmueble.precioCompra ? parseFloat(inmueble.precioCompra) : undefined
      const arras = inmueble.entradaArras ? parseFloat(inmueble.entradaArras) : undefined
      const t2 = titulares[1]
      await createClientEntry({
        t1Type: titular1.tipoTrabajador,
        t2Type: t2?.tipoTrabajador,
        name: `${titular1.nombre} ${titular1.apellido1}`,
        dni: titular1.dni,
        telefono: titular1.telefono,
        email: titular1.email,
        area: inmueble.area,
        direccion: calleStr,
        precioCompra,
        arras,
        titular1: {
          nombre: `${titular1.nombre} ${titular1.apellido1}`,
          dni: titular1.dni,
          email: titular1.email,
          telefono: titular1.telefono,
          edad: titular1.edad ? parseInt(titular1.edad) : undefined,
        },
        titular2: t2 ? {
          nombre: `${t2.nombre} ${t2.apellido1}`,
          dni: t2.dni,
          email: t2.email,
          telefono: t2.telefono,
          edad: t2.edad ? parseInt(t2.edad) : undefined,
        } : undefined,
      })

      return NextResponse.json({ ok: true, folderId })
    }

    // ── Returning client mode ──────────────────────────────────────────────
    if (mode === 'returning') {
      const folderId = formData.get('folderId') as string
      const clientName = (formData.get('clientName') as string) || 'cliente'
      const firstName = clientName.split(' ')[0].toLowerCase()

      const dniFrontFile = formData.get('dniFront') as File | null
      const dniBackFile = formData.get('dniBack') as File | null

      if (dniFrontFile && dniBackFile) {
        const frontBuf = Buffer.from(await dniFrontFile.arrayBuffer())
        const backBuf = Buffer.from(await dniBackFile.arrayBuffer())
        const combined = await combineDniImages(frontBuf, backBuf)
        await uploadFile(folderId, `DNI_${firstName}`, combined, 'application/pdf')
      } else if (dniFrontFile) {
        const buf = Buffer.from(await dniFrontFile.arrayBuffer())
        const pdfBuf = await singleDniToPdf(buf)
        await uploadFile(folderId, `DNI_${firstName}.pdf`, pdfBuf, 'application/pdf')
      }

      for (const field of OTHER_DOC_FIELDS) {
        const files = (formData.getAll(field) as File[]).filter(f => f && f.size > 0)
        if (files.length === 0) continue
        const prefix = getDocPrefix(field)
        if (files.length === 1) {
          const f = files[0]
          let buf: Buffer = Buffer.from(await f.arrayBuffer())
          let mimeType = f.type || 'application/pdf'
          if (mimeType.startsWith('image/')) { buf = await convertImageToPdf(buf, mimeType); mimeType = 'application/pdf' }
          await uploadFile(folderId, `${prefix}_${firstName}`, buf, mimeType)
        } else {
          const fileData = await Promise.all(files.map(async f => ({ buffer: Buffer.from(await f.arrayBuffer()), mimeType: f.type || 'application/pdf' })))
          const merged = await mergeFilesToPdf(fileData)
          await uploadFile(folderId, `${prefix}_${firstName}`, merged, 'application/pdf')
        }
      }

      return NextResponse.json({ ok: true })
    }

    // Unknown mode
    return NextResponse.json({ error: 'Modo no reconocido' }, { status: 400 })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
