import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { pool } from '../client'
import { sanitizeFilename } from '../../utils/functions'

const DATABASE_UPLOAD_PREFIX = 'db-upload:'
const DATABASE_DOWNLOAD_TOKEN_TTL = '30m'
const MAX_DATABASE_UPLOAD_BYTES = 10 * 1024 * 1024

type DatabaseDownloadToken = {
  fileId: string
  disposition: 'inline' | 'attachment'
  downloadName?: string
}

let tableReady: Promise<void> | null = null

const ensureDatabaseUploadsTable = () => {
  if (!tableReady) {
    tableReady = pool
      .query(`
        create table if not exists database_uploads (
          id uuid primary key,
          user_id uuid,
          original_name text not null,
          mime_type varchar(255) not null,
          size_bytes integer not null,
          content bytea not null,
          created_at timestamptz not null default now()
        );
        create index if not exists database_uploads_user_id_idx
          on database_uploads (user_id, created_at desc);
      `)
      .then(() => undefined)
      .catch((error) => {
        tableReady = null
        throw error
      })
  }

  return tableReady
}

const getTokenSecret = () =>
  process.env.UPLOAD_PROXY_TOKEN_SECRET ||
  process.env.ACCESS_TOKEN_SECRET ||
  'database-upload-download-secret'

const getPublicApiBaseUrl = () =>
  String(
    process.env.API_URL ||
      process.env.PUBLIC_API_URL ||
      process.env.API_PUBLIC_URL ||
      'https://api.fastship.in',
  )
    .trim()
    .replace(/\/+$/, '')

export const isDatabaseUploadKey = (value: unknown): value is string =>
  String(value || '').startsWith(DATABASE_UPLOAD_PREFIX)

const getDatabaseUploadId = (key: string) => {
  if (!isDatabaseUploadKey(key)) return null
  const id = key.slice(DATABASE_UPLOAD_PREFIX.length).trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null
}

export const createDatabaseUploadDownloadUrl = (
  key: string,
  options?: {
    disposition?: 'inline' | 'attachment'
    downloadName?: string
  },
) => {
  const fileId = getDatabaseUploadId(key)
  if (!fileId) return null

  const token = jwt.sign(
    {
      fileId,
      disposition: options?.disposition || 'inline',
      downloadName: options?.downloadName,
    } satisfies DatabaseDownloadToken,
    getTokenSecret(),
    { expiresIn: DATABASE_DOWNLOAD_TOKEN_TTL },
  )

  return `${getPublicApiBaseUrl()}/api/uploads/database/${fileId}?token=${encodeURIComponent(token)}`
}

export const databaseUploadExists = async (key: string) => {
  const id = getDatabaseUploadId(key)
  if (!id) return false
  await ensureDatabaseUploadsTable()
  const result = await pool.query('select 1 from database_uploads where id = $1 limit 1', [id])
  return result.rowCount === 1
}

export const uploadBufferToDatabase = async ({
  buffer,
  filename,
  contentType,
  userId,
}: {
  buffer: Buffer
  filename: string
  contentType: string
  userId: string
}) => {
  if (!buffer.length) throw new Error('Cannot store an empty upload')
  if (buffer.length > MAX_DATABASE_UPLOAD_BYTES) {
    const error = new Error('File is too large. Maximum upload size is 10 MB.') as Error & {
      statusCode?: number
    }
    error.statusCode = 413
    throw error
  }

  await ensureDatabaseUploadsTable()
  const id = randomUUID()
  const originalName = sanitizeFilename(filename)
  const mimeType = String(contentType || 'application/octet-stream').slice(0, 255)

  await pool.query(
    `insert into database_uploads
      (id, user_id, original_name, mime_type, size_bytes, content)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, userId, originalName, mimeType, buffer.length, buffer],
  )

  const key = `${DATABASE_UPLOAD_PREFIX}${id}`
  return {
    bucket: 'postgresql',
    key,
    publicUrl: createDatabaseUploadDownloadUrl(key) as string,
  }
}

export const getDatabaseUploadFromToken = async (token: string, expectedFileId: string) => {
  const payload = jwt.verify(token, getTokenSecret()) as DatabaseDownloadToken
  if (payload.fileId !== expectedFileId) throw new Error('Download token does not match the file')

  await ensureDatabaseUploadsTable()
  const result = await pool.query<{
    original_name: string
    mime_type: string
    content: Buffer
  }>(
    'select original_name, mime_type, content from database_uploads where id = $1 limit 1',
    [expectedFileId],
  )

  const file = result.rows[0]
  if (!file) return null

  return {
    ...file,
    disposition: payload.disposition || 'inline',
    downloadName: sanitizeFilename(payload.downloadName || file.original_name),
  }
}
