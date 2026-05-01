import { google } from 'googleapis'
import { Readable } from 'stream'

function getAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Faltan credenciales de Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN). ' +
      'Comprueba tu archivo .env.local'
    )
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

export async function createFolder(name: string, parentId: string, color?: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
      ...(color ? { folderColorRgb: color } : {}),
    },
    fields: 'id',
  })
  return res.data.id!
}

const AREA_COLORS: Record<string, string> = {
  'La Línea':    '#4986e7', // azul
  'Algeciras':   '#ff7537', // naranja
  'San Roque':   '#9a9cff', // morado
  'Los Barrios': '#16a765', // verde
  'Castellar':   '#d06b64', // rojo
  'Otro':        '#1a1a1a', // negro
}

export function getAreaColor(area: string): string | undefined {
  return AREA_COLORS[area]
}

export async function uploadFile(
  folderId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const stream = Readable.from(buffer)
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id',
  })
  return res.data.id!
}

export async function listFilesInFolder(folderId: string): Promise<string[]> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(name)',
    pageSize: 100,
  })
  return (res.data.files || []).map(f => f.name!).filter(Boolean)
}

export async function findFolderByName(name: string, parentId: string): Promise<{ id: string; name: string } | null> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const safeName = name.replace(/'/g, "\\'")
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '${safeName}' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 10,
  })
  const files = res.data.files || []
  return files.length > 0 ? { id: files[0].id!, name: files[0].name! } : null
}
