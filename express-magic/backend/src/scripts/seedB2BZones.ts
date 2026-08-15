import { Pool, PoolClient } from 'pg'
import { resolveDatabaseUrl } from '../config/databaseUrl'

export const B2B_ZONE_CATALOG = [
  {
    id: '8fe15546-d17c-4921-bbde-9a38c0a0ffdf',
    code: 'A_B2B',
    name: 'Zone A (B2B)',
    description: 'Covers primary metro cities',
    states: ['DELHI', 'HARYANA', 'HIMACHAL PRADESH', 'PUNJAB'],
  },
  {
    id: '7ad396ca-e4a2-4c94-ab3c-e19d5aeb2d22',
    code: 'B_B2B',
    name: 'Zone B (B2B)',
    description: 'Tier 2 cities coverage',
    states: ['GOA', 'MAHARASHTRA'],
  },
  {
    id: 'a94c5ec9-9a97-45e8-8204-0230ba88bc4a',
    code: 'C_B2B',
    name: 'Zone C (B2B)',
    description: 'Tier 3 cities coverage',
    states: ['BIHAR', 'JHARKHAND', 'ODISHA', 'ORISSA', 'WEST BENGAL'],
  },
  {
    id: 'd9e72ae7-c313-45b5-9c28-b35333c6b8ac',
    code: 'D_B2B',
    name: 'Zone D (B2B)',
    description: 'Remote and rural areas',
    states: [
      'ARUNACHAL PRADESH',
      'ASSAM',
      'GUJARAT',
      'MANIPUR',
      'MEGHALAYA',
      'MIZORAM',
      'NAGALAND',
      'RAJASTHAN',
      'SIKKIM',
      'TRIPURA',
    ],
  },
  {
    id: '64a3fbe3-340d-4fed-83f7-b68d8f68603f',
    code: 'E_B2B',
    name: 'Zone E (B2B)',
    description: 'Special handling required',
    states: [
      'ANDHRA PRADESH',
      'CHHATTISGARH',
      'KARNATAKA',
      'KERALA',
      'MADHYA PRADESH',
      'TAMIL NADU',
      'TELANGANA',
      'UTTAR PRADESH',
      'UTTARAKHAND',
    ],
  },
  {
    id: '34e4aa66-df82-441c-afcf-99ac19baab90',
    code: 'SPECIAL_B2B',
    name: 'Special Zone (B2B)',
    description: 'Custom rules and exceptions',
    states: [
      'ANDAMAN AND NICOBAR',
      'ANDAMAN & NICOBAR',
      'CHANDIGARH',
      'DADRA & NAGAR HAVELI & DAMAN & DIU',
      'DAMAN AND DIU',
      'JAMMU & KASHMIR',
      'JAMMU AND KASHMIR',
      'LADAKH',
      'LAKSHADWEEP',
      'PUDUCHERRY',
    ],
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

const resolveTable = async (client: PoolClient, tableNames: string[]) => {
  for (const tableName of tableNames) {
    if (await tableExists(client, tableName)) return tableName
  }
  return null
}

const seedZonePincodes = async (
  client: PoolClient,
  zoneId: string,
  states: readonly string[],
  locationsTable: string,
  pincodesTable: string,
) => {
  if (!states.length) return 0

  const result = await client.query(
    `insert into "${pincodesTable}"
      (pincode, city, state, zone_id, courier_id, service_provider,
       is_oda, is_remote, is_mall, is_sez, is_airport, is_high_security, is_csd)
     select distinct on (location.pincode)
       location.pincode,
       location.city,
       location.state,
       $1,
       null,
       null,
       false,
       false,
       false,
       false,
       false,
       false,
       false
     from "${locationsTable}" as location
     where upper(trim(location.state)) = any($2::text[])
       and not exists (
         select 1
         from "${pincodesTable}" as existing
         where existing.pincode = location.pincode
           and existing.courier_id is null
           and existing.service_provider is null
       )
     order by location.pincode, location.created_at asc
     on conflict do nothing`,
    [zoneId, states.map((state) => state.trim().toUpperCase())],
  )

  return result.rowCount ?? 0
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
    const locationsTable = await resolveTable(client, [
      'shiplifi_locations',
      'meracourierwala_locations',
      'locations',
    ])
    const pincodesTable = await resolveTable(client, [
      'shiplifi_b2b_pincodes',
      'meracourierwala_b2b_pincodes',
      'b2b_pincodes',
    ])
    let insertedPincodes = 0

    for (const zone of B2B_ZONE_CATALOG) {
      const existing = await client.query(
        `select id from ${quotedZonesTable}
         where id = $1 or (code = $2 and upper(business_type) = 'B2B')
         order by case when id = $1 then 0 else 1 end
         limit 1`,
        [zone.id, zone.code],
      )

      if (existing.rows[0]?.id) {
        const existingZoneId = existing.rows[0].id
        await client.query(
          `update ${quotedZonesTable}
           set code = $2,
               name = $3,
               description = $4,
               region = null,
               business_type = 'B2B',
               states = case
                 when states is null or states = '[]'::jsonb then $5::jsonb
                 else states
               end,
               updated_at = now()
           where id = $1`,
          [existingZoneId, zone.code, zone.name, zone.description, JSON.stringify(zone.states)],
        )

        if (locationsTable && pincodesTable) {
          const zoneStateResult = await client.query(
            `select states from ${quotedZonesTable} where id = $1 limit 1`,
            [existingZoneId],
          )
          const effectiveStates = Array.isArray(zoneStateResult.rows[0]?.states)
            ? zoneStateResult.rows[0].states
            : zone.states
          insertedPincodes += await seedZonePincodes(
            client,
            existingZoneId,
            effectiveStates,
            locationsTable,
            pincodesTable,
          )
        }
      } else {
        await client.query(
          `insert into ${quotedZonesTable}
            (id, code, name, description, region, business_type, metadata, states, created_at, updated_at)
           values ($1, $2, $3, $4, null, 'B2B', null, $5::jsonb, $6, $6)`,
          [
            zone.id,
            zone.code,
            zone.name,
            zone.description,
            JSON.stringify(zone.states),
            B2B_ZONE_CREATED_AT,
          ],
        )

        if (locationsTable && pincodesTable) {
          insertedPincodes += await seedZonePincodes(
            client,
            zone.id,
            zone.states,
            locationsTable,
            pincodesTable,
          )
        }
      }
    }

    await client.query('commit')
    console.log(
      `B2B zone catalog seeded (${B2B_ZONE_CATALOG.length} zones, ${insertedPincodes} new pincode mappings).`,
    )
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
