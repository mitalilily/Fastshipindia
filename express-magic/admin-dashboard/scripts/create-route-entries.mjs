import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = path.join(adminRoot, 'build')
const indexFile = path.join(buildDir, 'index.html')
const routesFile = path.join(adminRoot, 'src', 'routes.js')

if (!existsSync(indexFile)) {
  throw new Error('Admin build is missing build/index.html')
}

const routePaths = new Set([
  '/login',
  '/auth',
  '/auth/signin',
  '/admin',
  '/admin/dashboard',
  '/rtl',
])

let pendingPath = null
for (const sourceLine of readFileSync(routesFile, 'utf8').split(/\r?\n/)) {
  const line = sourceLine.trim()
  if (!line || line.startsWith('//')) continue

  const pathMatch = line.match(/^path:\s*["']([^"']+)["']/)
  if (pathMatch) {
    pendingPath = pathMatch[1]
    continue
  }

  const layoutMatch = line.match(/^layout:\s*["']([^"']+)["']/)
  if (!layoutMatch || !pendingPath) continue

  const routePath = `${layoutMatch[1]}${pendingPath}`.replace(/\/{2,}/g, '/')
  if (!routePath.includes(':')) routePaths.add(routePath)
  pendingPath = null
}

for (const routePath of routePaths) {
  const relativeRoute = routePath.replace(/^\/+|\/+$/g, '')
  if (!relativeRoute) continue

  const routeDir = path.join(buildDir, ...relativeRoute.split('/'))
  mkdirSync(routeDir, { recursive: true })
  copyFileSync(indexFile, path.join(routeDir, 'index.html'))
}

// Render serves this file for unmatched static paths, covering dynamic admin routes.
copyFileSync(indexFile, path.join(buildDir, '404.html'))

console.log(`Created ${routePaths.size} admin SPA route entries and build/404.html`)
