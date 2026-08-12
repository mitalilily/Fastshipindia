import { spawn } from 'child_process'
import { AddressInfo } from 'net'
import http, { IncomingMessage, ServerResponse } from 'http'
import path from 'path'

type MockPayload = Record<string, unknown>

const json = (res: ServerResponse, statusCode: number, payload: MockPayload) => {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const success = (data: MockPayload = {}) => ({ success: true, data })

const resolveMockResponse = (method: string, pathname: string): MockPayload | null => {
  if (method === 'POST' && pathname === '/api/auth/admin/login') {
    return { message: 'Admin login successful', token: 'mock-admin-token' }
  }
  if (method === 'GET' && pathname === '/api/admin/couriers/credentials') {
    return success({
      delhiveryB2B: {
        apiBase: 'https://ltl-clients-api-dev.delhivery.com',
        username: 'mock-delhivery-user',
        hasPassword: true,
        clientId: 'mock-client-id',
        warehouseId: 'mock-warehouse-id',
      },
    })
  }

  const exactRoutes = new Map<string, MockPayload>([
    ['POST /api/delhivery/b2b/auth/password-reset', success({ requested: true })],
    [
      'POST /api/delhivery/b2b/auth/login',
      success({ authenticated: true, expiresAt: '2099-01-01T00:00:00.000Z' }),
    ],
    ['POST /api/delhivery/b2b/auth/logout', success({ loggedOut: true })],
    ['POST /api/delhivery/b2b/freight/estimate', success({ amount: 123.45 })],
    ['POST /api/delhivery/b2b/warehouses', success({ warehouse_id: 'mock-warehouse-id' })],
    ['PATCH /api/delhivery/b2b/warehouses', success({ updated: true })],
    [
      'POST /api/delhivery/b2b/shipments/manifest',
      success({ job_id: 'mock-manifest-job' }),
    ],
    ['POST /api/delhivery/b2b/pickups', success({ pickup_id: 'mock-pickup-id' })],
  ])
  const exact = exactRoutes.get(`${method} ${pathname}`)
  if (exact) return exact

  const routeMatchers: Array<[string, RegExp, MockPayload]> = [
    [
      'GET',
      /^\/api\/delhivery\/b2b\/serviceability\/\d{6}$/,
      success({
        success: true,
        data: { pincode_serviceability_data: [{ pincode: '400093', fm_serviceable: true }] },
      }),
    ],
    ['GET', /^\/api\/delhivery\/b2b\/tat$/, success({ tat_days: 2 })],
    ['GET', /^\/api\/delhivery\/b2b\/freight\/charges$/, success({ charges: [] })],
    [
      'GET',
      /^\/api\/delhivery\/b2b\/shipments\/manifest\/[^/]+$/,
      success({
        lrn: 'mock-lrn',
        waybills: ['mock-box-awb', 'mock-document-awb'],
      }),
    ],
    [
      'PUT',
      /^\/api\/delhivery\/b2b\/shipments\/[^/]+$/,
      success({ job_id: 'mock-update-job' }),
    ],
    [
      'GET',
      /^\/api\/delhivery\/b2b\/shipments\/update\/[^/]+$/,
      success({ job_id: 'mock-update-job', status: 'PENDING' }),
    ],
    [
      'GET',
      /^\/api\/delhivery\/b2b\/shipments\/[^/]+\/tracking$/,
      success({ status: 'IN_TRANSIT' }),
    ],
    [
      'POST',
      /^\/api\/delhivery\/b2b\/shipments\/[^/]+\/appointments$/,
      success({ appointment_id: 'mock-appointment', appointment_slot: '12:00 PM-03:00 PM' }),
    ],
    [
      'DELETE',
      /^\/api\/delhivery\/b2b\/shipments\/[^/]+$/,
      success({ cancelled: true, status: 'Returned' }),
    ],
    [
      'DELETE',
      /^\/api\/delhivery\/b2b\/pickups\/[^/]+$/,
      success({ cancelled: true, pickup_id: 'mock-pickup-id' }),
    ],
    [
      'GET',
      /^\/api\/delhivery\/b2b\/shipments\/[^/]+\/labels\/(sm|md|a4|std)$/,
      success({ urls: ['data:image/png;base64,bW9jay1sYWJlbA=='] }),
    ],
    [
      'GET',
      /^\/api\/delhivery\/b2b\/shipments\/[^/]+\/lr-copy$/,
      success({ url: 'https://example.com/mock-lr-copy.pdf', content_type: 'application/pdf' }),
    ],
    [
      'POST',
      /^\/api\/delhivery\/b2b\/documents\/shipping_label$/,
      success({ job_id: 'mock-shipping-label-job', doc_type: 'shipping_label' }),
    ],
    [
      'POST',
      /^\/api\/delhivery\/b2b\/documents\/lr_copy$/,
      success({ job_id: 'mock-lr-copy-job', doc_type: 'lr_copy' }),
    ],
    [
      'GET',
      /^\/api\/delhivery\/b2b\/documents\/(shipping_label|lr_copy)\/[^/]+$/,
      success({ url: 'https://example.com/mock-document.pdf' }),
    ],
    ['GET', /^\/api\/delhivery\/b2b\/documents$/, success({ documents: [] })],
  ]

  return routeMatchers.find(([expectedMethod, pattern]) =>
    expectedMethod === method && pattern.test(pathname)
  )?.[2] || null
}

const handler = (req: IncomingMessage, res: ServerResponse) => {
  req.on('error', () => json(res, 400, { success: false, message: 'Invalid mock request' }))
  req.resume()
  req.on('end', () => {
    const method = String(req.method || 'GET').toUpperCase()
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname
    const isAdminLogin = method === 'POST' && pathname === '/api/auth/admin/login'
    if (!isAdminLogin && req.headers.authorization !== 'Bearer mock-admin-token') {
      return json(res, 401, { success: false, message: 'Missing FastShip admin token' })
    }

    const payload = resolveMockResponse(method, pathname)
    if (!payload) {
      return json(res, 404, {
        success: false,
        message: `Postman collection called an unrecognized route: ${method} ${pathname}`,
      })
    }
    return json(res, 200, payload)
  })
}

const run = async () => {
  const server = http.createServer(handler)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address() as AddressInfo
  const backendRoot = path.resolve(__dirname, '../..')
  const collection = path.join(backendRoot, 'postman', 'delhivery-b2b.postman_collection.json')
  const environment = path.join(
    backendRoot,
    'postman',
    'delhivery-b2b.local.postman_environment.json',
  )
  const newmanCli = require.resolve('newman/bin/newman.js')

  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          newmanCli,
          'run',
          collection,
          '--environment',
          environment,
          '--env-var',
          `baseUrl=http://127.0.0.1:${address.port}`,
          '--env-var',
          'adminEmail=postman-admin@example.com',
          '--env-var',
          'adminPassword=mock-password',
          '--env-var',
          'allowMutations=true',
          '--env-var',
          'lrn=mock-lrn',
          '--env-var',
          'freightLrns=mock-lrn-1,mock-lrn-2',
          '--env-var',
          'warehouseName=Postman Warehouse 01',
          '--env-var',
          'mwn=mock-mwn',
          '--reporters',
          'cli',
          '--color',
          'off',
          '--disable-unicode',
        ],
        { cwd: backendRoot, stdio: 'inherit' },
      )
      child.once('error', reject)
      child.once('exit', (code) => resolve(code ?? 1))
    })
    if (exitCode !== 0) throw new Error(`Newman exited with code ${exitCode}`)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
