import assert from 'assert/strict'
import axios from 'axios'

type CapturedRequest = {
  headers?: Record<string, string>
  params?: Record<string, string>
  timeout?: number
}

const run = async () => {
  process.env.DATABASE_URL ||= 'postgres://fastship:fastship@localhost:5432/fastship_check'
  const {
    DelhiveryService,
    isDelhiveryB2CHeavyPincodeServiceable,
    isDelhiveryB2CPincodeServiceable,
  } = await import('../models/services/couriers/delhivery.service')
  const requests: Array<{ method: string; url: string; headers?: any; params?: any }> = []
  const originalGet = axios.get

  ;(axios as any).get = async (url: string, config?: CapturedRequest) => {
    requests.push({ method: 'GET', url, headers: config?.headers, params: config?.params })
    if (String(url).endsWith('/api/dc/fetch/serviceability/pincode')) {
      return {
        status: 200,
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
    if (String(url).endsWith('/api/dc/expected_tat')) {
      return {
        status: 200,
        data: {
          data: {
            tat: 3,
            expected_delivery_date: '2024-06-03',
          },
        },
      }
    }
    if (String(url).endsWith('/waybill/api/bulk/json/')) {
      return {
        status: 200,
        data: {
          waybills: ['WB000001', 'WB000002', 'WB000003', 'WB000004', 'WB000005'],
        },
      }
    }
    if (String(url).endsWith('/waybill/api/fetch/json/')) {
      return {
        status: 200,
        data: {
          waybill: 'WB-SINGLE-000001',
        },
      }
    }

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

    const heavyResponse = await service.checkHeavyProductTypeServiceability('400086')
    assert.equal(isDelhiveryB2CHeavyPincodeServiceable(heavyResponse), true)

    const heavyRequest = requests.at(-1)
    assert.equal(heavyRequest?.method, 'GET')
    assert.equal(
      heavyRequest?.url,
      'https://staging-express.delhivery.com/api/dc/fetch/serviceability/pincode',
    )
    assert.deepEqual(heavyRequest?.params, { product_type: 'Heavy', pincode: '400086' })
    assert.equal(heavyRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(heavyRequest?.headers?.Accept, 'application/json')

    assert.equal(isDelhiveryB2CHeavyPincodeServiceable({ status: 'NSZ' }), false)
    assert.equal(isDelhiveryB2CHeavyPincodeServiceable({ payment_type: { prepaid: false } }), false)

    await assert.rejects(
      () => service.checkHeavyProductTypeServiceability('40008'),
      /valid 6-digit pincode/,
    )
    await assert.rejects(
      () => service.checkHeavyProductTypeServiceability('40008A'),
      /valid 6-digit pincode/,
    )

    const tatResponse = await service.getB2CExpectedTAT({
      origin_pin: '122003',
      destination_pin: '136118',
      mot: 'S',
      pdt: 'B2C',
      expected_pickup_date: '2024-05-31',
    })
    assert.equal((tatResponse as any)?.data?.tat, 3)

    const tatRequest = requests.at(-1)
    assert.equal(tatRequest?.method, 'GET')
    assert.equal(tatRequest?.url, 'https://staging-express.delhivery.com/api/dc/expected_tat')
    assert.deepEqual(tatRequest?.params, {
      origin_pin: '122003',
      destination_pin: '136118',
      mot: 'S',
      pdt: 'B2C',
      expected_pickup_date: '2024-05-31',
    })
    assert.equal(tatRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(tatRequest?.headers?.Accept, 'application/json')
    assert.equal(tatRequest?.headers?.['Content-Type'], 'application/json')

    await service.getB2CExpectedTAT({
      origin_pin: '122003',
      destination_pin: '136118',
      mot: 'N',
      pdt: '',
    })
    const tatWithoutOptionalRequest = requests.at(-1)
    assert.deepEqual(tatWithoutOptionalRequest?.params, {
      origin_pin: '122003',
      destination_pin: '136118',
      mot: 'N',
    })

    await assert.rejects(
      () => service.getB2CExpectedTAT({ origin_pin: '12200', destination_pin: '136118', mot: 'S' }),
      /origin_pin must be a valid 6-digit pincode/,
    )
    await assert.rejects(
      () => service.getB2CExpectedTAT({ origin_pin: '122003', destination_pin: '13611A', mot: 'S' }),
      /destination_pin must be a valid 6-digit pincode/,
    )
    await assert.rejects(
      () => service.getB2CExpectedTAT({ origin_pin: '122003', destination_pin: '136118', mot: 'X' }),
      /mot must be one of/,
    )
    await assert.rejects(
      () =>
        service.getB2CExpectedTAT({
          origin_pin: '122003',
          destination_pin: '136118',
          mot: 'S',
          expected_pickup_date: '31-05-2024',
        }),
      /expected_pickup_date/,
    )

    const waybillResponse = await service.fetchB2CBulkWaybills(5)
    assert.deepEqual((waybillResponse as any)?.waybills, [
      'WB000001',
      'WB000002',
      'WB000003',
      'WB000004',
      'WB000005',
    ])

    const waybillRequest = requests.at(-1)
    assert.equal(waybillRequest?.method, 'GET')
    assert.equal(
      waybillRequest?.url,
      'https://staging-express.delhivery.com/waybill/api/bulk/json/',
    )
    assert.deepEqual(waybillRequest?.params, {
      token: 'test-delhivery-token',
      count: 5,
    })
    assert.equal(waybillRequest?.headers?.Accept, 'application/json')
    assert.equal(waybillRequest?.headers?.Authorization, undefined)

    await assert.rejects(() => service.fetchB2CBulkWaybills(undefined), /count must be an integer/)
    await assert.rejects(() => service.fetchB2CBulkWaybills(0), /count must be an integer/)
    await assert.rejects(() => service.fetchB2CBulkWaybills(10001), /count must be an integer/)
    await assert.rejects(() => service.fetchB2CBulkWaybills(1.5), /count must be an integer/)

    const singleWaybillResponse = await service.fetchB2CSingleWaybill()
    assert.equal((singleWaybillResponse as any)?.waybill, 'WB-SINGLE-000001')

    const singleWaybillRequest = requests.at(-1)
    assert.equal(singleWaybillRequest?.method, 'GET')
    assert.equal(
      singleWaybillRequest?.url,
      'https://staging-express.delhivery.com/waybill/api/fetch/json/',
    )
    assert.deepEqual(singleWaybillRequest?.params, {
      token: 'test-delhivery-token',
    })
    assert.equal(singleWaybillRequest?.headers?.Accept, 'application/json')
    assert.equal(singleWaybillRequest?.headers?.Authorization, undefined)

    console.log(`Delhivery B2C API contract checks passed (${requests.length} requests).`)
  } finally {
    ;(axios as any).get = originalGet
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
