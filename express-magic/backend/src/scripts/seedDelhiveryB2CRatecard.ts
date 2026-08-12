import { randomUUID } from 'crypto'
import { Pool, PoolClient } from 'pg'
import { resolveDatabaseUrl } from '../config/databaseUrl'

const BASIC_PLAN_NAME = 'Basic'
const COD_FLAT_CHARGE = 40
const COD_PERCENT = 2.2

type CourierSeed = {
  id: number
  name: string
  mode: 'Express' | 'Surface'
  zones: Record<string, number>
}

type ZoneSeed = {
  code: string
  name: string
  description: string
  region: string
}

// These base prices come from the repository's existing Delhivery tariff data.
// Each later band is the corresponding multiple of the 500 g price.
const courierSeeds: CourierSeed[] = [
  {
    id: 99,
    name: 'Delhivery Express',
    mode: 'Express',
    zones: { ROI: 32.7 },
  },
  {
    id: 100,
    name: 'Delhivery Surface',
    mode: 'Surface',
    zones: {
      KASHMIR: 38.1,
      METRO_TO_METRO: 27.2,
      ROI: 32.7,
      WITHIN_REGION: 34.5,
    },
  },
]

const zoneSeeds: ZoneSeed[] = [
  {
    code: 'KASHMIR',
    name: 'Kashmir',
    description: 'Shipments to Jammu and Kashmir and Ladakh.',
    region: 'Kashmir',
  },
  {
    code: 'METRO_TO_METRO',
    name: 'Metro to Metro',
    description: 'Shipments moving between major metro cities.',
    region: 'Metro to Metro',
  },
  {
    code: 'ROI',
    name: 'Rest of India',
    description: 'Shipments outside the dedicated city, state, region, and special zones.',
    region: 'Rest of India',
  },
  {
    code: 'SPECIAL_ZONE',
    name: 'Special Zone',
    description: 'Locations requiring special routing or handling.',
    region: 'Special Zone',
  },
  {
    code: 'WITHIN_CITY',
    name: 'Within City',
    description: 'Pickup and delivery within the same city.',
    region: 'Within City',
  },
  {
    code: 'WITHIN_REGION',
    name: 'Within Region',
    description: 'Pickup and delivery within the same regional lane.',
    region: 'Within Region',
  },
  {
    code: 'WITHIN_STATE',
    name: 'Within State',
    description: 'Pickup and delivery within the same state.',
    region: 'Within State',
  },
]

const slabBands = [
  { from: 0.1, to: 0.5, multiplier: 1 },
  { from: 0.5, to: 1, multiplier: 2 },
  { from: 1, to: 2, multiplier: 4 },
  { from: 2, to: 3, multiplier: 6 },
  { from: 3, to: 4, multiplier: 8 },
  { from: 4, to: 5, multiplier: 10 },
]

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

const ensureBasicPlan = async (client: PoolClient) => {
  const existing = await client.query(
    `select id from plans where lower(name) = lower($1) order by created_at limit 1`,
    [BASIC_PLAN_NAME],
  )
  if (existing.rows[0]?.id) return String(existing.rows[0].id)

  const id = randomUUID()
  await client.query(
    `insert into plans (id, name, description, is_active, created_at)
     values ($1, $2, 'Default B2C plan', true, now())`,
    [id, BASIC_PLAN_NAME],
  )
  return id
}

const ensureCouriers = async (client: PoolClient) => {
  for (const courier of courierSeeds) {
    await client.query(
      `insert into couriers
        (id, name, "serviceProvider", "isEnabled", business_type, created_at, updated_at)
       values ($1, $2, 'delhivery', true, '["b2c"]'::jsonb, now(), now())
       on conflict (id, "serviceProvider") do update set
         name = excluded.name,
         "isEnabled" = true,
         business_type = case
           when couriers.business_type @> '["b2c"]'::jsonb then couriers.business_type
           else coalesce(couriers.business_type, '[]'::jsonb) || '["b2c"]'::jsonb
         end,
         updated_at = now()`,
      [courier.id, courier.name],
    )
  }
}

const ensureZones = async (client: PoolClient, zonesTable: string) => {
  const zoneIds = new Map<string, string>()

  for (const zone of zoneSeeds) {
    const existing = await client.query(
      `select id from ${zonesTable}
       where upper(business_type) = 'B2C' and upper(code) = upper($1) limit 1`,
      [zone.code],
    )

    if (existing.rows[0]?.id) {
      const id = String(existing.rows[0].id)
      await client.query(
        `update ${zonesTable}
         set name = $1, description = $2, region = $3, updated_at = now()
         where id = $4`,
        [zone.name, zone.description, zone.region, id],
      )
      zoneIds.set(zone.code, id)
      continue
    }

    const id = randomUUID()
    await client.query(
      `insert into ${zonesTable}
        (id, code, name, description, region, business_type, metadata, states, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'B2C', '{}'::jsonb, '[]'::jsonb, now(), now())`,
      [id, zone.code, zone.name, zone.description, zone.region],
    )
    zoneIds.set(zone.code, id)
  }

  return zoneIds
}

const ensureRate = async (
  client: PoolClient,
  planId: string,
  courier: CourierSeed,
  zoneId: string,
  baseRate: number,
) => {
  const existing = await client.query(
    `select id from shipping_rates
     where plan_id = $1
       and courier_id = $2
       and business_type = 'b2c'
       and zone_id = $3
       and type = 'forward'
       and lower(coalesce(service_provider, '')) = 'delhivery'
       and lower(mode) = lower($4)
     order by created_at, id limit 1`,
    [planId, courier.id, zoneId, courier.mode],
  )

  if (existing.rows[0]?.id) {
    await client.query(
      `update shipping_rates
       set courier_name = $1,
           service_provider = 'delhivery',
           cod_charges = $2,
           cod_percent = $3,
           other_charges = 0,
           last_updated = now()
       where id = $4`,
      [courier.name, COD_FLAT_CHARGE, COD_PERCENT, existing.rows[0].id],
    )
    return { rateId: String(existing.rows[0].id), inserted: false }
  }

  const rateId = randomUUID()
  await client.query(
    `insert into shipping_rates
      (id, plan_id, service_provider, cod_charges, cod_percent, other_charges, rate,
       last_updated, courier_id, courier_name, mode, business_type, min_weight,
       zone_id, type, created_at)
     values ($1, $2, 'delhivery', $3, $4, 0, $5, now(), $6, $7, $8,
       'b2c', 0.1, $9, 'forward', now())`,
    [
      rateId,
      planId,
      COD_FLAT_CHARGE,
      COD_PERCENT,
      baseRate,
      courier.id,
      courier.name,
      courier.mode,
      zoneId,
    ],
  )
  return { rateId, inserted: true }
}

const ensureSlabs = async (
  client: PoolClient,
  rateId: string,
  baseRate: number,
  rateWasInserted: boolean,
) => {
  if (!rateWasInserted) {
    const count = await client.query(
      `select count(*)::int as count from shipping_rate_slabs where shipping_rate_id = $1`,
      [rateId],
    )
    if (Number(count.rows[0]?.count || 0) > 0) return false
  }

  for (const slab of slabBands) {
    await client.query(
      `insert into shipping_rate_slabs
        (id, shipping_rate_id, weight_from, weight_to, rate, extra_rate,
         extra_weight_unit, created_at, updated_at)
       values ($1, $2, $3, $4, $5, null, null, now(), now())`,
      [
        randomUUID(),
        rateId,
        slab.from,
        slab.to,
        Number((baseRate * slab.multiplier).toFixed(2)),
      ],
    )
  }
  return true
}

async function main() {
  const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
  const client = await pool.connect()

  try {
    await client.query('begin')
    const zonesTable = await resolveZonesTable(client)
    const planId = await ensureBasicPlan(client)
    await ensureCouriers(client)
    const zoneIds = await ensureZones(client, zonesTable)

    let insertedRates = 0
    let insertedSlabSets = 0
    for (const courier of courierSeeds) {
      for (const [zoneCode, baseRate] of Object.entries(courier.zones)) {
        const zoneId = zoneIds.get(zoneCode)
        if (!zoneId) throw new Error(`Missing B2C zone ${zoneCode}`)
        const rate = await ensureRate(client, planId, courier, zoneId, baseRate)
        if (rate.inserted) insertedRates += 1
        if (await ensureSlabs(client, rate.rateId, baseRate, rate.inserted)) insertedSlabSets += 1
      }
    }

    await client.query('commit')
    console.log('Delhivery B2C rate card ensured', {
      planId,
      couriers: courierSeeds.length,
      zones: zoneSeeds.length,
      insertedRates,
      insertedSlabSets,
    })
  } catch (error) {
    await client.query('rollback').catch(() => undefined)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Failed to ensure Delhivery B2C rate card:', error)
  process.exit(1)
})
