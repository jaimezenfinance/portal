import { Client } from '@notionhq/client'

function getNotion() {
  const token = process.env.NOTION_TOKEN
  if (!token || token.trim() === '') {
    throw new Error(
      'NOTION_TOKEN no está configurado. ' +
      'Añade tu token de integración de Notion en .env.local'
    )
  }
  return new Client({ auth: token })
}

// Map internal type keys → Notion select option names
const TIPO_TO_NOTION: Record<string, string> = {
  espana: 'españa',
  gibraltar: 'gibraltar',
  autonomo: 'autonomo',
}

export async function createClientEntry(data: {
  name: string
  dni: string
  telefono: string
  email: string
  area: string
  situacion?: string
  direccion?: string
  precioCompra?: number
  arras?: number
  t1Type?: string
  t2Type?: string
  titular1?: { nombre: string; dni: string; email: string; telefono: string; edad?: number }
  titular2?: { nombre: string; dni: string; email: string; telefono: string; edad?: number }
}): Promise<void> {
  const databaseId = process.env.NOTION_DATABASE_ID!
  const notion = getNotion()
  const properties: Record<string, any> = {
    Nombre: {
      title: [{ text: { content: data.name } }],
    },
    DNI: {
      rich_text: [{ text: { content: data.dni } }],
    },
    Teléfono: {
      phone_number: data.telefono,
    },
    Email: {
      email: data.email,
    },
    Área: {
      select: { name: data.area },
    },
    Situación: {
      rich_text: [{ text: { content: data.situacion || '' } }],
    },
    Dirección: {
      rich_text: [{ text: { content: data.direccion || '' } }],
    },
    Status: {
      status: { name: 'Documentos' },
    },
  }
  if (data.precioCompra !== undefined) {
    properties['Valor Compra'] = { number: data.precioCompra }
  }
  if (data.arras !== undefined) {
    properties['Arras'] = { number: data.arras }
  }
  if (data.t1Type) {
    properties['Tipo Trabajador #1'] = { select: { name: TIPO_TO_NOTION[data.t1Type] ?? data.t1Type } }
  }
  if (data.t2Type) {
    properties['Tipo Trabajador #2'] = { select: { name: TIPO_TO_NOTION[data.t2Type] ?? data.t2Type } }
  }
  if (data.titular1) {
    properties['Nombre #1'] = { rich_text: [{ text: { content: data.titular1.nombre } }] }
    properties['DNI #1'] = { rich_text: [{ text: { content: data.titular1.dni } }] }
    properties['Email #1'] = { email: data.titular1.email }
    properties['Teléfono #1'] = { phone_number: data.titular1.telefono }
    if (data.titular1.edad !== undefined) properties['Edad #1'] = { number: data.titular1.edad }
  }
  if (data.titular2) {
    properties['Nombre #2'] = { rich_text: [{ text: { content: data.titular2.nombre } }] }
    properties['DNI #2'] = { rich_text: [{ text: { content: data.titular2.dni } }] }
    properties['Email #2'] = { email: data.titular2.email }
    properties['Teléfono #2'] = { phone_number: data.titular2.telefono }
    if (data.titular2.edad !== undefined) properties['Edad #2'] = { number: data.titular2.edad }
  }
  // Create the page
  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  })

  // Copy template blocks (tabs + Diario Bancos views) into the new page
  const TEMPLATE_ID = '28c2a113-edca-8136-be6e-db1aa50621ee'
  try {
    const templateBlocks = await notion.blocks.children.list({ block_id: TEMPLATE_ID })
    const copyable = templateBlocks.results.filter((b: any) => b.type !== 'unsupported')
    if (copyable.length > 0) {
      await notion.blocks.children.append({
        block_id: page.id,
        children: copyable as any[],
      })
    }
  } catch {
    // Non-critical — page is created even if template blocks can't be copied
  }
}

export async function findClientByDni(dni: string): Promise<{ name: string; folderId?: string; t2Name?: string; t1Type: string; t2Type: string } | null> {
  const databaseId = process.env.NOTION_DATABASE_ID!
  const notion = getNotion()
  const res = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'DNI',
      rich_text: { equals: dni },
    },
  })
  if (res.results.length === 0) return null
  const page = res.results[0] as any
  // Map Notion select option names → internal type keys
  const NOTION_TO_TIPO: Record<string, string> = {
    'españa': 'espana',
    'gibraltar': 'gibraltar',
    'autonomo': 'autonomo',
  }
  const name = page.properties?.Nombre?.title?.[0]?.text?.content || ''
  const folderId = page.properties?.FolderID?.rich_text?.[0]?.text?.content || undefined
  const t2Name = page.properties?.['Nombre #2']?.rich_text?.[0]?.text?.content || undefined
  const rawT1 = page.properties?.['Tipo Trabajador #1']?.select?.name || ''
  const rawT2 = page.properties?.['Tipo Trabajador #2']?.select?.name || ''
  const t1Type = NOTION_TO_TIPO[rawT1] || 'espana'
  const t2Type = NOTION_TO_TIPO[rawT2] || 'espana'
  return { name, folderId, t2Name, t1Type, t2Type }
}
