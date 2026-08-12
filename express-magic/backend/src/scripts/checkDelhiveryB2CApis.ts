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
  const originalPut = axios.put

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
    if (String(url).endsWith('/api/v1/packages/json/')) {
      return {
        status: 200,
        data: {
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
        },
      }
    }
    if (String(url).endsWith('/api/kinko/v1/invoice/charges/.json')) {
      return {
        status: 200,
        data: {
          total_amount: 55,
          chargeable_weight: 10,
          billing_mode: 'E',
        },
      }
    }
    if (String(url).endsWith('/api/p/packing_slip')) {
      return {
        status: 200,
        data: {
          packages: [
            {
              wbn: '703500000001',
              label: 'https://example.com/label-703500000001.pdf',
            },
          ],
        },
      }
    }
    if (String(url).endsWith('/api/rest/fetch/pkg/document/')) {
      return {
        status: 200,
        data: {
          doc_type: 'EPOD',
          waybill: '1234567890',
          document_url: 'https://example.com/epod-1234567890.jpg',
        },
      }
    }
    if (String(url).includes('/api/cmu/get_bulk_upl/')) {
      return {
        status: 200,
        data: {
          upl_id: 'UPL-B2C-NDR-000001',
          status: 'Completed',
          processed: 2,
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
    if (String(url).endsWith('/fm/request/new/')) {
      return {
        status: 200,
        data: {
          success: true,
          pickup_id: 'PU-B2C-000001',
          message: 'Pickup request created',
        },
      }
    }
    if (String(url).endsWith('/api/backend/clientwarehouse/create/')) {
      return {
        status: 200,
        data: {
          success: true,
          name: 'test_name',
          message: 'Warehouse created',
        },
      }
    }
    if (String(url).endsWith('/api/backend/clientwarehouse/edit/')) {
      return {
        status: 200,
        data: {
          success: true,
          name: 'registered_wh_name',
          message: 'Warehouse updated',
        },
      }
    }
    if (String(url).endsWith('/api/p/update')) {
      return {
        status: 202,
        data: {
          upl_id: 'UPL-B2C-NDR-000001',
          message: 'NDR action accepted',
        },
      }
    }

    return {
      status: 200,
      data: {
        success: true,
        upload_wbn: 'UPLOAD-B2C-000001',
        packages: [{ waybill: 'WB-SHIPMENT-000001', status: 'Success' }],
      },
    }
  }

  ;(axios as any).put = async (url: string, data?: unknown, config?: CapturedRequest) => {
    requests.push({ method: 'PUT', url, data, headers: config?.headers, params: config?.params })
    return {
      status: 200,
      data: {
        success: true,
        waybill: '843000000001',
        updated: true,
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

    const rvpQcResponse = await service.createB2CRvpQcShipmentManifest({
      pickup_location: { name: 'warehouse_name' },
      shipments: [
        {
          client: 'Test Client',
          return_name: 'test_designs',
          order: 'RVP-QC-ORDER-1',
          return_country: 'India',
          weight: '150.0 gm',
          city: 'Meerjapuram',
          pin: '521111',
          return_state: 'Gujarat',
          products_desc: 'NEW EI PIKOK',
          shipping_mode: 'Express',
          state: 'Andhra Pradesh',
          quantity: 1,
          waybill: '123455678910',
          phone: '1234567890',
          add: '7 106 abc road, 2020 building',
          payment_mode: 'Pickup',
          order_date: '29-06-2023',
          seller_gst_tin: 'ABCD1234F',
          name: 'Jitendra Singh',
          return_add: 'SHOP NO 218, ABC Road, Mumbai',
          total_amount: 749,
          seller_name: 'ABC Design',
          return_city: 'SURAT',
          country: 'India',
          return_pin: '394101',
          return_phone: '1234567890',
          custom_qc: [
            {
              item: 'mobile',
              description: 'Mi note 1 pro',
              images: ['https://example.com/mobile-1.jpg'],
              return_reason: 'Damaged',
              quantity: 1,
              brand: 'Mi',
              product_category: 'mobile',
              questions: [
                {
                  questions_id: 'client-question-1',
                  options: [''],
                  value: ['123456543'],
                  required: true,
                  type: 'varchar',
                  ques_images: ['https://example.com/qc-1.jpg'],
                },
              ],
            },
            {
              item: 'mobile',
              description: 'Mi note 2 pro',
              images: 'https://example.com/mobile-2.jpg',
              return_reason: 'Damaged',
              quantity: '2',
              brand: 'Mi',
              product_category: 'apparel',
              questions: [
                {
                  questions_id: 'client-question-2',
                  options: 'Black,other',
                  value: ['Black'],
                  required: 'true',
                  type: 'multi',
                  ques_images: 'https://example.com/qc-2.jpg',
                },
              ],
            },
          ],
        },
      ],
    })
    assert.equal((rvpQcResponse as any)?.upload_wbn, 'UPLOAD-B2C-000001')

    const rvpQcRequest = requests.at(-1)
    assert.equal(rvpQcRequest?.method, 'POST')
    assert.equal(rvpQcRequest?.url, 'https://staging-express.delhivery.com/api/cmu/create.json')
    assert.equal(rvpQcRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(rvpQcRequest?.headers?.Accept, 'application/json')
    assert.equal(rvpQcRequest?.headers?.['Content-Type'], 'application/x-www-form-urlencoded')
    const rvpQcForm = new URLSearchParams(String(rvpQcRequest?.data || ''))
    assert.equal(rvpQcForm.get('format'), 'json')
    const rvpQcManifest = JSON.parse(String(rvpQcForm.get('data') || '{}'))
    assert.equal(rvpQcManifest.pickup_location?.name, 'warehouse_name')
    assert.equal(rvpQcManifest.shipments?.[0]?.payment_mode, 'Pickup')
    assert.equal(rvpQcManifest.shipments?.[0]?.qc_type, 'param')
    assert.equal(rvpQcManifest.shipments?.[0]?.custom_qc?.length, 2)
    assert.deepEqual(rvpQcManifest.shipments?.[0]?.custom_qc?.[1]?.images, [
      'https://example.com/mobile-2.jpg',
    ])
    assert.deepEqual(rvpQcManifest.shipments?.[0]?.custom_qc?.[1]?.questions?.[0]?.options, [
      'Black',
      'other',
    ])

    await assert.rejects(
      () =>
        service.createB2CRvpQcShipmentManifest({
          pickup_location: { name: 'warehouse_name' },
          shipments: [
            {
              name: 'Name',
              order: 'missing-qc',
              phone: '9999999999',
              add: 'Address',
              pin: '110042',
              payment_mode: 'Pickup',
            },
          ],
        }),
      /custom_qc must be a non-empty array/,
    )
    await assert.rejects(
      () =>
        service.createB2CRvpQcShipmentManifest({
          pickup_location: { name: 'warehouse_name' },
          shipments: [
            {
              name: 'Name',
              order: 'too-many-items',
              phone: '9999999999',
              add: 'Address',
              pin: '110042',
              payment_mode: 'Pickup',
              custom_qc: [
                { description: 'one', images: ['https://example.com/1.jpg'], questions: [{ questions_id: 'q1', options: ['yes'], value: ['yes'], required: true, type: 'multi' }] },
                { description: 'two', images: ['https://example.com/2.jpg'], questions: [{ questions_id: 'q2', options: ['yes'], value: ['yes'], required: true, type: 'multi' }] },
                { description: 'three', images: ['https://example.com/3.jpg'], questions: [{ questions_id: 'q3', options: ['yes'], value: ['yes'], required: true, type: 'multi' }] },
              ],
            },
          ],
        }),
      /supports up to 2 items/,
    )
    await assert.rejects(
      () =>
        service.createB2CRvpQcShipmentManifest({
          pickup_location: { name: 'warehouse_name' },
          shipments: [
            {
              name: 'Name',
              order: 'bad-question-type',
              phone: '9999999999',
              add: 'Address',
              pin: '110042',
              payment_mode: 'Pickup',
              custom_qc: [
                {
                  description: 'item',
                  images: ['https://example.com/item.jpg'],
                  questions: [
                    { questions_id: 'q1', options: ['yes'], value: ['yes'], required: true, type: 'single' },
                  ],
                },
              ],
            },
          ],
        }),
      /type must be 'varchar' or 'multi'/,
    )

    const editResponse = await service.editB2CShipment({
      waybill: '843000000001',
      pt: 'COD',
      cod: 100,
      shipment_height: 40.2,
      shipment_width: 20,
      shipment_length: 10,
      gm: 100.2,
      name: 'Edited Consignee',
      phone: ['9999999999'],
      add: 'Edited Address',
      products_desc: 'Edited Product',
    })
    assert.equal((editResponse as any)?.success, true)

    const editRequest = requests.at(-1)
    assert.equal(editRequest?.method, 'POST')
    assert.equal(editRequest?.url, 'https://staging-express.delhivery.com/api/p/edit')
    assert.equal(editRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(editRequest?.headers?.Accept, 'application/json')
    assert.equal(editRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(editRequest?.data, {
      waybill: '843000000001',
      name: 'Edited Consignee',
      add: 'Edited Address',
      products_desc: 'Edited Product',
      phone: ['9999999999'],
      pt: 'COD',
      gm: 100.2,
      shipment_height: 40.2,
      shipment_width: 20,
      shipment_length: 10,
      cod: 100,
    })

    await service.editB2CShipment({ waybill: '843000000002', pt: 'Pre-paid' })
    assert.deepEqual(requests.at(-1)?.data, {
      waybill: '843000000002',
      pt: 'Pre-paid',
    })

    await assert.rejects(() => service.editB2CShipment({}), /waybill is required/)
    await assert.rejects(
      () => service.editB2CShipment({ waybill: '843000000003' }),
      /At least one editable shipment field/,
    )
    await assert.rejects(
      () => service.editB2CShipment({ waybill: '843000000004', pt: 'COD' }),
      /cod is required/,
    )
    await assert.rejects(
      () => service.editB2CShipment({ waybill: '843000000005', pt: 'Pickup' }),
      /pt must be/,
    )
    await assert.rejects(
      () => service.editB2CShipment({ waybill: '843000000006', gm: -1 }),
      /gm must be a positive number/,
    )

    const cancellationResponse = await service.cancelShipment('694500000001')
    assert.equal((cancellationResponse as any)?.success, true)
    assert.equal((cancellationResponse as any)?.awb_number, '694500000001')

    const cancellationRequest = requests.at(-1)
    assert.equal(cancellationRequest?.method, 'POST')
    assert.equal(cancellationRequest?.url, 'https://staging-express.delhivery.com/api/p/edit')
    assert.equal(cancellationRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(cancellationRequest?.headers?.Accept, 'application/json')
    assert.equal(cancellationRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(cancellationRequest?.data, {
      waybill: '694500000001',
      cancellation: 'true',
    })

    await assert.rejects(() => service.cancelShipment('  '), /Delhivery AWB number is required/)

    const ewaybillResponse = await service.updateB2CEwaybill('843000000001', {
      data: [{ dcn: 'INV-001', ewbn: 'EWB-001' }],
    })
    assert.equal((ewaybillResponse as any)?.success, true)

    const ewaybillRequest = requests.at(-1)
    assert.equal(ewaybillRequest?.method, 'PUT')
    assert.equal(
      ewaybillRequest?.url,
      'https://staging-express.delhivery.com/api/rest/ewaybill/843000000001/',
    )
    assert.equal(ewaybillRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(ewaybillRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(ewaybillRequest?.data, {
      data: [{ dcn: 'INV-001', ewbn: 'EWB-001' }],
    })

    await service.updateB2CEwaybill('843000000002', { dcn: 'INV-002', ewbn: 'EWB-002' })
    assert.deepEqual(requests.at(-1)?.data, {
      data: [{ dcn: 'INV-002', ewbn: 'EWB-002' }],
    })

    await assert.rejects(
      () => service.updateB2CEwaybill('', { dcn: 'INV-003', ewbn: 'EWB-003' }),
      /waybill is required/,
    )
    await assert.rejects(
      () => service.updateB2CEwaybill('843000000003', { ewbn: 'EWB-003' }),
      /dcn is required/,
    )
    await assert.rejects(
      () => service.updateB2CEwaybill('843000000004', { dcn: 'INV-004' }),
      /ewbn is required/,
    )

    const trackingResponse = await service.trackB2CShipment({
      waybill: '1122345678722',
      ref_ids: '',
    })
    assert.equal((trackingResponse as any)?.ShipmentData?.[0]?.Shipment?.AWB, '1122345678722')

    const trackingRequest = requests.at(-1)
    assert.equal(trackingRequest?.method, 'GET')
    assert.equal(
      trackingRequest?.url,
      'https://staging-express.delhivery.com/api/v1/packages/json/',
    )
    assert.equal(trackingRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(trackingRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(trackingRequest?.params, {
      waybill: '1122345678722',
      ref_ids: '',
    })

    await service.trackB2CShipment({
      waybill: 'WB000001, WB000002',
      ref_ids: 'ORDER-001',
    })
    assert.deepEqual(requests.at(-1)?.params, {
      waybill: 'WB000001,WB000002',
      ref_ids: 'ORDER-001',
    })

    await assert.rejects(() => service.trackB2CShipment({ waybill: '  ' }), /waybill is required/)
    await assert.rejects(
      () =>
        service.trackB2CShipment({
          waybill: Array.from({ length: 51 }, (_, index) => `WB${index + 1}`).join(','),
        }),
      /up to 50/,
    )

    const shippingCostResponse = await service.calculateB2CShippingCost({
      md: 'E',
      ss: 'Delivered',
      d_pin: '110053',
      o_pin: '110042',
      cgm: '10',
      pt: 'Pre-paid',
      l: '12',
      b: '10',
      h: '8',
      ipkg_type: 'box',
    })
    assert.equal((shippingCostResponse as any)?.total_amount, 55)

    const shippingCostRequest = requests.at(-1)
    assert.equal(shippingCostRequest?.method, 'GET')
    assert.equal(
      shippingCostRequest?.url,
      'https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json',
    )
    assert.equal(shippingCostRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(shippingCostRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(shippingCostRequest?.params, {
      md: 'E',
      cgm: 10,
      o_pin: '110042',
      d_pin: '110053',
      ss: 'Delivered',
      pt: 'Pre-paid',
      l: 12,
      b: 10,
      h: 8,
      ipkg_type: 'box',
    })

    await service.calculateB2CShippingCost({
      md: 's',
      ss: 'rto',
      d_pin: '110053',
      o_pin: '110042',
      cgm: 10,
      pt: 'cod',
    })
    assert.deepEqual(requests.at(-1)?.params, {
      md: 'S',
      cgm: 10,
      o_pin: '110042',
      d_pin: '110053',
      ss: 'RTO',
      pt: 'COD',
    })

    await assert.rejects(
      () =>
        service.calculateB2CShippingCost({
          md: 'X',
          ss: 'Delivered',
          d_pin: '110053',
          o_pin: '110042',
          cgm: 10,
          pt: 'Pre-paid',
        }),
      /md must be/,
    )
    await assert.rejects(
      () =>
        service.calculateB2CShippingCost({
          md: 'E',
          ss: 'Delivered',
          d_pin: '11005',
          o_pin: '110042',
          cgm: 10,
          pt: 'Pre-paid',
        }),
      /d_pin must be a valid 6-digit pincode/,
    )
    await assert.rejects(
      () =>
        service.calculateB2CShippingCost({
          md: 'E',
          ss: 'Delivered',
          d_pin: '110053',
          o_pin: '110042',
          cgm: 0,
          pt: 'Pre-paid',
        }),
      /cgm must be a positive integer/,
    )
    await assert.rejects(
      () =>
        service.calculateB2CShippingCost({
          md: 'E',
          ss: 'Lost',
          d_pin: '110053',
          o_pin: '110042',
          cgm: 10,
          pt: 'Pre-paid',
        }),
      /ss must be/,
    )
    await assert.rejects(
      () =>
        service.calculateB2CShippingCost({
          md: 'E',
          ss: 'Delivered',
          d_pin: '110053',
          o_pin: '110042',
          cgm: 10,
          pt: 'Pickup',
        }),
      /pt must be/,
    )

    const labelResponse = await service.generateB2CShippingLabel({
      waybill: '703500000001',
      pdf: 'true',
      pdf_size: '4r',
    })
    assert.equal((labelResponse as any)?.packages?.[0]?.wbn, '703500000001')

    const labelRequest = requests.at(-1)
    assert.equal(labelRequest?.method, 'GET')
    assert.equal(labelRequest?.url, 'https://staging-express.delhivery.com/api/p/packing_slip')
    assert.equal(labelRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(labelRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(labelRequest?.params, {
      wbns: '703500000001',
      pdf: 'true',
      pdf_size: '4R',
    })

    await service.generateB2CShippingLabel({
      waybill: '703500000002',
      pdf: false,
    })
    assert.deepEqual(requests.at(-1)?.params, {
      wbns: '703500000002',
      pdf: 'false',
    })

    await assert.rejects(
      () => service.generateB2CShippingLabel({ waybill: '' }),
      /waybill is required/,
    )
    await assert.rejects(
      () => service.generateB2CShippingLabel({ waybill: '703500000003', pdf: 'yes' }),
      /pdf must be true or false/,
    )
    await assert.rejects(
      () =>
        service.generateB2CShippingLabel({
          waybill: '703500000004',
          pdf_size: 'STD',
        }),
      /pdf_size must be/,
    )

    const documentResponse = await service.downloadB2CDocument({
      doc_type: 'epod',
      waybill: '1234567890',
    })
    assert.equal((documentResponse as any)?.document_url, 'https://example.com/epod-1234567890.jpg')

    const documentRequest = requests.at(-1)
    assert.equal(documentRequest?.method, 'GET')
    assert.equal(
      documentRequest?.url,
      'https://staging-express.delhivery.com/api/rest/fetch/pkg/document/',
    )
    assert.equal(documentRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.deepEqual(documentRequest?.params, {
      doc_type: 'EPOD',
      waybill: '1234567890',
    })

    await service.downloadB2CDocument({
      doc_type: 'RVP_QC_IMAGE',
      waybill: 1234567891,
    })
    assert.deepEqual(requests.at(-1)?.params, {
      doc_type: 'RVP_QC_IMAGE',
      waybill: '1234567891',
    })

    await assert.rejects(
      () => service.downloadB2CDocument({ doc_type: 'invoice', waybill: '1234567890' }),
      /doc_type must be one of/,
    )
    await assert.rejects(
      () => service.downloadB2CDocument({ doc_type: 'EPOD', waybill: 'WB123' }),
      /waybill must be a numeric Delhivery waybill/,
    )

    const pickupRequestResponse = await service.createB2CPickupRequest({
      pickup_time: '11:00:00',
      pickup_date: '2023-12-29',
      pickup_location: 'warehouse_name',
      expected_package_count: '1',
    })
    assert.equal((pickupRequestResponse as any)?.pickup_id, 'PU-B2C-000001')

    const pickupRequest = requests.at(-1)
    assert.equal(pickupRequest?.method, 'POST')
    assert.equal(pickupRequest?.url, 'https://staging-express.delhivery.com/fm/request/new/')
    assert.equal(pickupRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(pickupRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(pickupRequest?.data, {
      pickup_time: '11:00:00',
      pickup_date: '2023-12-29',
      pickup_location: 'warehouse_name',
      expected_package_count: 1,
    })

    await assert.rejects(
      () => service.createB2CPickupRequest({}),
      /pickup_time must be in HH:mm:ss format/,
    )
    await assert.rejects(
      () =>
        service.createB2CPickupRequest({
          pickup_time: '25:00:00',
          pickup_date: '2023-12-29',
          pickup_location: 'warehouse_name',
          expected_package_count: 1,
        }),
      /pickup_time must be in HH:mm:ss format/,
    )
    await assert.rejects(
      () =>
        service.createB2CPickupRequest({
          pickup_time: '11:00:00',
          pickup_date: '29-12-2023',
          pickup_location: 'warehouse_name',
          expected_package_count: 1,
        }),
      /pickup_date must be in YYYY-MM-DD format/,
    )
    await assert.rejects(
      () =>
        service.createB2CPickupRequest({
          pickup_time: '11:00:00',
          pickup_date: '2023-12-29',
          pickup_location: '',
          expected_package_count: 1,
        }),
      /pickup_location is required/,
    )
    await assert.rejects(
      () =>
        service.createB2CPickupRequest({
          pickup_time: '11:00:00',
          pickup_date: '2023-12-29',
          pickup_location: 'warehouse_name',
          expected_package_count: 0,
        }),
      /expected_package_count must be a positive integer/,
    )

    const warehouseResponse = await service.createB2CClientWarehouse({
      phone: '9999999999',
      city: 'Kota',
      name: 'test_name',
      pin: '110042',
      address: 'address',
      country: 'India',
      email: 'abc@gmail.com',
      registered_name: 'registered_account_name',
      return_address: 'return_address',
      return_pin: '110042',
      return_city: 'Kota',
      return_state: 'Delhi',
      return_country: 'India',
    })
    assert.equal((warehouseResponse as any)?.name, 'test_name')

    const warehouseRequest = requests.at(-1)
    assert.equal(warehouseRequest?.method, 'POST')
    assert.equal(
      warehouseRequest?.url,
      'https://staging-express.delhivery.com/api/backend/clientwarehouse/create/',
    )
    assert.equal(warehouseRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(warehouseRequest?.headers?.Accept, 'application/json')
    assert.equal(warehouseRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(warehouseRequest?.data, {
      name: 'test_name',
      phone: '9999999999',
      pin: '110042',
      return_address: 'return_address',
      registered_name: 'registered_account_name',
      email: 'abc@gmail.com',
      address: 'address',
      city: 'Kota',
      country: 'India',
      return_city: 'Kota',
      return_state: 'Delhi',
      return_country: 'India',
      return_pin: '110042',
    })

    await assert.rejects(() => service.createB2CClientWarehouse({}), /name is required/)
    await assert.rejects(
      () =>
        service.createB2CClientWarehouse({
          name: 'test_name',
          phone: '9999999999',
          pin: '11004',
          return_address: 'return_address',
        }),
      /pin must be a valid 6-digit pincode/,
    )
    await assert.rejects(
      () =>
        service.createB2CClientWarehouse({
          name: 'test_name',
          phone: '9999999999',
          pin: '110042',
        }),
      /return_address is required/,
    )
    await assert.rejects(
      () =>
        service.createB2CClientWarehouse({
          name: 'test_name',
          phone: '9999999999',
          pin: '110042',
          return_address: 'return_address',
          return_pin: '11004A',
        }),
      /return_pin must be a valid 6-digit pincode/,
    )

    const warehouseUpdateResponse = await service.updateB2CClientWarehouse({
      name: 'registered_wh_name',
      phone: '9988998899',
      address: 'HUDA Market, Gurugram, Haryana - 122001',
    })
    assert.equal((warehouseUpdateResponse as any)?.message, 'Warehouse updated')

    const warehouseUpdateRequest = requests.at(-1)
    assert.equal(warehouseUpdateRequest?.method, 'POST')
    assert.equal(
      warehouseUpdateRequest?.url,
      'https://staging-express.delhivery.com/api/backend/clientwarehouse/edit/',
    )
    assert.equal(warehouseUpdateRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(warehouseUpdateRequest?.headers?.Accept, 'application/json')
    assert.equal(warehouseUpdateRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(warehouseUpdateRequest?.data, {
      name: 'registered_wh_name',
      address: 'HUDA Market, Gurugram, Haryana - 122001',
      phone: '9988998899',
    })

    await service.updateB2CClientWarehouse({
      name: 'registered_wh_name',
      pin: '110042',
    })
    assert.deepEqual(requests.at(-1)?.data, {
      name: 'registered_wh_name',
      pin: '110042',
    })

    await assert.rejects(() => service.updateB2CClientWarehouse({}), /name is required/)
    await assert.rejects(
      () => service.updateB2CClientWarehouse({ name: 'registered_wh_name' }),
      /At least one warehouse update field is required/,
    )
    await assert.rejects(
      () =>
        service.updateB2CClientWarehouse({
          name: 'registered_wh_name',
          pin: '11004A',
        }),
      /pin must be a valid 6-digit pincode/,
    )

    const ndrResponse = await service.submitB2CNdrActions({
      data: [
        { waybill: '13163116000001', act: 'RE-ATTEMPT' },
        { waybill: '13163116000002', act: 'PICKUP_RESCHEDULE' },
      ],
    })
    assert.equal((ndrResponse as any)?.upl_id, 'UPL-B2C-NDR-000001')

    const ndrRequest = requests.at(-1)
    assert.equal(ndrRequest?.method, 'POST')
    assert.equal(ndrRequest?.url, 'https://staging-express.delhivery.com/api/p/update')
    assert.equal(ndrRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.equal(ndrRequest?.headers?.Accept, 'application/json')
    assert.equal(ndrRequest?.headers?.['Content-Type'], 'application/json')
    assert.deepEqual(ndrRequest?.data, {
      data: [
        { waybill: '13163116000001', act: 'RE-ATTEMPT' },
        { waybill: '13163116000002', act: 'PICKUP_RESCHEDULE' },
      ],
    })

    await assert.rejects(() => service.submitB2CNdrActions({}), /data must be a non-empty array/)
    await assert.rejects(
      () => service.submitB2CNdrActions({ data: [{ waybill: '', act: 'RE-ATTEMPT' }] }),
      /data\[0\]\.waybill is required/,
    )
    await assert.rejects(
      () =>
        service.submitB2CNdrActions({
          data: [{ waybill: '13163116000001', act: 'DEFER_DLV' }],
        }),
      /must be 'RE-ATTEMPT' or 'PICKUP_RESCHEDULE'/,
    )
    await assert.rejects(
      () =>
        service.submitB2CNdrActions({
          data: Array.from({ length: 1001 }, (_, index) => ({
            waybill: String(13163116000000 + index),
            act: 'RE-ATTEMPT',
          })),
        }),
      /maximum of 1000 shipments/,
    )

    const ndrStatus = await service.getB2CNdrStatus('UPL-B2C-NDR-000001', false)
    assert.equal((ndrStatus as any)?.status, 'Completed')
    const ndrStatusRequest = requests.at(-1)
    assert.equal(ndrStatusRequest?.method, 'GET')
    assert.equal(
      ndrStatusRequest?.url,
      'https://staging-express.delhivery.com/api/cmu/get_bulk_upl/UPL-B2C-NDR-000001',
    )
    assert.equal(ndrStatusRequest?.headers?.Authorization, 'Token test-delhivery-token')
    assert.deepEqual(ndrStatusRequest?.params, { verbose: 'false' })

    await assert.rejects(() => service.getB2CNdrStatus('', true), /uplId is required/)
    await assert.rejects(
      () => service.getB2CNdrStatus('UPL-B2C-NDR-000001', 'yes'),
      /verbose must be true or false/,
    )

    console.log(`Delhivery B2C API contract checks passed (${requests.length} requests).`)
  } finally {
    ;(axios as any).get = originalGet
    ;(axios as any).post = originalPost
    ;(axios as any).put = originalPut
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
