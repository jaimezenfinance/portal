import { NextRequest, NextResponse } from 'next/server'
import { findClientByDni } from '@/lib/notion'
import { findFolderByName } from '@/lib/drive'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dni = searchParams.get('dni')
  if (!dni) return NextResponse.json({ error: 'DNI requerido' }, { status: 400 })

  try {
    const client = await findClientByDni(dni)
    if (!client) return NextResponse.json({ error: 'No se encontró ningún expediente' }, { status: 404 })

    // Try to find the Drive folder by client name
    let folderId = client.folderId
    if (!folderId && client.name) {
      const parentId = process.env.DRIVE_PARENT_FOLDER_ID!
      const nameParts = client.name.toUpperCase().split(' ')
      const searchName = nameParts.slice(0, 2).join(' ')
      const folder = await findFolderByName(searchName, parentId)
      if (folder) folderId = folder.id
    }

    return NextResponse.json({
      name: client.name,
      folderId: folderId || '',
      t2Name: client.t2Name || '',
      t1Type: client.t1Type || 'espana',
      t2Type: client.t2Type || 'espana',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
