import { Pool } from 'pg'
import { resolveDatabaseUrl } from '../config/databaseUrl'
import {
  DELHIVERY_B2B_COURIER_ID,
  DELHIVERY_COURIER_IDS,
} from '../utils/delhiveryCourier'

const courierSeeds = [
  {
    id: DELHIVERY_COURIER_IDS.EXPRESS,
    name: 'Delhivery Express',
    businessType: 'b2c',
  },
  {
    id: DELHIVERY_COURIER_IDS.SURFACE,
    name: 'Delhivery Surface',
    businessType: 'b2c',
  },
  {
    id: DELHIVERY_B2B_COURIER_ID,
    name: 'Delhivery B2B (LTL)',
    businessType: 'b2b',
  },
] as const

export async function seedDelhiveryCouriers() {
  const pool = new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    for (const courier of courierSeeds) {
      await pool.query(
        `insert into couriers
          (id, name, "serviceProvider", "isEnabled", business_type, created_at, updated_at)
         values ($1, $2, 'delhivery', true, jsonb_build_array($3::text), now(), now())
         on conflict (id, "serviceProvider") do update set
           name = excluded.name,
           "isEnabled" = true,
           business_type = excluded.business_type,
           updated_at = now()`,
        [courier.id, courier.name, courier.businessType],
      )
    }

    console.log('Delhivery courier catalog seeded: 2 B2C services and 1 B2B/LTL service')
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  seedDelhiveryCouriers().catch((error) => {
    console.error('Failed to seed Delhivery courier catalog:', error)
    process.exit(1)
  })
}
