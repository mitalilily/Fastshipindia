import assert from 'assert/strict'

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:5432/fastship-upload-test'
process.env.ACCESS_TOKEN_SECRET = 'test-database-upload-secret'
process.env.API_URL = 'https://api.example.test'

const run = async () => {
  const { pool } = await import('../models/client')
  const originalQuery = pool.query.bind(pool)
  const stored = new Map<
    string,
    { original_name: string; mime_type: string; content: Buffer }
  >()

  ;(pool as any).query = async (queryText: string, params: unknown[] = []) => {
    const normalized = String(queryText).replace(/\s+/g, ' ').trim().toLowerCase()
    if (normalized.startsWith('create table')) return { rows: [], rowCount: 0 }

    if (normalized.startsWith('insert into database_uploads')) {
      const [id, , originalName, mimeType, , content] = params as [
        string,
        string,
        string,
        string,
        number,
        Buffer,
      ]
      stored.set(id, {
        original_name: originalName,
        mime_type: mimeType,
        content,
      })
      return { rows: [], rowCount: 1 }
    }

    const id = String(params[0] || '')
    if (normalized.startsWith('select 1 from database_uploads')) {
      return { rows: stored.has(id) ? [{ '?column?': 1 }] : [], rowCount: stored.has(id) ? 1 : 0 }
    }
    if (normalized.startsWith('select original_name')) {
      const row = stored.get(id)
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 }
    }

    throw new Error(`Unexpected database-upload check query: ${normalized}`)
  }

  try {
    const {
      databaseUploadExists,
      getDatabaseUploadFromToken,
      isDatabaseUploadKey,
      uploadBufferToDatabase,
    } = await import('../models/services/databaseUpload.service')

    const originalContent = Buffer.from('verified KYC document')
    const uploaded = await uploadBufferToDatabase({
      buffer: originalContent,
      filename: 'Identity Proof.PDF',
      contentType: 'application/pdf',
      userId: '6a7ed3e3-657d-4cf7-9ed0-21acb0000001',
    })

    assert.equal(uploaded.bucket, 'postgresql')
    assert.equal(isDatabaseUploadKey(uploaded.key), true)
    assert.equal(await databaseUploadExists(uploaded.key), true)

    const signedUrl = new URL(uploaded.publicUrl)
    const fileId = uploaded.key.replace('db-upload:', '')
    assert.equal(signedUrl.origin, 'https://api.example.test')
    assert.equal(signedUrl.pathname, `/api/uploads/database/${fileId}`)

    const token = signedUrl.searchParams.get('token')
    assert.ok(token)
    const downloaded = await getDatabaseUploadFromToken(token, fileId)
    assert.ok(downloaded)
    assert.equal(downloaded.original_name, 'identity-proof.pdf')
    assert.equal(downloaded.mime_type, 'application/pdf')
    assert.deepEqual(downloaded.content, originalContent)

    await assert.rejects(() => getDatabaseUploadFromToken(token, '00000000-0000-4000-8000-000000000000'))
    console.log('Database upload fallback checks passed.')
  } finally {
    ;(pool as any).query = originalQuery
    await pool.end()
  }
}

run().catch((error) => {
  console.error('Database upload fallback checks failed:', error)
  process.exit(1)
})
