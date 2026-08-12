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
  const requests: Array<{ method: string; url: string; headers?: any; params?: any; data?: any }> =
    []
  const originalGet = axios.get
  const originalPost = axios.post

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

  ;(axios as any).post = async (url: string, data?: unknown, config?: CapturedRequest) => {
    requests.push({ method: 'POST', url, data, headers: config?.headers, params: config?.params })
    return {
      status: 200,
      data: {
        success: true,
        upload_wbn: 'UPLOAD-B2C-000001',
        packages: [{ waybill: 'WB-SHIPMENT-000001', status: 'Success' }],
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

    const shipmentResponse = await service.createB2CShipmentManifest({
      shipments: [
        {
          name: 'Consignee name',
          add: 'Huda Market, Haryana',
          pin: '110042',
          city: 'Gurugram',
          state: 'Haryana',
          country: 'India',
          phone: '9999999999',
          order: 'B2C-CONTRACT-ORDER-1',
          payment_mode: 'prepaid',
          products_desc: 'Test product',
          shipment_width: '100',
          shipment_height: '100',
          shipping_mode: 'Surface',
        },
      ],
      pickup_location: {
        name: 'warehouse_name',
      },
    })
    assert.equal((shipmentResponse as any)?.upload_wbn, 'UPLOAD-B2C-000001')

    const shipmentRequest = requests.at(-1)
    assert.equal(shipmentRequest?.method, 'POST')
    assert.equal(
      shipmentRequest?.url,
      'https://staging-express.delhivery.com/api/cmu/create.json',
    )
    assert.equal(shipmentRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(shipmentRequest?.headers?.Accept, 'application/json')
    assert.equal(shipmentRequest?.headers?.['Content-Type'], 'application/x-www-form-urlencoded')

    const form = new URLSearchParams(String(shipmentRequest?.data || ''))
    assert.equal(form.get('format'), 'json')
    const manifest = JSON.parse(String(form.get('data') || '{}'))
    assert.equal(manifest.pickup_location?.name, 'warehouse_name')
    assert.equal(manifest.shipments?.[0]?.name, 'Consignee name')
    assert.equal(manifest.shipments?.[0]?.order, 'B2C-CONTRACT-ORDER-1')
    assert.equal(manifest.shipments?.[0]?.phone, '9999999999')
    assert.equal(manifest.shipments?.[0]?.add, 'Huda Market, Haryana')
    assert.equal(manifest.shipments?.[0]?.pin, '110042')
    assert.equal(manifest.shipments?.[0]?.payment_mode, 'Prepaid')

    const mpsResponse = await service.createB2CMpsShipmentManifest({
      pickup_location: { name: 'warehouse_name' },
      shipments: [
        {
          order: 'MPS-ORDER-1',
          weight: '100',
          mps_amount: '0',
          mps_children: '2',
          pin: '122002',
          products_desc: 'Toys, ToyCar',
          add: 'Test Address',
          shipment_type: 'MPS',
          state: 'TAMIL NADU',
          master_id: 'WB-MASTER-000001',
          city: 'CHENNAI',
          waybill: 'WB-MASTER-000001',
          phone: '9999888800',
          payment_mode: 'Prepaid',
          name: 'Test Name',
          total_amount: '4250',
          country: 'India',
        },
        {
          order: 'MPS-ORDER-1',
          weight: '100',
          mps_amount: '0',
          mps_children: '2',
          pin: '600063',
          products_desc: 'Toy box 2',
          add: 'Consignee Address',
          shipment_type: 'MPS',
          state: 'TAMIL NADU',
          master_id: 'WB-MASTER-000001',
          city: 'CHENNAI',
          waybill: 'WB-CHILD-000002',
          phone: '9999888800',
          payment_mode: 'Prepaid',
          name: 'Consignee Name',
          total_amount: '4250',
          country: 'India',
        },
      ],
    })
    assert.equal((mpsResponse as any)?.upload_wbn, 'UPLOAD-B2C-000001')

    const mpsRequest = requests.at(-1)
    assert.equal(mpsRequest?.method, 'POST')
    assert.equal(mpsRequest?.url, 'https://staging-express.delhivery.com/api/cmu/create.json')
    const mpsForm = new URLSearchParams(String(mpsRequest?.data || ''))
    assert.equal(mpsForm.get('format'), 'json')
    const mpsManifest = JSON.parse(String(mpsForm.get('data') || '{}'))
    assert.equal(mpsManifest.pickup_location?.name, 'warehouse_name')
    assert.equal(mpsManifest.shipments?.length, 2)
    assert.equal(mpsManifest.shipments?.[0]?.shipment_type, 'MPS')
    assert.equal(mpsManifest.shipments?.[0]?.mps_amount, '0')
    assert.equal(mpsManifest.shipments?.[0]?.mps_children, '2')
    assert.equal(mpsManifest.shipments?.[0]?.master_id, 'WB-MASTER-000001')
    assert.equal(mpsManifest.shipments?.[0]?.waybill, 'WB-MASTER-000001')
    assert.equal(mpsManifest.shipments?.[1]?.master_id, 'WB-MASTER-000001')
    assert.equal(mpsManifest.shipments?.[1]?.waybill, 'WB-CHILD-000002')

    await assert.rejects(
      () =>
        service.createB2CMpsShipmentManifest({
          pickup_location: { name: 'warehouse_name' },
          shipments: [
            {
              order: 'single-box',
              name: 'Name',
              phone: '9999888800',
              add: 'Address',
              pin: '122002',
              payment_mode: 'Prepaid',
              mps_amount: '0',
              mps_children: '1',
              master_id: 'WB-MASTER-ONLY',
              waybill: 'WB-MASTER-ONLY',
            },
          ],
        }),
      /at least two boxes/,
    )
    await assert.rejects(
      () =>
        service.createB2CMpsShipmentManifest({
          pickup_location: { name: 'warehouse_name' },
          shipments: [
            {
              order: 'missing-waybill',
              name: 'Name',
              phone: '9999888800',
              add: 'Address',
              pin: '122002',
              payment_mode: 'Prepaid',
              mps_amount: '0',
              mps_children: '2',
              master_id: 'WB-MASTER-000001',
            },
            {
              order: 'missing-waybill',
              name: 'Name',
              phone: '9999888800',
              add: 'Address',
              pin: '122002',
              payment_mode: 'Prepaid',
              mps_amount: '0',
              mps_children: '2',
              master_id: 'WB-MASTER-000001',
              waybill: 'WB-CHILD-000002',
            },
          ],
        }),
      /waybill is required/,
    )
    await assert.rejects(
      () =>
        service.createB2CMpsShipmentManifest({
          pickup_location: { name: 'warehouse_name' },
          shipments: [
            {
              order: 'wrong-children',
              name: 'Name',
              phone: '9999888800',
              add: 'Address',
              pin: '122002',
              payment_mode: 'Prepaid',
              mps_amount: '0',
              mps_children: '3',
              master_id: 'WB-MASTER-000001',
              waybill: 'WB-MASTER-000001',
            },
            {
              order: 'wrong-children',
              name: 'Name',
              phone: '9999888800',
              add: 'Address',
              pin: '122002',
              payment_mode: 'Prepaid',
              mps_amount: '0',
              mps_children: '3',
              master_id: 'WB-MASTER-000001',
              waybill: 'WB-CHILD-000002',
            },
          ],
        }),
      /mps_children must equal/,
    )

    await assert.rejects(() => service.createB2CShipmentManifest({}), /shipments/)
    await assert.rejects(
      () =>
        service.createB2CShipmentManifest({
          shipments: [{ order: 'missing-name', phone: '9999999999', add: 'Address', pin: '110042', payment_mode: 'Prepaid' }],
          pickup_location: { name: 'warehouse_name' },
        }),
      /name is required/,
    )
    await assert.rejects(
      () =>
        service.createB2CShipmentManifest({
          shipments: [{ name: 'Name', order: 'bad-pin', phone: '9999999999', add: 'Address', pin: '11004', payment_mode: 'Prepaid' }],
          pickup_location: { name: 'warehouse_name' },
        }),
      /valid 6-digit pincode/,
    )
    await assert.rejects(
      () =>
        service.createB2CShipmentManifest({
          shipments: [{ name: 'Name', order: 'bad-mode', phone: '9999999999', add: 'Address', pin: '110042', payment_mode: 'Card' }],
          pickup_location: { name: 'warehouse_name' },
        }),
      /payment_mode/,
    )

    console.log(`Delhivery B2C API contract checks passed (${requests.length} requests).`)
  } finally {
    ;(axios as any).get = originalGet
    ;(axios as any).post = originalPost
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
