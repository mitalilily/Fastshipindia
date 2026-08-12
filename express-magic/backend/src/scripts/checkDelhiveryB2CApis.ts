import assert from 'assert/strict'
import axios from 'axios'

type CapturedRequest = {
  headers?: Record<string, string>
  params?: Record<string, string>
  timeout?: number
}

const run = async () => {
  process.env.DATABASE_URL ||= 'postgres://fastship:fastship@localhost:5432/fastship_check'
  const { DelhiveryService, isDelhiveryB2CPincodeServiceable } = await import(
    '../models/services/couriers/delhivery.service'
  )
  const requests: Array<{ method: string; url: string; headers?: any; params?: any }> = []
  const originalGet = axios.get

  ;(axios as any).get = async (url: string, config?: CapturedRequest) => {
    requests.push({ method: 'GET', url, headers: config?.headers, params: config?.params })
    return {
      status: 200,
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

  try {
    const service = new DelhiveryService()
    ;(service as any).ensureCredentials = async () => {
      ;(service as any).apiBase = 'https://staging-express.delhivery.com'
      ;(service as any).token = 'test-delhivery-token'
      ;(service as any).clientName = 'Test Client'
    }

    const response = await service.checkServiceability('194103')
    assert.equal(isDelhiveryB2CPincodeServiceable(response), true)

    const request = requests.at(-1)
    assert.equal(request?.method, 'GET')
    assert.equal(request?.url, 'https://staging-express.delhivery.com/c/api/pin-codes/json/')
    assert.deepEqual(request?.params, { filter_codes: '194103' })
    assert.equal(request?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(request?.headers?.Accept, 'application/json')
    assert.equal(request?.headers?.['Content-Type'], 'application/json')

    assert.equal(isDelhiveryB2CPincodeServiceable({ delivery_codes: [] }), false)
    assert.equal(
      isDelhiveryB2CPincodeServiceable({
        delivery_codes: [{ postal_code: { pin: 194103, remarks: 'Embargo' } }],
      }),
      false,
    )

    await assert.rejects(() => service.checkServiceability('19410'), /valid 6-digit pincode/)
    await assert.rejects(() => service.checkServiceability('19410A'), /valid 6-digit pincode/)

    console.log(`Delhivery B2C API contract checks passed (${requests.length} requests).`)
  } finally {
    ;(axios as any).get = originalGet
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
