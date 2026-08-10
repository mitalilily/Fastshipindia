import { cpSync, existsSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clientDir = path.join(rootDir, 'express-magic', 'courier-cart-client')
const outputDir = path.join(rootDir, 'dist')
const isWindows = process.platform === 'win32'
const npmCommand = isWindows ? 'npm.cmd' : 'npm'

const run = (cwd, args) => {
  const command = isWindows ? 'cmd.exe' : npmCommand
  const commandArgs = isWindows
    ? ['/d', '/s', '/c', [npmCommand, ...args].join(' ')]
    : args
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error(`${npmCommand} ${args.join(' ')} failed in ${cwd}`)
  }
}

const renderServiceName = String(process.env.RENDER_SERVICE_NAME || '').toLowerCase()
const renderHostname = String(
  process.env.RENDER_EXTERNAL_HOSTNAME || process.env.RENDER_EXTERNAL_URL || '',
).toLowerCase()
const isClientService =
  renderServiceName === 'fastshipindia-1' || renderHostname.includes('fastshipindia-1.onrender.com')

if (isClientService) {
  if (String(process.env.RENDER_SKIP_CLIENT_INSTALL || '').toLowerCase() !== 'true') {
    run(clientDir, ['ci'])
  }
  run(clientDir, ['run', 'build'])

  rmSync(outputDir, { force: true, recursive: true })
  cpSync(path.join(clientDir, 'dist'), outputDir, { recursive: true })

  if (!existsSync(path.join(outputDir, 'index.html'))) {
    throw new Error('Client panel build did not create dist/index.html')
  }

  console.log(`Client panel prepared for Render service ${renderServiceName || renderHostname}`)
} else {
  run(rootDir, ['run', 'build:landing'])
}
