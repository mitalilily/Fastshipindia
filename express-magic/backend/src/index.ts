import { spawn } from 'child_process'
import * as dotenv from 'dotenv'
import path from 'path'
import { server } from './app'
import './crons'
import { testDatabaseConnection } from './models/client'

const env = process.env.NODE_ENV || 'development'
console.log('node env', env)

dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) })

const PORT = process.env.PORT || 4000
const MAX_DATABASE_ATTEMPTS = 6
const DATABASE_RETRY_DELAY_MS = 30000
let databaseBootstrapStarted = false

const startDatabaseBootstrap = () => {
  if (databaseBootstrapStarted) return
  databaseBootstrapStarted = true

  const bootstrapPath = path.resolve(__dirname, 'scripts/bootstrapDatabase.js')
  const child = spawn(process.execPath, [bootstrapPath], {
    env: process.env,
    stdio: 'inherit',
  })

  child.on('error', (error) => {
    console.error('Database bootstrap process failed to start:', error)
  })
  child.on('exit', (code) => {
    if (code === 0) {
      console.log('Database bootstrap completed.')
    } else {
      console.warn(`Database bootstrap exited with code ${code ?? 'unknown'}. API remains online.`)
    }
  })
}

const prepareDatabase = async (attempt = 1): Promise<void> => {
  console.log(`Testing database connection (attempt ${attempt}/${MAX_DATABASE_ATTEMPTS})...`)
  const dbConnected = await testDatabaseConnection()

  if (dbConnected) {
    startDatabaseBootstrap()
    return
  }

  if (attempt >= MAX_DATABASE_ATTEMPTS) {
    console.error('Database is unavailable after startup retries. API health remains online.')
    return
  }

  setTimeout(() => {
    void prepareDatabase(attempt + 1)
  }, DATABASE_RETRY_DELAY_MS)
}

function startServer() {
  // Keep enough headroom for slower courier APIs without blocking service startup.
  server.timeout = 210000

  server.listen(PORT, () => {
    const url =
      env === 'production'
        ? process.env.API_URL || process.env.API_PUBLIC_URL || 'https://api.fastship.in'
        : `http://localhost:${PORT}`
    console.log(`Server running on port ${PORT} in ${env} mode at ${url}`)

    // Render health checks can succeed while database startup happens in the background.
    void prepareDatabase()
  })
}

startServer()
