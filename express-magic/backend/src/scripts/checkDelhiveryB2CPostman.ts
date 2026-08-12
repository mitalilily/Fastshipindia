import { spawn } from 'child_process'
import http, { IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'
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

  if (method === 'GET' && /^\/api\/delhivery\/b2c\/serviceability\/\d{6}$/.test(pathname)) {
    return {
      success: true,
      serviceable: true,
      data: {
        delivery_codes: [
          {
            postal_code: {
              pin: 194103,
              remarks: '',
            },
          },
        ],
      },
    }
  }

  if (
    method === 'GET' &&
    /^\/api\/delhivery\/b2c\/heavy-serviceability\/\d{6}$/.test(pathname)
  ) {
    return {
      success: true,
      serviceable: true,
      data: {
        pincode: '400086',
        product_type: 'Heavy',
        payment_type: {
          prepaid: true,
          cod: true,
        },
      },
    }
  }

  if (method === 'GET' && pathname === '/api/delhivery/b2c/tat') {
    return success({
      data: {
        tat: 3,
        expected_delivery_date: '2024-06-03',
      },
    })
  }

  if (method === 'GET' && pathname === '/api/delhivery/b2c/waybills') {
    return success({
      waybills: ['WB000001', 'WB000002', 'WB000003', 'WB000004', 'WB000005'],
    })
  }

  if (method === 'GET' && pathname === '/api/delhivery/b2c/waybill') {
    return success({
      waybill: 'WB-SINGLE-000001',
    })
  }

  if (method === 'GET' && pathname === '/api/delhivery/b2c/shipments/track') {
    return success({
      ShipmentData: [
        {
          Shipment: {
            AWB: '1122345678722',
            Status: {
              Status: 'In Transit',
            },
            Scans: [
              {
                ScanDetail: {
                  Scan: 'Manifested',
                },
              },
            ],
          },
        },
      ],
    })
  }

  if (method === 'GET' && pathname === '/api/delhivery/b2c/shipping-cost') {
    return success({
      total_amount: 55,
      chargeable_weight: 10,
      billing_mode: 'E',
    })
  }

  if (method === 'GET' && pathname === '/api/delhivery/b2c/shipments/label') {
    return success({
      packages: [
        {
          wbn: '703500000001',
          label: 'https://example.com/label-703500000001.pdf',
        },
      ],
    })
  }

  if (method === 'POST' && pathname === '/api/delhivery/b2c/pickup-requests') {
    return success({
      success: true,
      pickup_id: 'PU-B2C-000001',
      message: 'Pickup request created',
    })
  }

  if (method === 'POST' && pathname === '/api/delhivery/b2c/warehouses') {
    return success({
      success: true,
      name: 'test_name',
      message: 'Warehouse created',
    })
  }

  if (method === 'POST' && pathname === '/api/delhivery/b2c/shipments') {
    return success({
      success: true,
      upload_wbn: 'UPLOAD-B2C-000001',
      packages: [{ waybill: 'WB-SHIPMENT-000001', status: 'Success' }],
    })
  }

  if (method === 'POST' && pathname === '/api/delhivery/b2c/shipments/mps') {
    return success({
      success: true,
      upload_wbn: 'UPLOAD-B2C-MPS-000001',
      packages: [
        { waybill: 'WB-MASTER-000001', status: 'Success' },
        { waybill: 'WB-CHILD-000002', status: 'Success' },
      ],
    })
  }

  if (method === 'POST' && pathname === '/api/delhivery/b2c/shipments/edit') {
    return success({
      success: true,
      waybill: '843000000001',
      message: 'Shipment updated',
    })
  }

  if (method === 'POST' && pathname === '/api/delhivery/b2c/shipments/cancel') {
    return success({
      success: true,
      awb_number: '694500000001',
      message: 'Delhivery cancellation accepted',
    })
  }

  if (
    method === 'PUT' &&
    /^\/api\/delhivery\/b2c\/shipments\/[^/]+\/ewaybill$/.test(pathname)
  ) {
    return success({
      success: true,
      waybill: pathname.split('/')[5],
      updated: true,
    })
  }

  return null
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
  const collection = path.join(backendRoot, 'postman', 'delhivery-b2c.postman_collection.json')
  const environment = path.join(
    backendRoot,
    'postman',
    'delhivery-b2c.local.postman_environment.json',
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
