import { NextRequest, NextResponse } from 'next/server'
import { listFilesInFolder } from '@/lib/drive'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('folderId')
  if (!folderId) return NextResponse.json({ error: 'folderId requerido' }, { status: 400 })

  try {
    const files = await listFilesInFolder(folderId)
    return NextResponse.json({ files })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
