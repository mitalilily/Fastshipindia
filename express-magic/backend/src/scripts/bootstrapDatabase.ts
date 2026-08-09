import * as dotenv from 'dotenv'
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

  try {
    run(process.execPath, [path.join(backendRoot, 'dist/scripts/ensureAdmin.js')])
  } catch (error) {
    // Do not keep the API offline because optional admin profile seeding
    // failed. Admin login can repair the configured seed account on demand.
    console.warn('Admin seed failed during startup; continuing with API startup.', error)
  }
}

bootstrapDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database bootstrap failed:', error)
    process.exit(1)
  })
