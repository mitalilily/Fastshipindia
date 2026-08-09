import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..', 'dist')
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3000)

const mime = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function resolveRequestPath(requestUrl = '/') {
  const pathname = decodeURIComponent(requestUrl.split('?')[0] || '/')
  const requested = path.resolve(root, `.${pathname}`)
  return requested.startsWith(root) ? requested : root
}

createServer(async (req, res) => {
  let filePath = resolveRequestPath(req.url)

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) filePath = path.join(root, 'index.html')
  } catch {
    filePath = path.join(root, 'index.html')
  }

  try {
    const body = await readFile(filePath)
    res.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
}).listen(port, host, () => {
  console.log(`Admin panel available at http://${host}:${port}/`)
})
