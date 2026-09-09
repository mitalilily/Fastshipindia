import { Pool, PoolClient } from 'pg'
import { resolveDatabaseUrl } from '../config/databaseUrl'

export const B2B_ZONE_CATALOG = [
  {
    id: 'cae65ad9-2c06-4a9f-a91f-400aaf763013',
    code: 'N1',
    name: 'Zone N1',
    description: 'DELHI, FBD, GZB, GGN, NOIDA',
    states: ['DELHI'],
  },
  {
    id: 'ddc1286b-211e-436f-a0f2-d98f78b4e5c7',
    code: 'N2',
    name: 'Zone N2',
    description: 'HR, PB, RJ, UP, UK',
    states: ['HARYANA', 'PUNJAB', 'RAJASTHAN', 'UTTAR PRADESH', 'UTTARAKHAND'],
  },
  {
    id: '208ee5d2-ae72-4a2a-bcd5-fe9caf41e3e8',
    code: 'N3',
    name: 'Zone N3',
    description: 'HIMACHAL PRADESH, JAMMU & KASHMIR',
    states: ['HIMACHAL PRADESH', 'JAMMU & KASHMIR', 'JAMMU AND KASHMIR'],
  },
  {
    id: 'd0da9b67-df31-416f-802a-c610c57618fd',
    code: 'C1',
    name: 'Zone C1',
    description: 'BHOPAL, INDORE, RAIPUR',
    states: [],
  },
  {
    id: '77f482cf-01e5-47ea-a2b6-9d6a756e80b9',
    code: 'C2',
    name: 'Zone C2',
    description: 'CHHATTISGARH, MADHYA PRADESH',
    states: ['CHHATTISGARH', 'MADHYA PRADESH'],
  },
  {
    id: 'd828ac51-a8f0-48e2-98db-1e7003264bc8',
    code: 'W1',
    name: 'Zone W1',
    description: 'MUM, PUNE, AHMADABAD, BARODA, BHIWANDI, THANE',
    states: [],
  },
  {
    id: '9d523666-b793-445b-a10c-9f1b219dcdc7',
    code: 'W2',
    name: 'Zone W2',
    description: 'GUJRAT, GOA, MH, DAMAN & DIU, DADRA HAVELI',
    states: ['GUJARAT', 'GOA', 'MAHARASHTRA', 'DAMAN & DIU', 'DADRA AND NAGAR HAVELI'],
  },
  {
    id: '91630d1c-0a19-4cd6-bb59-e3df93092df6',
    code: 'E1',
    name: 'Zone E1',
    description: 'PATNA, KOLKATA, JAMSHEDPUR, BHUBANESWAR',
    states: [],
  },
  {
    id: '9d154a85-1db9-4543-b711-40e2f55df88b',
    code: 'E2',
    name: 'Zone E2',
    description: 'BIHAR, JHARKHAND, ODISHA, WEST BENGAL',
    states: ['BIHAR', 'JHARKHAND', 'ODISHA', 'WEST BENGAL'],
  },
  {
    id: 'd674dddd-b83e-495f-b670-ea8656910f50',
    code: 'S1',
    name: 'Zone S1',
    description: 'BANGALORE, CHENNAI, HYDRABAD, SECUNDRABAD, SRIPERUMBUDUR',
    states: [],
  },
  {
    id: '3e6ec6a2-582a-46a7-84a2-3d27ccab0628',
    code: 'S2',
    name: 'Zone S2',
    description: 'ANDHRA PRADESH, KARNATAKA, TAMIL NADU, TELANGANA',
    states: ['ANDHRA PRADESH', 'KARNATAKA', 'TAMIL NADU', 'TELANGANA'],
  },
  {
    id: '0363dd05-dc0c-4740-a0a0-a9c6341a8eff',
    code: 'S3',
    name: 'Zone S3',
    description: 'KERLA, PONDICHERRY',
    states: ['KERALA', 'PUDUCHERRY'],
  },
  {
    id: 'f26e0454-465a-4489-8c14-b556d27bb18b',
    code: 'NE1',
    name: 'Zone NE1',
    description: 'GUWAHATI',
    states: [],
  },
  {
    id: '270b3fe2-6639-40cc-8622-9ec9e6934349',
    code: 'NE2',
    name: 'Zone NE2',
    description: 'ARUNACHAL, ASSAM, MANIPUR, MEGHALAYA, MIZORAM, NAGALAND, SIKKIM, TRIPURA',
    states: [
      'ARUNACHAL PRADESH',
      'ASSAM',
      'MANIPUR',
      'MEGHALAYA',
      'MIZORAM',
      'NAGALAND',
      'SIKKIM',
      'TRIPURA',
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
