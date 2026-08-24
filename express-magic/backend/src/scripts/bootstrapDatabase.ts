import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { Pool } from 'pg'
import { resolveDatabaseUrl } from '../config/databaseUrl'

const env = process.env.NODE_ENV || 'development'
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) })

const backendRoot = path.resolve(__dirname, '../..')
const databaseUrl = resolveDatabaseUrl()
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
  }
}

const usersTableExists = async () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: env === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    const result = await pool.query("select to_regclass('public.users') as table_name")
    return Boolean(result.rows[0]?.table_name)
  } finally {
    await pool.end()
  }
}

const ensureSupportTicketMessagesTable = async () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: env === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    const migrationPath = path.join(backendRoot, 'migration_add_support_ticket_messages.sql')
    await pool.query(fs.readFileSync(migrationPath, 'utf8'))
    console.log('Support ticket conversation schema is ready')
  } finally {
    await pool.end()
  }
}

const ensureLocationsTableShape = async () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: env === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    const tableResult = await pool.query(
      "select to_regclass('public.shiplifi_locations') as table_name",
    )
    if (!tableResult.rows[0]?.table_name) return

    const migrationPath = path.join(backendRoot, 'migration_add_active_to_locations.sql')
    await pool.query(fs.readFileSync(migrationPath, 'utf8'))
    console.log('Serviceability locations schema is ready')
  } finally {
    await pool.end()
  }
}

async function bootstrapDatabase() {
  const hasUsersTable = await usersTableExists()

  if (!hasUsersTable) {
    if (String(process.env.AUTO_MIGRATE_ON_START || 'true').toLowerCase() === 'false') {
      console.warn('Database schema is missing, but AUTO_MIGRATE_ON_START=false. Skipping schema bootstrap.')
    } else {
      console.log('Database schema is missing. Running drizzle schema push before startup...')
      run(npmCommand, ['run', 'migrate'])
    }
  }

  if (hasUsersTable) {
    await ensureSupportTicketMessagesTable()
    await ensureLocationsTableShape()
  }

  try {
    run(process.execPath, [path.join(backendRoot, 'dist/scripts/ensureAdmin.js')])
  } catch (error) {
    // Do not keep the API offline because optional admin profile seeding
    // failed. Admin login can repair the configured seed account on demand.
    console.warn('Admin seed failed during startup; continuing with API startup.', error)
  }

  try {
    run(process.execPath, [path.join(backendRoot, 'dist/scripts/seedDelhiveryB2CRatecard.js')])
  } catch (error) {
    // Rate-card provisioning is recoverable through the admin UI. Keep the API
    // available if an older database needs manual schema repair.
    console.warn('Delhivery B2C rate-card seed failed during startup; continuing.', error)
  }

  try {
    run(process.execPath, [path.join(backendRoot, 'dist/scripts/seedDelhiveryCouriers.js')])
  } catch (error) {
    // Keep startup available if an older database needs manual courier-table repair.
    console.warn('Delhivery courier catalog seed failed during startup; continuing.', error)
  }

  try {
    run(process.execPath, [path.join(backendRoot, 'dist/scripts/seedLocations.js')])
  } catch (error) {
    // The serviceability screen needs the pincode master, but API startup should
    // continue so admins can still add locations manually if the seed file is unavailable.
    console.warn('Serviceability pincode seed failed during startup; continuing.', error)
  }

  try {
    run(process.execPath, [path.join(backendRoot, 'dist/scripts/seedB2BZones.js')])
  } catch (error) {
    // Zone catalog entries can still be managed from the admin panel. Do not
    // keep the API offline when an older database needs manual schema repair.
    console.warn('B2B zone catalog seed failed during startup; continuing.', error)
  }
}

bootstrapDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database bootstrap failed:', error)
    process.exit(1)
  })
