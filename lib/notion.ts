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
  titular1?: { nombre: string; dni: string; email: string; telefono: string; edad?: number }
  titular2?: { nombre: string; dni: string; email: string; telefono: string; edad?: number }
}): Promise<void> {
  const databaseId = process.env.NOTION_DATABASE_ID!
  const notion = getNotion()
  const properties: Record<string, any> = {
    Name: {
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

export async function findClientByDni(dni: string): Promise<{ name: string; folderId?: string } | null> {
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
  const name = page.properties?.Name?.title?.[0]?.text?.content || ''
  const folderId = page.properties?.FolderID?.rich_text?.[0]?.text?.content || undefined
  return { name, folderId }
}
