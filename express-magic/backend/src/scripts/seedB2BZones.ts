import { Pool, PoolClient } from 'pg'
import { resolveDatabaseUrl } from '../config/databaseUrl'

export const B2B_ZONE_CATALOG = [
  {
    id: '8fe15546-d17c-4921-bbde-9a38c0a0ffdf',
    code: 'A_B2B',
    name: 'Zone A (B2B)',
    description: 'Covers primary metro cities',
  },
  {
    id: '7ad396ca-e4a2-4c94-ab3c-e19d5aeb2d22',
    code: 'B_B2B',
    name: 'Zone B (B2B)',
    description: 'Tier 2 cities coverage',
  },
  {
    id: 'a94c5ec9-9a97-45e8-8204-0230ba88bc4a',
    code: 'C_B2B',
    name: 'Zone C (B2B)',
    description: 'Tier 3 cities coverage',
  },
  {
    id: 'd9e72ae7-c313-45b5-9c28-b35333c6b8ac',
    code: 'D_B2B',
    name: 'Zone D (B2B)',
    description: 'Remote and rural areas',
  },
  {
    id: '64a3fbe3-340d-4fed-83f7-b68d8f68603f',
    code: 'E_B2B',
    name: 'Zone E (B2B)',
    description: 'Special handling required',
  },
  {
    id: '34e4aa66-df82-441c-afcf-99ac19baab90',
    code: 'SPECIAL_B2B',
    name: 'Special Zone (B2B)',
    description: 'Custom rules and exceptions',
  },
] as const

// 09 May 2026, 09:01 pm Asia/Kolkata.
const B2B_ZONE_CREATED_AT = new Date('2026-05-09T15:31:00.000Z')

const tableExists = async (client: PoolClient, tableName: string) => {
  const result = await client.query(
    `select 1 from information_schema.tables
     where table_schema = 'public' and table_name = $1 limit 1`,
    [tableName],
  )
  return result.rowCount === 1
}

const resolveZonesTable = async (client: PoolClient) => {
  for (const tableName of ['shiplifi_zones', 'meracourierwala_zones', 'zones']) {
    if (await tableExists(client, tableName)) return tableName
  }
  throw new Error('No zones table found')
}

export const seedB2BZones = async () => {
  const env = process.env.NODE_ENV || 'development'
  const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: env === 'production' ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()
  try {
    await client.query('begin')
    const zonesTable = await resolveZonesTable(client)
    const quotedZonesTable = `"${zonesTable}"`

    for (const zone of B2B_ZONE_CATALOG) {
      const existing = await client.query(
        `select id from ${quotedZonesTable}
         where id = $1 or (code = $2 and upper(business_type) = 'B2B')
         order by case when id = $1 then 0 else 1 end
         limit 1`,
        [zone.id, zone.code],
      )

      if (existing.rows[0]?.id) {
        await client.query(
          `update ${quotedZonesTable}
           set code = $2,
               name = $3,
               description = $4,
               region = null,
               business_type = 'B2B',
               states = '[]'::jsonb,
               updated_at = now()
           where id = $1`,
          [existing.rows[0].id, zone.code, zone.name, zone.description],
        )
      } else {
        await client.query(
          `insert into ${quotedZonesTable}
            (id, code, name, description, region, business_type, metadata, states, created_at, updated_at)
           values ($1, $2, $3, $4, null, 'B2B', null, '[]'::jsonb, $5, $5)`,
          [zone.id, zone.code, zone.name, zone.description, B2B_ZONE_CREATED_AT],
        )
      }
    }

    await client.query('commit')
    console.log(`B2B zone catalog seeded (${B2B_ZONE_CATALOG.length} zones).`)
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

if (require.main === module) {
  seedB2BZones().catch((error) => {
    console.error('Failed to seed B2B zone catalog:', error)
    process.exit(1)
  })
}
