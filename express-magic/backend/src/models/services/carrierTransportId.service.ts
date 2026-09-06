import { pool } from '../client'

export type CarrierTransportId = {
  carrierKey: string
  carrierName: string
  transportId: string
  isActive: boolean
  sortOrder: number
}

const defaultCarrierTransportIds: CarrierTransportId[] = [
  { carrierKey: 'delhivery', carrierName: 'Delhivery', transportId: '06AAPCS9575E1ZR', isActive: true, sortOrder: 10 },
  { carrierKey: 'movin', carrierName: 'Movin', transportId: '88AAFC17460Q1ZW', isActive: true, sortOrder: 20 },
  { carrierKey: 'bluedart', carrierName: 'Bluedart', transportId: '27AAACB044L1ZS', isActive: true, sortOrder: 30 },
  { carrierKey: 'xpressbees', carrierName: 'Xpressbees', transportId: '27AAGCB3904P2ZC', isActive: true, sortOrder: 40 },
  { carrierKey: 'dtdc', carrierName: 'DTDC', transportId: '88AAACD8017H1ZX', isActive: true, sortOrder: 50 },
  { carrierKey: 'dp-world', carrierName: 'DP World', transportId: '88AADCD1983D1ZS', isActive: true, sortOrder: 60 },
  { carrierKey: 'ekart-ltl', carrierName: 'Ekart LTL', transportId: '07AADCI8374D2ZH', isActive: true, sortOrder: 70 },
  { carrierKey: 'tci-express', carrierName: 'TCI Express', transportId: '06AADCT0663J4Z9', isActive: true, sortOrder: 80 },
  { carrierKey: 'gati', carrierName: 'Gati', transportId: '88AACCA2894D1ZS', isActive: true, sortOrder: 90 },
]

let schemaReady: Promise<void> | null = null

const toCarrierKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const ensureCarrierTransportIdsSchema = () => {
  if (!schemaReady) {
    schemaReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS carrier_transport_ids (
          carrier_key TEXT PRIMARY KEY,
          carrier_name TEXT NOT NULL,
          transport_id TEXT NOT NULL DEFAULT '',
          is_active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      .then(async () => {
        for (const carrier of defaultCarrierTransportIds) {
          await pool.query(
            `
              INSERT INTO carrier_transport_ids
                (carrier_key, carrier_name, transport_id, is_active, sort_order)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (carrier_key) DO NOTHING
            `,
            [
              carrier.carrierKey,
              carrier.carrierName,
              carrier.transportId,
              carrier.isActive,
              carrier.sortOrder,
            ],
          )
        }
      })
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null
        throw error
      })
  }

  return schemaReady
}

const mapCarrierTransportIdRow = (row: any): CarrierTransportId => ({
  carrierKey: String(row.carrier_key || ''),
  carrierName: String(row.carrier_name || ''),
  transportId: String(row.transport_id || ''),
  isActive: row.is_active !== false,
  sortOrder: Number(row.sort_order || 0),
})

export async function listCarrierTransportIds(options: { includeInactive?: boolean } = {}) {
  await ensureCarrierTransportIdsSchema()

  const result = await pool.query(
    `
      SELECT carrier_key, carrier_name, transport_id, is_active, sort_order
      FROM carrier_transport_ids
      WHERE ($1::BOOLEAN = true OR is_active = true)
      ORDER BY sort_order ASC, carrier_name ASC
    `,
    [options.includeInactive === true],
  )

  return result.rows.map(mapCarrierTransportIdRow)
}

export async function saveCarrierTransportIds(entries: Partial<CarrierTransportId>[]) {
  await ensureCarrierTransportIdsSchema()

  if (!Array.isArray(entries)) {
    throw new Error('Carrier transport IDs must be an array')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const [index, entry] of entries.entries()) {
      const carrierName = String(entry.carrierName || '').trim()
      const carrierKey = toCarrierKey(String(entry.carrierKey || carrierName))
      if (!carrierKey || !carrierName) {
        throw new Error(`Carrier name is required for row ${index + 1}`)
      }

      await client.query(
        `
          INSERT INTO carrier_transport_ids
            (carrier_key, carrier_name, transport_id, is_active, sort_order, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (carrier_key)
          DO UPDATE SET
            carrier_name = EXCLUDED.carrier_name,
            transport_id = EXCLUDED.transport_id,
            is_active = EXCLUDED.is_active,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW()
        `,
        [
          carrierKey,
          carrierName,
          String(entry.transportId || '').trim().toUpperCase(),
          entry.isActive !== false,
          Number.isFinite(Number(entry.sortOrder)) ? Number(entry.sortOrder) : (index + 1) * 10,
        ],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return listCarrierTransportIds({ includeInactive: true })
}
