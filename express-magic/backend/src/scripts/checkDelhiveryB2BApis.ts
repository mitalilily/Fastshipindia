import assert from 'assert'
import axios from 'axios'

type CapturedRequest = {
  method?: string
  url?: string
  params?: Record<string, unknown>
  headers?: Record<string, unknown>
  data?: unknown
}

const originalPost = axios.post
const originalGet = axios.get
const originalRequest = axios.request
const requests: CapturedRequest[] = []
let failPrimaryWarehouseUpdateOnce = false

const lastRequest = (method: string, url: string) => {
  const request = requests[requests.length - 1]
  assert(request, 'Expected a Delhivery B2B request to be captured')
  assert.equal(request.method, method)
  assert.equal(request.url, url)
  assert.equal(request.headers?.Authorization, 'Bearer test-jwt')
  assert(request.headers?.['X-Request-Id'], 'Expected X-Request-Id header')
  return request
}

const run = async () => {
  process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:5432/test'
  const {
    DelhiveryB2BService,
    getDelhiveryB2BManifestIdentifiers,
    getDelhiveryB2BTatDays,
    isDelhiveryB2BServiceableResponse,
    mapDelhiveryB2BTrackingStatus,
  } = await import(
    '../models/services/couriers/delhiveryB2B.service'
  )

  assert.equal(
    isDelhiveryB2BServiceableResponse({
      success: true,
      data: { pincode_serviceability_data: [{ pincode: '122001' }] },
    }),
    true,
  )
  assert.equal(
    isDelhiveryB2BServiceableResponse({
      success: true,
      data: { pincode_serviceability_data: [] },
    }),
    false,
  )
  assert.equal(isDelhiveryB2BServiceableResponse({ success: false }), false)
  assert.equal(isDelhiveryB2BServiceableResponse({ success: true, data: {} }), false)
  assert.equal(getDelhiveryB2BTatDays({ data: { tat_days: 3 } }), 3)
  assert.equal(getDelhiveryB2BTatDays({ tat: '4' }), 4)
  assert.equal(getDelhiveryB2BTatDays({ data: {} }), null)
  assert.equal(getDelhiveryB2BTatDays({ days: -1 }), null)
  assert.deepEqual(
    getDelhiveryB2BManifestIdentifiers({
      success: true,
      data: {
        lrn: '220029522',
        waybills: ['BOX-AWB-1', { awb_number: 'BOX-AWB-2' }, 'DOCUMENT-AWB'],
      },
    }),
    {
      lrn: '220029522',
      awbs: ['BOX-AWB-1', 'BOX-AWB-2', 'DOCUMENT-AWB'],
    },
  )
  assert.deepEqual(
    getDelhiveryB2BManifestIdentifiers({
      data: { lrnum: '220029523', awb_numbers: 'BOX-AWB-1, BOX-AWB-2,BOX-AWB-1' },
    }),
    { lrn: '220029523', awbs: ['BOX-AWB-1', 'BOX-AWB-2'] },
  )
  assert.deepEqual(getDelhiveryB2BManifestIdentifiers({ status: 'processing' }), {
    lrn: null,
    awbs: [],
  })

  assert.deepEqual(
    {
      MANIFESTED: mapDelhiveryB2BTrackingStatus('MANIFESTED'),
      PICKED_UP: mapDelhiveryB2BTrackingStatus('PICKED_UP'),
      LEFT_ORIGIN: mapDelhiveryB2BTrackingStatus('LEFT_ORIGIN'),
      REACH_DESTINATION: mapDelhiveryB2BTrackingStatus('REACH_DESTINATION'),
      UNDEL_REATTEMPT: mapDelhiveryB2BTrackingStatus('UNDEL_REATTEMPT'),
      PART_DEL: mapDelhiveryB2BTrackingStatus('PART_DEL'),
      OFD: mapDelhiveryB2BTrackingStatus('OFD'),
      DELIVERED: mapDelhiveryB2BTrackingStatus('DELIVERED'),
      RETURNED_INTRANSIT: mapDelhiveryB2BTrackingStatus('RETURNED_INTRANSIT'),
      RECEIVED_AT_RETURN_CENTER: mapDelhiveryB2BTrackingStatus('RECEIVED_AT_RETURN_CENTER'),
      RETURN_OFD: mapDelhiveryB2BTrackingStatus('RETURN_OFD'),
      RETURN_DELIVERED: mapDelhiveryB2BTrackingStatus('RETURN_DELIVERED'),
      NOT_PICKED: mapDelhiveryB2BTrackingStatus('NOT_PICKED'),
      LOST: mapDelhiveryB2BTrackingStatus('LOST'),
    },
    {
      MANIFESTED: 'shipment_created',
      PICKED_UP: 'pickup_initiated',
      LEFT_ORIGIN: 'in_transit',
      REACH_DESTINATION: 'in_transit',
      UNDEL_REATTEMPT: 'ndr',
      PART_DEL: 'ndr',
      OFD: 'out_for_delivery',
      DELIVERED: 'delivered',
      RETURNED_INTRANSIT: 'rto_in_transit',
      RECEIVED_AT_RETURN_CENTER: 'rto',
      RETURN_OFD: 'rto_in_transit',
      RETURN_DELIVERED: 'rto_delivered',
      NOT_PICKED: 'pickup_initiated',
      LOST: 'lost',
    },
  )

  ;(axios as any).post = async (url: string, data: unknown, config?: CapturedRequest) => {
    requests.push({ method: 'POST', url, data, headers: config?.headers })
    if (url.endsWith('/ums/login')) {
      return { data: { success: true, data: { jwt: 'test-jwt' } } }
    }
    return { data: { success: true } }
  }
  ;(axios as any).get = async (url: string, config?: CapturedRequest) => {
    requests.push({ method: 'GET', url, ...config })
    return { data: { success: true } }
  }
  ;(axios as any).request = async (config: CapturedRequest) => {
    requests.push(config)
    if (
      failPrimaryWarehouseUpdateOnce &&
      config.method === 'PATCH' &&
      config.url === '/client-warehouse/update/'
    ) {
      failPrimaryWarehouseUpdateOnce = false
      const error: any = new Error('Not found')
      error.response = { status: 404, data: { message: 'Not found' } }
      throw error
    }
    return { data: { success: true } }
  }

  const service = new DelhiveryB2BService({
    apiBase: 'https://ltl-clients-api-dev.delhivery.com/',
    username: 'test-account',
    password: 'test-password',
    clientId: 'test-client',
    warehouseId: 'test-warehouse',
    freightMode: 'fop',
    fmPickup: true,
  })

  await service.resetPassword('test-account')
  const passwordReset = requests.at(-1)
  assert.equal(passwordReset?.method, 'POST')
  assert.equal(passwordReset?.url, 'https://ltl-clients-api-dev.delhivery.com/forgot-password')
  assert.deepEqual(passwordReset?.data, { username: 'test-account' })
  assert.equal(passwordReset?.headers?.['Content-Type'], 'application/json')
  await assert.rejects(() => service.resetPassword('   '), /username is required/)

  const loginStart = requests.length
  const loginResults = await Promise.all([service.login(), service.login(), service.login()])
  const loginRequests = requests
    .slice(loginStart)
    .filter((request) => request.url?.endsWith('/ums/login'))
  assert.equal(loginRequests.length, 1, 'Concurrent API calls must share one login request')
  assert.equal(loginRequests[0].url, 'https://ltl-clients-api-dev.delhivery.com/ums/login')
  assert.deepEqual(loginRequests[0].data, {
    username: 'test-account',
    password: 'test-password',
  })
  assert.equal(loginRequests[0].headers?.['Content-Type'], 'application/json')
  assert(loginResults.every((result) => result.token === 'test-jwt'))
  const cachedLogin = await service.login()
  assert.equal(cachedLogin.cached, true)
  assert(
    cachedLogin.expiresAt > Date.now() + 23 * 60 * 60 * 1000,
    'Tokens without a readable JWT expiry should use Delhivery\'s documented 24-hour validity',
  )

  await service.checkServiceability('122001', 1.25)
  const serviceabilityRequest = lastRequest('GET', '/pincode-service/122001')
  assert.equal(serviceabilityRequest.params?.weight, 1.25)
  assert.equal(serviceabilityRequest.headers?.['Content-Type'], 'application/json')

  await service.checkServiceability('122001')
  assert.equal(lastRequest('GET', '/pincode-service/122001').params, undefined)

  await assert.rejects(() => service.checkServiceability('12201', 1000), /6-digit/)
  await assert.rejects(() => service.checkServiceability('122001', Number.NaN), /weight/)

  await service.getExpectedTat('400093', '122001')
  const tatRequest = lastRequest('GET', '/tat/estimate')
  assert.deepEqual(tatRequest.params, {
    origin_pin: '400093',
    destination_pin: '122001',
  })
  assert.equal(tatRequest.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(typeof tatRequest.headers?.['X-Request-Id'], 'string')

  await service.getExpectedTat('400093', '122001')
  const secondTatRequest = lastRequest('GET', '/tat/estimate')
  assert.notEqual(
    secondTatRequest.headers?.['X-Request-Id'],
    tatRequest.headers?.['X-Request-Id'],
    'Each Expected TAT request must receive a unique X-Request-Id',
  )

  assert.throws(() => service.getExpectedTat('40009', '122001'), /origin_pin.*6-digit/)
  assert.throws(
    () => service.getExpectedTat('400093', 'destination'),
    /destination_pin.*6-digit/,
  )

  await service.estimateFreight({
    dimensions: [
      { length_cm: 11, width_cm: 1.1, height_cm: 11, box_count: 1, ignored: true },
    ],
    weight_g: 100000,
    cheque_payment: false,
    source_pin: '400069',
    consignee_pin: '400069',
    payment_mode: 'prepaid',
    inv_amount: 123,
    rov_insurance: true,
    ignored: true,
  })
  const freightEstimate = lastRequest('POST', '/freight/estimate')
  assert.deepEqual(freightEstimate.data, {
    dimensions: [{ length_cm: 11, width_cm: 1.1, height_cm: 11, box_count: 1 }],
    weight_g: 100000,
    cheque_payment: false,
    source_pin: '400069',
    consignee_pin: '400069',
    payment_mode: 'prepaid',
    inv_amount: 123,
    rov_insurance: true,
    freight_mode: 'fop',
  })
  assert.equal(freightEstimate.headers?.['Content-Type'], 'application/json')
  assert.equal(freightEstimate.headers?.Authorization, 'Bearer test-jwt')

  await service.estimateFreight({
    dimensions: [{ length_cm: 20, width_cm: 15, height_cm: 10, box_count: 2 }],
    weight_g: 2500,
    source_pin: '400069',
    consignee_pin: '122001',
    payment_mode: 'cod',
    cod_amount: 750,
    inv_amount: 1000,
    freight_mode: 'fod',
  })
  const codFreightEstimate = lastRequest('POST', '/freight/estimate')
  assert.deepEqual(codFreightEstimate.data, {
    dimensions: [{ length_cm: 20, width_cm: 15, height_cm: 10, box_count: 2 }],
    weight_g: 2500,
    source_pin: '400069',
    consignee_pin: '122001',
    payment_mode: 'cod',
    inv_amount: 1000,
    freight_mode: 'fod',
    cod_amount: 750,
  })

  await assert.rejects(
    () =>
      service.estimateFreight({
        dimensions: [{ length_cm: 11, width_cm: 1.1, height_cm: 11, box_count: 1 }],
        weight_g: 100000,
        source_pin: '400069',
        consignee_pin: '400069',
        payment_mode: 'cod',
        inv_amount: 123,
        freight_mode: 'fod',
      }),
    /cod_amount/,
  )
  await assert.rejects(
    () => service.estimateFreight({ payment_mode: 'prepaid' }),
    /dimensions/,
  )
  await assert.rejects(
    () =>
      service.estimateFreight({
        dimensions: [{ length_cm: 11, width_cm: 1.1, height_cm: 11, box_count: 1.5 }],
        weight_g: 100000,
        source_pin: '400069',
        consignee_pin: '400069',
        payment_mode: 'prepaid',
        inv_amount: 123,
      }),
    /box_count.*integer/,
  )
  await assert.rejects(
    () =>
      service.estimateFreight({
        dimensions: [{ length_cm: 11, width_cm: 1.1, height_cm: 11, box_count: 1 }],
        weight_g: 100000,
        cheque_payment: 'false',
        source_pin: '400069',
        consignee_pin: '400069',
        payment_mode: 'prepaid',
        inv_amount: 123,
      }),
    /cheque_payment.*boolean/,
  )

  const suppliedFreightLrns = [
    '220029522',
    '220029147',
    '220029160',
    '220029922',
    '123123',
    '220030275',
    '220030054',
    '220028714',
    '220028626',
    '220028853',
    '220030336',
    '220030431',
    '220030363',
    '220031362',
    '220030469',
  ]
  await service.getFreightCharges(` ${suppliedFreightLrns.join(', ')} `)
  const freightCharges = lastRequest(
    'GET',
    `/lrn/freight-breakup/lrns=${encodeURIComponent(suppliedFreightLrns.join(','))}`,
  )
  assert.equal(freightCharges.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(typeof freightCharges.headers?.['X-Request-Id'], 'string')

  const maximumLrns = Array.from({ length: 25 }, (_, index) => String(220000000 + index))
  await service.getFreightCharges(maximumLrns)
  const maximumLrnsRequest = lastRequest(
    'GET',
    `/lrn/freight-breakup/lrns=${encodeURIComponent(maximumLrns.join(','))}`,
  )
  assert.notEqual(
    maximumLrnsRequest.headers?.['X-Request-Id'],
    freightCharges.headers?.['X-Request-Id'],
  )

  assert.throws(() => service.getFreightCharges(' , , '), /lrns is required/i)
  assert.throws(
    () => service.getFreightCharges(Array.from({ length: 26 }, (_, index) => String(index))),
    /maximum of 25 LRNs/i,
  )

  const warehousePayload = {
    pin_code: '400059',
    city: 'Gurgaon',
    state: 'Haryana',
    country: 'India',
    address_details: {
      address: 'Gurgaon',
      contact_person: 'contact_person',
      phone_number: '9186676788',
    },
    name: 'Delhivery 142',
    business_hours: { TUE: { start_time: '07:00', close_time: '08:30' } },
    pick_up_hours: { TUE: { start_time: '13:00', close_time: '16:00' } },
    pick_up_days: ['TUE'],
    business_days: ['TUE'],
    ret_address: { pin: '721657', address: 'test' },
    billing_details: { address: 'Billing address', pin: '400059' },
    same_as_fwd_add: false,
    tin_number: 'TIN123',
    cst_number: 'CST123',
    warehouse_type: 'pickup',
    accessibility_id: 'ACCESS-1',
    incoming_center: 'IN-CENTER',
    rto_center: 'RTO-CENTER',
    store_type: 'standard',
    tag: 'primary',
    consignee_gst: '22AAAAA0000A1Z5',
    is_warehouse: true,
    use_client_state: false,
    active: true,
    qr_enabled: true,
    qr_data: 'warehouse-qr-data',
    ignored: 'do-not-forward',
  }
  await service.createWarehouse(warehousePayload)
  const createWarehouse = lastRequest('POST', '/client-warehouse/create/')
  const { ignored: _ignoredWarehouseField, ...expectedWarehousePayload } = warehousePayload
  assert.deepEqual(createWarehouse.data, expectedWarehousePayload)
  assert.equal((createWarehouse.data as any).name, 'Delhivery 142')
  assert.equal(createWarehouse.headers?.['Content-Type'], 'application/json')

  await service.createWarehouse({
    pin_code: '400059',
    address_details: warehousePayload.address_details,
    name: 'Case Sensitive Warehouse',
    same_as_fwd_add: true,
    ret_address: { pin: '721657', address: 'must not be forwarded' },
    buisness_hours: { tue: { start_time: '07:00', close_time: '08:30' } },
    buisness_days: ['tue'],
  })
  const aliasWarehouse = lastRequest('POST', '/client-warehouse/create/')
  assert.deepEqual(aliasWarehouse.data, {
    pin_code: '400059',
    address_details: warehousePayload.address_details,
    name: 'Case Sensitive Warehouse',
    same_as_fwd_add: true,
    business_hours: { TUE: { start_time: '07:00', close_time: '08:30' } },
    business_days: ['TUE'],
  })

  assert.throws(
    () => service.createWarehouse({ ...warehousePayload, name: '' }),
    /name.*non-empty string/,
  )
  assert.throws(
    () => service.createWarehouse({ ...warehousePayload, pin_code: '40005' }),
    /pin_code.*6-digit/,
  )
  assert.throws(
    () => service.createWarehouse({ ...warehousePayload, pick_up_days: ['TUESDAY'] }),
    /valid weekday/,
  )
  assert.throws(
    () => service.createWarehouse({ ...warehousePayload, consignee_gst: 'invalid' }),
    /15 alphanumeric/,
  )
  assert.throws(
    () =>
      service.createWarehouse({
        ...warehousePayload,
        address_details: { address: 'Gurgaon', contact_person: '', phone_number: '9186676788' },
      }),
    /address_details\.contact_person.*non-empty string/,
  )
  assert.throws(
    () =>
      service.createWarehouse({
        ...warehousePayload,
        business_hours: { TUE: { start_time: '7:00', close_time: '08:30' } },
      }),
    /business_hours\.TUE\.start_time.*HH:mm/,
  )

  const warehouseUpdatePayload = {
    cl_warehouse_name: 'Test Warehouse',
    update_dict: {
      city: 'Faridabad',
      state: 'Maharashtra',
      country: 'Bharat',
      address_details: {
        address: 'testing123',
        contact_person: 'Shashi',
        phone_number: '9988000000',
        email: 'test@gmail.com',
        company: 'companyname',
      },
      ret_address: {
        address: 'H.No100, Sector-40',
        city: 'Gurgaon',
        state: 'Haryana',
        pin: '122001',
        country: 'INDIA',
      },
      pick_up_days: ['MON', 'TUE'],
      drop_days: ['WED'],
      drop_hours: { WED: { start_time: '09:00', close_time: '17:30' } },
      business_hours: { TUE: { start_time: '07:00', close_time: '08:30' } },
      billing_details: { address: 'Billing address', pin: '122001' },
      tin_number: 'TIN123',
      cst_number: 'CST123',
      qr_enabled: true,
      appointment_required: 'false',
      ignored: 'do-not-forward',
    },
    ignored: 'do-not-forward',
  }
  await service.updateWarehouse(warehouseUpdatePayload)
  const updateWarehouse = lastRequest('PATCH', '/client-warehouse/update/')
  const { ignored: _ignoredUpdateField, ...expectedWarehouseUpdateFields } =
    warehouseUpdatePayload.update_dict
  assert.deepEqual(updateWarehouse.data, {
    cl_warehouse_name: warehouseUpdatePayload.cl_warehouse_name,
    update_dict: expectedWarehouseUpdateFields,
  })
  assert.equal((updateWarehouse.data as any).cl_warehouse_name, 'Test Warehouse')
  assert.equal(updateWarehouse.headers?.['Content-Type'], 'application/json')

  failPrimaryWarehouseUpdateOnce = true
  await service.updateWarehouse(warehouseUpdatePayload)
  assert.equal(requests.at(-2)?.url, '/client-warehouse/update/')
  lastRequest('PATCH', '/client-warehouses/update')

  await service.updateWarehouse({
    cl_warehouse_name: 'Case Sensitive Warehouse',
    update_dict: {
      buisness_hours: { tue: { start_time: '07:00', close_time: '08:30' } },
    },
  })
  const aliasWarehouseUpdate = lastRequest('PATCH', '/client-warehouse/update/')
  assert.deepEqual(aliasWarehouseUpdate.data, {
    cl_warehouse_name: 'Case Sensitive Warehouse',
    update_dict: {
      business_hours: { TUE: { start_time: '07:00', close_time: '08:30' } },
    },
  })

  await assert.rejects(
    () => service.updateWarehouse({ ...warehouseUpdatePayload, cl_warehouse_name: '' }),
    /cl_warehouse_name.*non-empty string/,
  )
  await assert.rejects(
    () =>
      service.updateWarehouse({
        ...warehouseUpdatePayload,
        update_dict: { drop_days: ['WEDNESDAY'] },
      }),
    /valid weekday/,
  )
  await assert.rejects(
    () =>
      service.updateWarehouse({
        ...warehouseUpdatePayload,
        update_dict: { qr_enabled: 'true' },
      }),
    /qr_enabled.*boolean/,
  )

  const manifestPayload = {
    pickup_location_name: 'Test Warehouse',
    payment_mode: 'prepaid',
    weight: '1000',
    dropoff_location: JSON.stringify({
      consignee_name: 'Utkarsh',
      address: 'sector 7a',
      city: 'jajpur',
      state: 'odisha',
      zip: '756043',
      phone: '9876543210',
      email: '',
    }),
    shipment_details: JSON.stringify([
      {
        order_id: 'ORDER-1',
        box_count: 1,
        description: 'Test description',
        weight: 1000,
        waybills: [],
        master: false,
      },
    ]),
    dimensions: JSON.stringify([{ box_count: 1, length: 10, width: 10, height: 10 }]),
    invoices: JSON.stringify([
      { ewaybill: '', inv_num: 'I22331030453', inv_amt: 59729.67, inv_qr_code: '' },
    ]),
    return_address: JSON.stringify({
      name: 'Returns',
      address: 'Return address',
      city: 'Gurugram',
      state: 'Haryana',
      zip: '122001',
      phone: '9999999999',
    }),
    rov_insurance: 'true',
    enable_paperless_movement: 'true',
    freight_mode: 'fop',
    fm_pickup: 'false',
    billing_address: JSON.stringify({
      name: 'Billing Contact',
      company: 'FastShip',
      consignor: 'FastShip',
      address: 'Billing address',
      city: 'Gurugram',
      state: 'Haryana',
      pin: '122001',
      phone: '9999999999',
      pan_number: 'ABCDE1234F',
    }),
    callback: JSON.stringify({
      uri: 'https://example.com/delhivery/manifest',
      method: 'POST',
    }),
    doc_data: JSON.stringify([
      { doc_type: 'INVOICE_COPY', doc_meta: { invoice_num: ['I22331030453'] } },
    ]),
    doc_file: {
      buffer: Buffer.from('invoice'),
      mimetype: 'application/pdf',
      originalname: 'invoice.pdf',
    },
    ignored: 'do-not-forward',
  }
  await service.manifestShipment(manifestPayload)
  const manifest = lastRequest('POST', '/manifest')
  assert(manifest.data instanceof FormData)
  assert.equal((manifest.data as FormData).get('pickup_location_name'), 'Test Warehouse')
  assert.equal((manifest.data as FormData).get('payment_mode'), 'prepaid')
  assert.equal((manifest.data as FormData).get('weight'), '1000')
  assert.equal((manifest.data as FormData).get('rov_insurance'), 'true')
  assert.equal((manifest.data as FormData).get('fm_pickup'), 'false')
  assert.equal((manifest.data as FormData).get('ignored'), null)
  assert.equal(
    JSON.parse(String((manifest.data as FormData).get('shipment_details')))[0].order_id,
    'ORDER-1',
  )
  assert.equal(
    JSON.parse(String((manifest.data as FormData).get('invoices')))[0].inv_num,
    'I22331030453',
  )
  assert.equal(
    JSON.parse(String((manifest.data as FormData).get('callback'))).uri,
    'https://example.com/delhivery/manifest',
  )
  assert.equal(
    JSON.parse(String((manifest.data as FormData).get('billing_address'))).pan_number,
    'ABCDE1234F',
  )
  assert.equal(((manifest.data as FormData).get('doc_file') as File).name, 'invoice.pdf')
  assert.equal(manifest.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(typeof manifest.headers?.['X-Request-Id'], 'string')

  assert.throws(
    () => service.manifestShipment({ ...manifestPayload, payment_mode: 'cod' }),
    /cod_amount/,
  )
  await service.manifestShipment({
    ...manifestPayload,
    pickup_location_name: undefined,
    pickup_location_id: 'warehouse-id',
    payment_mode: 'cod',
    cod_amount: 122,
    dropoff_store_code: 'STORE-1',
    dropoff_location: 'ignored because store code has priority',
    invoices: JSON.stringify([{ ewaybill: '', inv_qr_code: 'SIGNED-INVOICE-QR' }]),
    doc_file: undefined,
    doc_data: undefined,
  })
  const codManifest = lastRequest('POST', '/manifest')
  assert(!(codManifest.data instanceof FormData))
  assert.equal(codManifest.headers?.['Content-Type'], 'application/json')
  assert.equal((codManifest.data as any).pickup_location_id, 'warehouse-id')
  assert.equal((codManifest.data as any).pickup_location_name, undefined)
  assert.equal((codManifest.data as any).payment_mode, 'cod')
  assert.equal((codManifest.data as any).cod_amount, 122)
  assert.equal((codManifest.data as any).dropoff_store_code, 'STORE-1')
  assert.equal((codManifest.data as any).dropoff_location, undefined)
  assert.equal((codManifest.data as any).shipment_details[0].order_id, 'ORDER-1')
  assert.equal((codManifest.data as any).invoices[0].inv_qr_code, 'SIGNED-INVOICE-QR')

  assert.throws(
    () =>
      service.manifestShipment({
        ...manifestPayload,
        pickup_location_name: undefined,
        pickup_location_id: undefined,
      }),
    /pickup_location_name or pickup_location_id/,
  )
  assert.throws(
    () =>
      service.manifestShipment({
        ...manifestPayload,
        pickup_location_id: 'warehouse-id',
      }),
    /only one of pickup_location_name or pickup_location_id/,
  )
  assert.throws(
    () =>
      service.manifestShipment({
        ...manifestPayload,
        callback: JSON.stringify({ uri: 'ftp://example.com/callback', method: 'POST' }),
      }),
    /callback\.uri must be a valid HTTP\(S\) URL/,
  )
  assert.throws(
    () =>
      service.manifestShipment({
        ...manifestPayload,
        billing_address: JSON.stringify({
          name: 'Billing Contact',
          company: 'FastShip',
          consignor: 'FastShip',
          address: 'Billing address',
          city: 'Gurugram',
          state: 'Haryana',
          pin: '122001',
          phone: '9999999999',
        }),
      }),
    /pan_number or gst_number/,
  )
  assert.throws(
    () => service.manifestShipment({ ...manifestPayload, doc_data: undefined }),
    /doc_data/,
  )
  assert.throws(
    () =>
      service.manifestShipment({
        ...manifestPayload,
        doc_file: { ...manifestPayload.doc_file, originalname: 'invoice.exe' },
      }),
    /Unsupported doc_file format/,
  )
  assert.throws(
    () =>
      service.manifestShipment({
        ...manifestPayload,
        doc_file: Array.from({ length: 11 }, (_, index) => ({
          ...manifestPayload.doc_file,
          originalname: `invoice-${index}.pdf`,
        })),
      }),
    /at most 10 valid files/,
  )
  const largeDocumentBuffer = Buffer.alloc(10 * 1024 * 1024 + 1)
  assert.throws(
    () =>
      service.manifestShipment({
        ...manifestPayload,
        doc_file: [
          { ...manifestPayload.doc_file, buffer: largeDocumentBuffer, originalname: 'one.pdf' },
          { ...manifestPayload.doc_file, buffer: largeDocumentBuffer, originalname: 'two.pdf' },
        ],
        doc_data: JSON.stringify([
          { doc_type: 'INVOICE_COPY', doc_meta: { invoice_num: ['one'] } },
          { doc_type: 'INVOICE_COPY', doc_meta: { invoice_num: ['two'] } },
        ]),
      }),
    /aggregate size.*20 MB/,
  )

  await service.getManifestStatus(' manifest-job ')
  const manifestStatus = lastRequest('GET', '/manifest')
  assert.equal(manifestStatus.params?.job_id, 'manifest-job')
  assert.equal(manifestStatus.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(typeof manifestStatus.headers?.['X-Request-Id'], 'string')
  assert.throws(() => service.getManifestStatus(''), /job_id is required/)

  const shipmentUpdatePayload = {
    payment_mode: 'cod',
    cod_amount: '0',
    consignee_name: 'rahul',
    consignee_address: 'jammu',
    consignee_pincode: '844120',
    consignee_phone: '9999999999',
    weight_g: '30',
    invoices: JSON.stringify([
      {
        inv_number: 'I22331030453',
        inv_amount: 59729.67,
        qr_code: '',
        ewaybill: '',
        ignored: 'do-not-forward',
      },
    ]),
    callback: JSON.stringify({
      uri: 'https://btob-api-dev.delhivery.com/docket/upload_callback',
      method: 'post',
      authorization: 'Bearer Token',
    }),
    dimensions: JSON.stringify([
      { width_cm: 5, height_cm: 4, length_cm: 3, box_count: 1, ignored: true },
    ]),
    invoice_files_meta: JSON.stringify([{ invoices: ['I22331030453'] }]),
    invoice_file: [
      {
        buffer: Buffer.from('invoice'),
        mimetype: 'application/pdf',
        originalname: 'updated-invoice.pdf',
      },
    ],
    ignored: 'do-not-forward',
  }
  await service.updateShipment('220110457', shipmentUpdatePayload)
  const update = lastRequest('PUT', '/lrn/update/220110457')
  assert(update.data instanceof FormData)
  assert.equal((update.data as FormData).get('payment_mode'), 'cod')
  assert.equal((update.data as FormData).get('cod_amount'), '0')
  assert.equal((update.data as FormData).get('consignee_pincode'), '844120')
  assert.equal((update.data as FormData).get('ignored'), null)
  assert.equal(
    JSON.parse(String((update.data as FormData).get('invoices')))[0].inv_number,
    'I22331030453',
  )
  assert.equal(
    JSON.parse(String((update.data as FormData).get('invoices')))[0].ignored,
    undefined,
  )
  assert.deepEqual(JSON.parse(String((update.data as FormData).get('dimensions')))[0], {
    width_cm: 5,
    height_cm: 4,
    length_cm: 3,
    box_count: 1,
  })
  assert.equal(
    JSON.parse(String((update.data as FormData).get('cb'))).uri,
    'https://btob-api-dev.delhivery.com/docket/upload_callback',
  )
  assert.equal(JSON.parse(String((update.data as FormData).get('cb'))).method, 'POST')
  assert.equal(((update.data as FormData).get('invoice_file') as File).name, 'updated-invoice.pdf')
  assert.equal(update.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(typeof update.headers?.['X-Request-Id'], 'string')

  assert.throws(
    () => service.updateShipment('220110457', { payment_mode: 'prepaid' }),
    /not supported for prepaid/,
  )
  assert.throws(
    () => service.updateShipment('220110457', { payment_mode: 'cod' }),
    /cod_amount/,
  )
  await service.updateShipment('220110457', {
    invoices: JSON.stringify([{ qr_code: 'SIGNED-INVOICE-QR', ewaybill: '' }]),
  })
  const qrInvoiceUpdate = lastRequest('PUT', '/lrn/update/220110457')
  assert.deepEqual(JSON.parse(String((qrInvoiceUpdate.data as FormData).get('invoices'))), [
    { ewaybill: '', qr_code: 'SIGNED-INVOICE-QR' },
  ])
  assert.throws(
    () =>
      service.updateShipment('220110457', {
        callback: JSON.stringify({ uri: 'ftp://example.com/callback', method: 'POST' }),
      }),
    /callback\.uri must be a valid HTTP\(S\) URL/,
  )
  assert.throws(
    () =>
      service.updateShipment('220110457', {
        invoice_file: shipmentUpdatePayload.invoice_file,
        invoice_files_meta: shipmentUpdatePayload.invoice_files_meta,
      }),
    /invoices is required/,
  )
  assert.throws(
    () =>
      service.updateShipment('220110457', {
        ...shipmentUpdatePayload,
        invoice_files_meta: JSON.stringify([
          { invoices: ['I22331030453'] },
          { invoices: ['I22331030453'] },
        ]),
      }),
    /one entry for each invoice_file/,
  )
  assert.throws(
    () => service.updateShipment('', { consignee_name: 'Consignee' }),
    /lrn is required/,
  )
  assert.throws(
    () =>
      service.updateShipment('220110457', {
        invoices: shipmentUpdatePayload.invoices,
        invoice_file: [
          {
            ...shipmentUpdatePayload.invoice_file[0],
            originalname: 'invoice.exe',
          },
        ],
        invoice_files_meta: shipmentUpdatePayload.invoice_files_meta,
      }),
    /Unsupported invoice_file format/,
  )
  assert.throws(
    () =>
      service.updateShipment('220110457', {
        invoices: shipmentUpdatePayload.invoices,
        invoice_file: Array.from({ length: 11 }, (_, index) => ({
          ...shipmentUpdatePayload.invoice_file[0],
          originalname: `invoice-${index}.pdf`,
        })),
        invoice_files_meta: shipmentUpdatePayload.invoice_files_meta,
      }),
    /at most 10 valid files/,
  )
  assert.throws(
    () => service.updateShipment('220110457', { invoice_file: [] }),
    /At least one supported LR update field/,
  )

  const shipmentUpdateJobId = 'dd036047-560c-4ac8-9f4f-ec554c2431cb'
  await service.getShipmentUpdateStatus(shipmentUpdateJobId)
  const shipmentUpdateStatus = lastRequest('GET', '/lrn/update/status')
  assert.deepEqual(shipmentUpdateStatus.params, { job_id: shipmentUpdateJobId })
  assert.equal(shipmentUpdateStatus.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(shipmentUpdateStatus.headers?.Accept, 'application/json')
  assert.equal(typeof shipmentUpdateStatus.headers?.['X-Request-Id'], 'string')
  assert.throws(() => service.getShipmentUpdateStatus('  '), /job_id is required/)

  await service.cancelShipment('220110457')
  const cancelShipment = lastRequest('DELETE', '/lrn/cancel/220110457')
  assert.equal(cancelShipment.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(cancelShipment.headers?.Accept, 'application/json')
  assert.equal(typeof cancelShipment.headers?.['X-Request-Id'], 'string')
  assert.throws(() => service.cancelShipment('  '), /lrn is required/)

  await service.trackShipment('220110457')
  const masterTracking = lastRequest('GET', '/lrn/track')
  assert.deepEqual(masterTracking.params, { lrnum: '220110457' })

  await service.trackShipment('220110457', true)
  const allWaybillTracking = lastRequest('GET', '/lrn/track')
  assert.deepEqual(allWaybillTracking.params, {
    lrnum: '220110457',
    all_wbns: true,
  })
  assert.equal(allWaybillTracking.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(allWaybillTracking.headers?.Accept, 'application/json')
  assert.equal(typeof allWaybillTracking.headers?.['X-Request-Id'], 'string')
  assert.throws(() => service.trackShipment(''), /lrn is required/)

  const formatIndiaDate = (offsetDays: number) => {
    const value = new Date(Date.now() + (330 + offsetDays * 24 * 60) * 60 * 1000)
    return `${String(value.getUTCDate()).padStart(2, '0')}/${String(value.getUTCMonth() + 1).padStart(2, '0')}/${value.getUTCFullYear()}`
  }
  const formatIndiaIsoDate = (offsetDays: number) => {
    const value = new Date(Date.now() + (330 + offsetDays * 24 * 60) * 60 * 1000)
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
  }
  const appointmentPayload = {
    lrn: '220192589',
    date: formatIndiaDate(1),
    appointment_slot: '12:00 PM-03:00 PM',
    po_number: ['2273410057461'],
    appointment_id: '',
    po_expiry_date: formatIndiaDate(2),
  }
  await service.bookLastMileAppointment(appointmentPayload)
  const appointment = lastRequest('POST', '/v2/appointments/lm')
  assert.deepEqual(appointment.data, appointmentPayload)
  assert.equal(appointment.headers?.['Content-Type'], 'application/json')

  assert.throws(
    () => service.bookLastMileAppointment({ ...appointmentPayload, date: formatIndiaDate(-1) }),
    /today or a future date/,
  )
  assert.throws(
    () => service.bookLastMileAppointment({ ...appointmentPayload, appointment_slot: '10-12' }),
    /supported Delhivery slots/,
  )
  assert.throws(
    () =>
      service.bookLastMileAppointment({
        ...appointmentPayload,
        po_number: ['1', '2', '3', '4', '5', '6'],
      }),
    /between 1 and 5/,
  )
  assert.throws(
    () =>
      service.bookLastMileAppointment({
        ...appointmentPayload,
        date: formatIndiaDate(2),
        po_expiry_date: formatIndiaDate(1),
      }),
    /must not be earlier/,
  )

  const pickupPayload = {
    client_warehouse: 'Test Warehouse',
    pickup_date: formatIndiaIsoDate(1),
    start_time: '05:00:00',
    expected_package_count: 1,
  }
  await service.createPickupRequest(pickupPayload)
  const pickup = lastRequest('POST', '/pickup_requests')
  assert.deepEqual(pickup.data, pickupPayload)
  assert.equal(pickup.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(pickup.headers?.Accept, 'application/json')
  assert.equal(pickup.headers?.['Content-Type'], 'application/json')
  assert.equal(typeof pickup.headers?.['X-Request-Id'], 'string')
  assert.throws(
    () => service.createPickupRequest({ ...pickupPayload, client_warehouse: '   ' }),
    /client_warehouse must be a non-empty string/,
  )
  assert.throws(
    () => service.createPickupRequest({ ...pickupPayload, pickup_date: formatIndiaIsoDate(-1) }),
    /today or a future date/,
  )
  assert.throws(
    () => service.createPickupRequest({ ...pickupPayload, pickup_date: '2026-02-30' }),
    /valid calendar date/,
  )
  assert.throws(
    () => service.createPickupRequest({ ...pickupPayload, start_time: '25:00:00' }),
    /HH:MM:SS format/,
  )
  assert.throws(
    () => service.createPickupRequest({ ...pickupPayload, expected_package_count: 1.5 }),
    /must be an integer/,
  )
  assert.throws(
    () => service.createPickupRequest({ ...pickupPayload, expected_package_count: 0 }),
    /must be at least 1/,
  )

  await service.cancelPickupRequest('pur_id_1')
  const pickupCancellation = lastRequest('DELETE', '/pickup_requests/pur_id_1')
  assert.equal(pickupCancellation.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(pickupCancellation.headers?.Accept, 'application/json')
  assert.equal(typeof pickupCancellation.headers?.['X-Request-Id'], 'string')
  assert.equal(pickupCancellation.data, undefined)
  assert.throws(() => service.cancelPickupRequest('   '), /pickup_id is required/)

  for (const size of ['sm', 'md', 'a4', 'std']) {
    await service.getShippingLabel('220041149', size)
    const shippingLabel = lastRequest('GET', `/label/get_urls/${size}/220041149`)
    assert.equal(shippingLabel.headers?.Authorization, 'Bearer test-jwt')
    assert.equal(shippingLabel.headers?.Accept, 'application/json')
    assert.equal(typeof shippingLabel.headers?.['X-Request-Id'], 'string')
    assert.equal(shippingLabel.data, undefined)
  }
  await service.getShippingLabel('220041149', 'A4')
  lastRequest('GET', '/label/get_urls/a4/220041149')
  assert.throws(() => service.getShippingLabel('220041149', ''), /size must be one of/)
  assert.throws(() => service.getShippingLabel('220041149', 'large'), /size must be one of/)
  assert.throws(() => service.getShippingLabel('   ', 'std'), /lrn is required/)

  const lrCopyTypes = [
    'SHIPPER COPY',
    'ORIGIN ACCOUNTS COPY',
    'REGULATORY COPY',
    'LM POD',
    'RECIPIENT COPY',
  ]
  await service.getLrCopy('220110457', lrCopyTypes)
  const allLrCopies = lastRequest('GET', '/lr_copy/print/220110457')
  assert.equal(allLrCopies.params?.lr_copy_type, lrCopyTypes.join(','))
  assert.equal(allLrCopies.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(allLrCopies.headers?.Accept, 'application/json')
  assert.equal(allLrCopies.headers?.['Content-Type'], 'application/json')
  assert.equal(typeof allLrCopies.headers?.['X-Request-Id'], 'string')

  await service.getLrCopy('220110457')
  assert.equal(lastRequest('GET', '/lr_copy/print/220110457').params, undefined)

  await service.getLrCopy('220110457', 'shipper copy, lm pod,SHIPPER COPY')
  assert.equal(
    lastRequest('GET', '/lr_copy/print/220110457').params?.lr_copy_type,
    'SHIPPER COPY,LM POD',
  )
  assert.throws(
    () => service.getLrCopy('220110457', 'DRIVER COPY'),
    /unsupported value: DRIVER COPY/,
  )
  assert.throws(() => service.getLrCopy('   ', 'SHIPPER COPY'), /lrn is required/)

  const documentCallback = {
    uri: 'https://btob-api-dev.delhivery.com/v3/document/generate_label_pdf',
    method: 'post',
    authorization: 'Bearer Token',
  }
  await service.generateDocument('shipping_label', {
    lrns: ['220040156', '220040143'],
    size: 'A4',
    callback: documentCallback,
  })
  const generatedLabels = lastRequest('POST', '/generate/shipping_label')
  assert.deepEqual(generatedLabels.data, {
    lrns: ['220040156', '220040143'],
    size: 'a4',
    callback: { ...documentCallback, method: 'POST' },
  })
  assert.equal(generatedLabels.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(generatedLabels.headers?.Accept, 'application/json')
  assert.equal(generatedLabels.headers?.['Content-Type'], 'application/json')
  assert.equal(typeof generatedLabels.headers?.['X-Request-Id'], 'string')

  await service.generateDocument('lr_copy', {
    lrns: ['220040156'],
    size: 'a4',
    lr_copy_type: ['shipper copy', 'LM POD', 'SHIPPER COPY'],
    callback: documentCallback,
  })
  const generatedLrCopies = lastRequest('POST', '/generate/lr_copy')
  assert.deepEqual(generatedLrCopies.data, {
    lrns: ['220040156'],
    lr_copy_type: ['SHIPPER COPY', 'LM POD'],
    callback: { ...documentCallback, method: 'POST' },
  })
  assert.equal(generatedLrCopies.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(generatedLrCopies.headers?.Accept, 'application/json')
  assert.equal(generatedLrCopies.headers?.['Content-Type'], 'application/json')
  assert.equal(typeof generatedLrCopies.headers?.['X-Request-Id'], 'string')

  const validDocumentPayload = {
    lrns: ['220040156'],
    size: 'std',
    callback: documentCallback,
  }
  assert.throws(
    () => service.generateDocument('invoice', validDocumentPayload),
    /doc_type must be shipping_label or lr_copy/,
  )
  assert.throws(
    () => service.generateDocument('shipping_label', { ...validDocumentPayload, lrns: [] }),
    /between 1 and 25/,
  )
  assert.throws(
    () =>
      service.generateDocument('shipping_label', {
        ...validDocumentPayload,
        lrns: Array.from({ length: 26 }, (_, index) => String(index + 1)),
      }),
    /between 1 and 25/,
  )
  assert.throws(
    () => service.generateDocument('shipping_label', { ...validDocumentPayload, size: '' }),
    /size must be a non-empty string/,
  )
  assert.throws(
    () => service.generateDocument('shipping_label', { ...validDocumentPayload, size: 'large' }),
    /size must be one of/,
  )
  assert.throws(
    () => service.generateDocument('shipping_label', { ...validDocumentPayload, callback: undefined }),
    /callback must be an object/,
  )
  assert.throws(
    () =>
      service.generateDocument('shipping_label', {
        ...validDocumentPayload,
        callback: { ...documentCallback, uri: 'ftp://example.com/callback' },
      }),
    /valid HTTP\(S\) URL/,
  )
  assert.throws(
    () =>
      service.generateDocument('shipping_label', {
        ...validDocumentPayload,
        callback: { ...documentCallback, method: 'GET' },
      }),
    /callback.method must be POST/,
  )
  assert.throws(
    () =>
      service.generateDocument('lr_copy', {
        lrns: ['220040156'],
        lr_copy_type: ['DRIVER COPY'],
        callback: documentCallback,
      }),
    /unsupported value: DRIVER COPY/,
  )

  await service.getGenerateDocumentStatus(
    'shipping_label',
    '390927a3-1eaf-4df5-8aa7-87027ac46e48',
  )
  const shippingLabelStatus = lastRequest(
    'GET',
    '/generate/shipping_label/status/390927a3-1eaf-4df5-8aa7-87027ac46e48',
  )
  assert.equal(shippingLabelStatus.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(shippingLabelStatus.headers?.Accept, 'application/json')
  assert.equal(typeof shippingLabelStatus.headers?.['X-Request-Id'], 'string')
  assert.equal(shippingLabelStatus.data, undefined)

  await service.getGenerateDocumentStatus('LR_COPY', 'lr-copy-document-job')
  const lrCopyStatus = lastRequest('GET', '/generate/lr_copy/status/lr-copy-document-job')
  assert.equal(lrCopyStatus.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(lrCopyStatus.headers?.Accept, 'application/json')
  assert.equal(typeof lrCopyStatus.headers?.['X-Request-Id'], 'string')
  assert.throws(
    () => service.getGenerateDocumentStatus('invoice', 'document-job'),
    /doc_type must be shipping_label or lr_copy/,
  )
  assert.throws(
    () => service.getGenerateDocumentStatus('shipping_label', '   '),
    /job_id is required/,
  )

  await service.downloadDocument({
    lrn: '220079606',
    doc_type: 'lm_pod',
    auto_download: false,
    fields: 'name,url',
  })
  const lrnDocument = lastRequest('GET', '/document/download')
  assert.deepEqual(lrnDocument.params, {
    lrn: '220079606',
    doc_type: 'LM_POD',
    auto_download: 'false',
    version: 'latest',
    fields: 'name,url',
  })
  assert.equal(lrnDocument.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(lrnDocument.headers?.Accept, 'application/json')
  assert.equal(typeof lrnDocument.headers?.['X-Request-Id'], 'string')

  await service.downloadDocument({
    mwn: 'MWN123456',
    doc_type: 'RETURN_DSP_POD',
    auto_download: 'true',
    version: 'all',
  })
  const mwnDocument = lastRequest('GET', '/document/download')
  assert.deepEqual(mwnDocument.params, {
    mwn: 'MWN123456',
    doc_type: 'RETURN_DSP_POD',
    auto_download: 'true',
    version: 'all',
  })
  assert.equal(mwnDocument.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(mwnDocument.headers?.Accept, 'application/json')
  assert.equal(typeof mwnDocument.headers?.['X-Request-Id'], 'string')
  assert.throws(() => service.downloadDocument({}), /either lrn or mwn is required/)
  assert.throws(
    () => service.downloadDocument({ lrn: '220079606', auto_download: 'yes' }),
    /auto_download must be true or false/,
  )
  assert.throws(
    () => service.downloadDocument({ lrn: '220079606', version: 'oldest' }),
    /version must be all or latest/,
  )
  assert.throws(
    () => service.downloadDocument({ lrn: '220079606', doc_type: 'LM POD' }),
    /letters, numbers, and underscores/,
  )

  const loginCountBeforeLogout = requests.filter((request) =>
    request.url?.endsWith('/ums/login'),
  ).length
  assert.equal(
    loginCountBeforeLogout,
    1,
    'Expected the JWT to be reused instead of logging in for every API request',
  )

  await service.logout()
  const logoutRequest = requests.at(-1)
  assert.equal(logoutRequest?.url, 'https://ltl-clients-api-dev.delhivery.com/ums/logout')
  assert.equal(logoutRequest?.method, 'GET')
  assert.equal(logoutRequest?.headers?.Authorization, 'Bearer test-jwt')
  assert.equal(logoutRequest?.headers?.['Content-Type'], 'application/json')
  assert.equal(logoutRequest?.data, undefined)

  const loginAfterLogout = await service.login()
  assert.equal(loginAfterLogout.cached, false)
  assert.equal(
    requests.filter((request) => request.url?.endsWith('/ums/login')).length,
    loginCountBeforeLogout + 1,
    'A successful logout must invalidate the cached JWT',
  )

  DelhiveryB2BService.clearTokenCache()
  const loginCountBeforeFailure = requests.filter((request) =>
    request.url?.endsWith('/ums/login'),
  ).length
  ;(axios as any).post = async (url: string, data: unknown, config?: CapturedRequest) => {
    requests.push({ method: 'POST', url, data, headers: config?.headers })
    const error: any = new Error('Invalid credentials')
    error.response = { status: 401, data: { message: 'Invalid credentials' } }
    throw error
  }
  await assert.rejects(() => service.login(), /Invalid credentials/)
  await assert.rejects(() => service.login(), /login is paused.*Retry after/)
  await assert.rejects(() => service.login(true), /Invalid credentials/)
  assert.equal(
    requests.filter((request) => request.url?.endsWith('/ums/login')).length,
    loginCountBeforeFailure + 2,
    'Rejected credentials should pause normal logins but allow an explicit forced admin test',
  )
  DelhiveryB2BService.clearTokenCache()

  console.log(`Delhivery B2B API contract checks passed (${requests.length} requests).`)
}

run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    ;(axios as any).post = originalPost
    ;(axios as any).get = originalGet
    ;(axios as any).request = originalRequest
    process.exit(process.exitCode || 0)
  })
