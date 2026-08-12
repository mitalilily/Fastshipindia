import { spawn } from 'child_process'
import * as dotenv from 'dotenv'
import path from 'path'
import { server } from './app'
import { getMissingStorageConfiguration } from './utils/functions'

const env = process.env.NODE_ENV || 'development'
console.log('node env', env)

dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) })

const PORT = process.env.PORT || 4000

const startDatabaseBootstrap = () => {
  const bootstrapPath = path.join(__dirname, 'scripts', 'bootstrapDatabase.js')
  const bootstrap = spawn(process.execPath, [bootstrapPath], {
    env: process.env,
    stdio: 'inherit',
  })

  bootstrap.on('error', (error) => {
    console.error('Database bootstrap process failed to start:', error)
  })

  bootstrap.on('exit', (code) => {
    if (code === 0) {
      console.log('Database bootstrap completed')
    } else {
      console.warn(`Database bootstrap exited with code ${code}; API remains available`)
    }
  })
}

const startBackgroundJobs = () => {
  setTimeout(() => {
    import('./crons')
      .then(() => {
        console.log('Background jobs scheduled')
      })
      .catch((error) => {
        console.error('Background jobs failed to initialize:', error)
      })
  }, Number(process.env.BACKGROUND_JOBS_START_DELAY_MS || 5000))
}

function startServer() {
  const missingStorageConfiguration = getMissingStorageConfiguration()
  if (missingStorageConfiguration.length) {
    console.warn(
      `Object storage uploads are disabled until these environment variables are configured: ${missingStorageConfiguration.join(', ')}`,
    )
  }

  // Keep support for slower courier API calls without blocking server startup.
  server.timeout = 210000

  server.listen(PORT, () => {
    const url =
      env === 'production'
        ? process.env.API_URL || process.env.API_PUBLIC_URL || 'https://api.fastship.in'
        : `http://localhost:${PORT}`

    console.log(`Server running on port ${PORT} in ${env} mode at ${url}`)
    startDatabaseBootstrap()
    startBackgroundJobs()
  })
}

startServer()
