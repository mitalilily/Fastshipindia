import axios, { AxiosInstance } from 'axios'
import { HttpError } from '../../../utils/classes'
import {
  BigshipConfig,
  getEffectiveCourierConfig,
} from '../courierCredentials.service'
import { ShipmentParams } from '../shiprocket.service'

type BigshipServiceOptions = {
  configOverrides?: Partial<BigshipConfig>
}

const normalizeText = (value: unknown, fallback = '') =>
  String(value ?? fallback).trim()

const normalizeLoginCredential = (value: unknown, fallback = '') =>
  normalizeText(value, fallback).replace(/\\@/g, '@')

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toKg = (value: unknown, fallbackKg = 0.5) => {
  const numeric = toNumber(value, fallbackKg)
  if (numeric <= 0) return fallbackKg
  return numeric > 50 ? Number((numeric / 1000).toFixed(3)) : numeric
}

const toPositiveDimension = (value: unknown, fallback = 10) => {
  const numeric = Math.round(toNumber(value, fallback))
  return numeric > 0 ? numeric : fallback
}

const indianPhone = (value: unknown) => {
  const digits = normalizeText(value).replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

const normalizeComparable = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length

const ensureWords = (value: unknown, fallback: string) => {
  const text = normalizeText(value)
  const candidate = wordCount(text) >= 3 ? text : fallback
  return candidate.split(/\s+/).slice(0, 75).join(' ')
}

const limitWords = (value: unknown, maxWords: number) =>
  normalizeText(value).split(/\s+/).filter(Boolean).slice(0, maxWords).join(' ')

const normalizeBigshipLocation = (value: unknown) =>
  normalizeText(value)
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

const BIGSHIP_CITY_ALIASES: Record<string, string[]> = {
  BENGALURU: ['BANGALORE'],
  BANGALORE: ['BENGALURU'],
  GURUGRAM: ['GURGAON'],
  GURGAON: ['GURUGRAM'],
  'NEW DELHI': ['DELHI'],
  DELHI: ['NEW DELHI'],
  'NAVI MUMBAI': ['MUMBAI'],
  'MUMBAI SUBURBAN': ['MUMBAI'],
  NOIDA: ['GAUTAM BUDDHA NAGAR'],
  'GAUTAM BUDDHA NAGAR': ['NOIDA'],
}

const uniqueTexts = (values: string[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    const normalized = normalizeBigshipLocation(value)
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

const inferBigshipLocationFromPincode = (pincode: string) => {
  const pin = normalizeText(pincode).replace(/\D/g, '')

  if (/^110\d{3}$/.test(pin)) {
    return {
      city: 'NEW DELHI',
      state: 'DELHI',
    }
  }

  return null
}

const firstOrderItem = (params: ShipmentParams) =>
  Array.isArray(params.order_items) && params.order_items.length
    ? params.order_items[0]
    : null

const normalizeBoxes = (params: ShipmentParams) => {
  const sourceBoxes = Array.isArray(params.boxes) ? params.boxes : []
  const boxes = sourceBoxes
    .map((box: any) => ({
      noOfBoxes: Math.max(1, Math.floor(toNumber(box?.quantity ?? box?.box_count ?? 1, 1))),
      dimensions: [
        {
          length: toPositiveDimension(
            box?.length ?? box?.lengthCm ?? params.package_length ?? params.length,
          ),
          breadth: toPositiveDimension(
            box?.breadth ?? box?.breadthCm ?? params.package_breadth ?? params.breadth,
          ),
          height: toPositiveDimension(
            box?.height ?? box?.heightCm ?? params.package_height ?? params.height,
          ),
          weight: toKg(box?.weight ?? box?.weightKg ?? params.package_weight ?? params.weight),
        },
      ],
    }))
    .filter((box) => box.noOfBoxes > 0 && box.dimensions[0].weight > 0)

  if (boxes.length) return boxes

  return [
    {
      noOfBoxes: 1,
      dimensions: [
        {
          length: toPositiveDimension(params.package_length ?? params.length),
          breadth: toPositiveDimension(params.package_breadth ?? params.breadth),
          height: toPositiveDimension(params.package_height ?? params.height),
          weight: toKg(params.package_weight ?? params.weight),
        },
      ],
    },
  ]
}

const extractBigshipError = (value: any): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractBigshipError).filter(Boolean).join(' | ')
  if (typeof value === 'object') {
    const direct = value.message || value.error || value.status_message
    if (direct) return extractBigshipError(direct)
    return Object.values(value).map(extractBigshipError).filter(Boolean).join(' | ')
  }
  return String(value)
}

export class BigshipService {
  private apiBase = process.env.BIGSHIP_API_BASE || 'https://api.bigship.direct'
  private username = process.env.BIGSHIP_USERNAME || ''
  private password = process.env.BIGSHIP_PASSWORD || ''
  private accessKey = process.env.BIGSHIP_ACCESS_KEY || ''
  private token = process.env.BIGSHIP_BEARER_TOKEN || ''
  private tokenExpiresAt = 0
  private client: AxiosInstance
  private readonly runtimeConfigOverrides?: Partial<BigshipConfig>

  private static cachedConfig: BigshipConfig | null | undefined

  constructor(options: BigshipServiceOptions = {}) {
    this.runtimeConfigOverrides = options.configOverrides
    this.client = axios.create({ timeout: Number(process.env.BIGSHIP_TIMEOUT_MS || 30000) })
  }

  static clearCachedConfig() {
    BigshipService.cachedConfig = undefined
  }

  private normalizeBaseApi(value: string) {
    return normalizeText(value || 'https://api.bigship.direct').replace(/\/+$/, '')
  }

  private endpoint(path: string) {
    return `${this.apiBase}/${path.replace(/^\/+/, '')}`
  }

  private async ensureConfigLoaded() {
    if (BigshipService.cachedConfig === undefined) {
      BigshipService.cachedConfig = await getEffectiveCourierConfig<BigshipConfig>(
        'bigship',
        'b2c',
      )
    }

    const cfg = BigshipService.cachedConfig
    if (cfg) {
      this.apiBase = cfg.apiBase || this.apiBase
      this.username = normalizeLoginCredential(cfg.username || this.username)
      this.password = normalizeLoginCredential(cfg.password || this.password)
      this.accessKey = cfg.accessKey || this.accessKey
    }

    if (this.runtimeConfigOverrides) {
      this.apiBase = this.runtimeConfigOverrides.apiBase || this.apiBase
      this.username = normalizeLoginCredential(this.runtimeConfigOverrides.username || this.username)
      this.password = normalizeLoginCredential(this.runtimeConfigOverrides.password || this.password)
      this.accessKey = this.runtimeConfigOverrides.accessKey || this.accessKey
    }

    this.apiBase = this.normalizeBaseApi(this.apiBase)
  }

  private assertCredentials() {
    if (!this.username || !this.password || !this.accessKey) {
      throw new HttpError(
        400,
        'Bigship credentials are not configured. Save BIGSHIP_USERNAME, BIGSHIP_PASSWORD and BIGSHIP_ACCESS_KEY before booking Bigship shipments.',
      )
    }
  }

  private async ensureToken() {
    await this.ensureConfigLoaded()
    this.assertCredentials()

    if (this.token && Date.now() < this.tokenExpiresAt) return this.token

    let response
    try {
      response = await this.client.post(this.endpoint('/api/outbound/login'), {
        username: this.username,
        password: this.password,
        access_key: this.accessKey,
      })
    } catch (error: any) {
      throw new HttpError(
        Number(error?.response?.status || 502),
        extractBigshipError(error?.response?.data) || error?.message || 'Bigship login failed',
      )
    }
    const data = response.data
    if (data?.status === false || !data?.data?.token) {
      throw new HttpError(
        response.status || 401,
        extractBigshipError(data) || 'Bigship login failed',
      )
    }

    this.token = data.data.token
    const expiresAt = Date.parse(data.data.tokenExpiringAt || '')
    this.tokenExpiresAt = Number.isFinite(expiresAt)
      ? Math.max(Date.now() + 60_000, expiresAt - 60_000)
      : Date.now() + 55 * 60 * 1000
    return this.token
  }

  private async request<T = any>(method: 'get' | 'post', path: string, data?: any) {
    const token = await this.ensureToken()
    try {
      const response = await this.client.request<T>({
        method,
        url: this.endpoint(path),
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      return response.data as any
    } catch (error: any) {
      const status = Number(error?.response?.status || 502)
      const message =
        extractBigshipError(error?.response?.data) ||
        error?.message ||
        'Bigship API request failed'
      throw new HttpError(status, message)
    }
  }

  private async listWarehouses(filterType = '', filterValue = '') {
    const token = await this.ensureToken()
    const response = await this.client.get(this.endpoint('/api/outbound/get-warehouse-list'), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      params: {
        page: '1',
        perPage: '25',
        segment_type: 'local',
        status: '1',
        filter_type: filterType,
        filter_value: filterValue,
      },
    })

    const data = response.data
    if (data?.status === false) {
      throw new HttpError(
        Number(data?.status_code || 422),
        extractBigshipError(data) || 'Bigship warehouse lookup failed',
      )
    }

    return Array.isArray(data?.data?.warehouse) ? data.data.warehouse : []
  }

  private findMatchingWarehouse(warehouses: any[], params: ShipmentParams) {
    const pickup = params.pickup || {}
    const pincode = normalizeText(pickup.pincode)
    const phone = indianPhone(pickup.phone)
    const warehouseName = normalizeComparable(pickup.warehouse_name || pickup.name)

    return warehouses.find((warehouse) => {
      const warehousePincode = normalizeText(warehouse?.pincode)
      const warehousePhone = indianPhone(warehouse?.warehouseAddressPhone)
      const warehouseNames = [
        warehouse?.warehouseName,
        warehouse?.warehouseContactPerson,
      ].map(normalizeComparable)

      const pincodeMatches = !pincode || warehousePincode === pincode
      const phoneMatches = !phone || warehousePhone === phone
      const nameMatches = !warehouseName || warehouseNames.some((name) => name.includes(warehouseName))

      return pincodeMatches && (phoneMatches || nameMatches)
    })
  }

  private pickPincodeWarehouse(warehouses: any[], pincode: string) {
    const match = warehouses.find(
      (warehouse) => normalizeText(warehouse?.pincode) === pincode && /^\d+$/.test(normalizeText(warehouse?.warehouseId)),
    )
    return normalizeText(match?.warehouseId)
  }

  private buildCityCandidates(city: string, state: string) {
    const normalizedCity = normalizeBigshipLocation(city)
    const normalizedState = normalizeBigshipLocation(state)
    return uniqueTexts([
      normalizedCity,
      ...(BIGSHIP_CITY_ALIASES[normalizedCity] || []),
      normalizedCity.replace(/\b(CITY|DISTRICT|URBAN|RURAL)\b/g, '').trim(),
      normalizedState,
      ...(BIGSHIP_CITY_ALIASES[normalizedState] || []),
    ])
  }

  private buildShippingCityCandidates(params: ShipmentParams) {
    const inferredLocation = inferBigshipLocationFromPincode(
      normalizeText(params.consignee?.pincode),
    )
    const formCity = normalizeBigshipLocation(params.consignee?.city)
    const inferredCity = normalizeBigshipLocation(inferredLocation?.city)

    return uniqueTexts([
      inferredCity,
      ...(BIGSHIP_CITY_ALIASES[inferredCity] || []),
      formCity,
      ...(BIGSHIP_CITY_ALIASES[formCity] || []),
    ])
  }

  private async resolveWarehouseId(params: ShipmentParams) {
    const explicitWarehouseId = normalizeText(
      (params as any).bigship_warehouse_id || (params as any).bigshipWarehouseId,
    )
    if (/^\d+$/.test(explicitWarehouseId)) return explicitWarehouseId

    const pickupLocationId = normalizeText(params.pickup_location_id)
    if (/^\d+$/.test(pickupLocationId)) return pickupLocationId

    const pickup = params.pickup || {}
    const pincode = normalizeText(pickup.pincode)
    const phone = indianPhone(pickup.phone)
    const contactPerson = normalizeText(pickup.name || pickup.warehouse_name)
    const city = normalizeText(pickup.city)
    const state = normalizeText(pickup.state)
    const address = normalizeText(pickup.address)

    if (!pincode || !phone || !contactPerson || !city || !state || !address) {
      throw new HttpError(
        400,
        'Bigship pickup address, contact name, phone, city, state and pincode are required before booking.',
      )
    }

    const lookupAttempts = [
      ['warehouse_pin', pincode],
      ['warehouse_phone', phone],
      ['warehouse_contact_person', contactPerson],
    ] as const

    for (const [filterType, filterValue] of lookupAttempts) {
      const warehouses = await this.listWarehouses(filterType, filterValue)
      const match = this.findMatchingWarehouse(warehouses, params)
      const warehouseId = normalizeText(match?.warehouseId)
      if (/^\d+$/.test(warehouseId)) return warehouseId
      if (filterType === 'warehouse_pin') {
        const pincodeWarehouseId = this.pickPincodeWarehouse(warehouses, pincode)
        if (/^\d+$/.test(pincodeWarehouseId)) return pincodeWarehouseId
      }
    }

    const inferredLocation = inferBigshipLocationFromPincode(pincode)
    const warehouseState = normalizeBigshipLocation(inferredLocation?.state || state)
    const fallbackAddress = `${address} ${inferredLocation?.city || city} ${warehouseState}`
    const cityCandidates = this.buildCityCandidates(inferredLocation?.city || city, warehouseState)
    let lastError: any

    for (const warehouseCity of cityCandidates) {
      const warehousePayload = {
        segment_type: 'local',
        warehouseName: limitWords(
          normalizeText(pickup.warehouse_name || pickup.name || contactPerson, 'Pickup Warehouse'),
          20,
        ),
        warehouseContactPerson: limitWords(contactPerson, 20) || 'Pickup Contact',
        warehouseAddressPhone: phone,
        warehouseCountry: 'India',
        warehouseState,
        warehouseCity,
        warehousePinCode: pincode,
        warehouseAddressLine1: limitWords(ensureWords(address, fallbackAddress), 75),
        warehouseAddressLine2: limitWords(ensureWords((pickup as any).address_2, fallbackAddress), 75),
        warehouseAddressLandMark: limitWords(
          ensureWords((params as any).pickup_landmark || city, `${city} ${state} ${pincode}`),
          50,
        ),
      }

      try {
        const response = await this.request('post', '/api/outbound/save-warehouse-data', warehousePayload)
        const createdWarehouseId = normalizeText(response?.data?.warehouseId)
        if (/^\d+$/.test(createdWarehouseId)) return createdWarehouseId
        throw new HttpError(
          Number(response?.status_code || 502),
          extractBigshipError(response) || 'Bigship warehouse creation failed',
        )
      } catch (error: any) {
        lastError = error
        const message = String(error?.message || '').toLowerCase()
        if (!message.includes('warehouse city') && !message.includes('city is invalid')) {
          throw error
        }
      }
    }

    throw lastError || new HttpError(422, 'Bigship warehouse creation failed')
  }

  private buildCreateOrderPayload(
    params: ShipmentParams,
    segmentType: 'domestic_b2b' | 'domestic_b2c' = 'domestic_b2c',
  ) {
    const item = firstOrderItem(params)
    const orderAmount = Math.max(0, toNumber(params.order_amount ?? item?.price))
    const paymentMode = params.payment_type === 'cod' ? 2 : 1
    const collectableAmount = paymentMode === 2 ? orderAmount : 0
    const invoiceNumber =
      normalizeText(params.invoice_number) || normalizeText(params.order_number)
    const pickupLocation = normalizeText(
      (params as any).bigship_warehouse_id ||
        (params as any).bigshipWarehouseId ||
        params.pickup_location_id ||
        params.pickup?.warehouse_name,
    )

    if (!pickupLocation || !/^\d+$/.test(pickupLocation)) {
      throw new HttpError(
        400,
        'Bigship warehouse ID is required. Set pickup_location_id or bigship_warehouse_id to the Bigship warehouseId for this pickup address.',
      )
    }

    const normalizedBoxes = normalizeBoxes(params).map((box) => ({
      weight_unit: 'kg',
      dimension_unit: 'cm',
      noOfBoxes: box.noOfBoxes,
      dimensions: box.dimensions,
    }))
    const totalNumOfBoxes = normalizedBoxes.reduce((sum, box) => sum + box.noOfBoxes, 0)
    const productName =
      normalizeText((params as any).category_of_goods) ||
      normalizeText(item?.name) ||
      normalizeText(params.courier_partner) ||
      'Goods'
    const shippingPincode = normalizeText(params.consignee?.pincode)
    const inferredShippingLocation = inferBigshipLocationFromPincode(shippingPincode)
    const shippingState = normalizeBigshipLocation(
      (params as any).bigship_shipping_state ||
        inferredShippingLocation?.state ||
        params.consignee?.state,
    )
    const shippingCity = normalizeBigshipLocation(
      (params as any).bigship_shipping_city ||
        inferredShippingLocation?.city ||
        params.consignee?.city,
    )

    const payload: Record<string, any> = {
      segment_type: segmentType,
      MasterOrderPickUpLocation: Number(pickupLocation),
      MasterOrderReturnLocation: Number(pickupLocation),
      MasterOrderDate: new Date(params.order_date || new Date())
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '),
      MasterOrderPaymentMode: paymentMode,
      OrderInvoiceNo: invoiceNumber,
      MasterOrderInvoiceAmount: orderAmount,
      MasterOrderCollectableAmount: paymentMode === 2 ? collectableAmount : '',
      MasterOrderShippingEmail: normalizeText(params.consignee?.email),
      MasterOrderShippingName: normalizeText(params.consignee?.name, 'Customer'),
      MasterOrderShippingMobileNo: indianPhone(params.consignee?.phone),
      MasterOrderShippingAddress: normalizeText(params.consignee?.address),
      MasterOrderShippingAddress2: normalizeText(params.consignee?.address_2),
      MasterOrderShippingLandmark: normalizeText(
        (params as any).delivery_landmark || params.consignee?.city || 'N/A',
        'N/A',
      ),
      MasterOrderShippingZipCode: shippingPincode,
      MasterOrderShippingCountry: normalizeText(params.consignee?.country, 'India') || 'India',
      MasterOrderShippingState: shippingState,
      MasterOrderShippingCity: shippingCity,
      totalNumOfBoxes: segmentType === 'domestic_b2c' ? 1 : totalNumOfBoxes,
      boxes:
        segmentType === 'domestic_b2c'
          ? [
              {
                ...normalizedBoxes[0],
                noOfBoxes: 1,
                products: [
                  {
                    productName,
                    hsn: normalizeText(item?.hsn ?? item?.hsnCode),
                    qty: String(toNumber(item?.qty ?? item?.quantity, 1) || 1),
                    amount: String(toNumber(item?.price, orderAmount)),
                    totalAmount: orderAmount,
                    collectableAmount,
                    categoryId: normalizeText((item as any)?.categoryId, '1') || '1',
                  },
                ],
              },
            ]
          : normalizedBoxes,
    }

    if (segmentType === 'domestic_b2b') {
      payload.ProductName = productName
    }

    return payload
  }

  private pickRate(rates: any[], courierId?: unknown) {
    if (!rates.length) return null
    const requestedCourierId = normalizeText(courierId)
    if (requestedCourierId) {
      const match = rates.find((rate) => normalizeText(rate?.courierId) === requestedCourierId)
      if (match) return match
    }
    return rates[0]
  }

  private buildPlaceOrderForm(
    params: ShipmentParams,
    customGlobalOrderId: string,
    selectedCourierId: string,
  ) {
    const placePayload: Record<string, string> = {
      MasterCustomOrderId: customGlobalOrderId,
      courierId: selectedCourierId,
      riskTypeId: normalizeText((params as any).bigship_risk_type_id, '2') || '2',
    }

    const ewaybillNo = normalizeText(
      params.ewaybill_number || params.ewbn_number || params.ewbn || params.ewb,
    )
    if (ewaybillNo) placePayload.EwaybillNo = ewaybillNo
    const invoiceType = normalizeText((params as any).bigship_invoice_type)
    if (invoiceType) placePayload.invoiceType = invoiceType

    const form = new FormData()
    for (const [key, value] of Object.entries(placePayload)) form.append(key, value)
    return form
  }

  private async createShipmentForSegment(
    params: ShipmentParams,
    segmentType: 'domestic_b2b' | 'domestic_b2c',
  ) {
    const bigshipWarehouseId = await this.resolveWarehouseId(params)
    const paramsWithWarehouse = {
      ...params,
      bigship_warehouse_id: bigshipWarehouseId,
    } as ShipmentParams
    const shippingCityCandidates = this.buildShippingCityCandidates(paramsWithWarehouse)
    let draft: any = null
    let customGlobalOrderId = ''
    let lastDraftError: any = null

    for (const shippingCity of shippingCityCandidates.length ? shippingCityCandidates : ['']) {
      const draftPayload = this.buildCreateOrderPayload(
        { ...paramsWithWarehouse, bigship_shipping_city: shippingCity } as ShipmentParams,
        segmentType,
      )

      try {
        const candidateDraft = await this.request('post', '/api/outbound/create-order', draftPayload)
        const candidateOrderId = normalizeText(candidateDraft?.data?.CustomGlobalOrderId)
        if (candidateDraft?.status !== false && candidateOrderId) {
          draft = candidateDraft
          customGlobalOrderId = candidateOrderId
          break
        }

        const message = extractBigshipError(candidateDraft) || 'Bigship draft order creation failed'
        lastDraftError = new HttpError(Number(candidateDraft?.status_code || 502), message)
        if (!message.toLowerCase().includes('shipping city')) throw lastDraftError
      } catch (error: any) {
        lastDraftError = error
        const message = String(error?.message || '').toLowerCase()
        if (!message.includes('shipping city')) throw error
      }
    }

    if (!draft || !customGlobalOrderId) {
      throw lastDraftError || new HttpError(502, 'Bigship draft order creation failed')
    }

    const rateResponse = await this.request('post', '/api/outbound/courier-wise-shipment-cost', {
      MasterCustomOrderId: customGlobalOrderId,
    })
    const calculatedRates = Array.isArray(rateResponse?.data?.calculatedRates)
      ? rateResponse.data.calculatedRates
      : []
    const selectedRate = this.pickRate(calculatedRates, params.courier_id)
    const selectedCourierId = normalizeText(selectedRate?.courierId || params.courier_id)
    if (!selectedCourierId) {
      throw new HttpError(502, 'Bigship did not return a courier rate for this order')
    }

    const form = this.buildPlaceOrderForm(params, customGlobalOrderId, selectedCourierId)

    const token = await this.ensureToken()
    let placeResponse: any
    try {
      const response = await this.client.post(this.endpoint('/api/outbound/place-order'), form, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      placeResponse = response.data
    } catch (error: any) {
      throw new HttpError(
        Number(error?.response?.status || 502),
        extractBigshipError(error?.response?.data) || error?.message || 'Bigship place order failed',
      )
    }

    const awb = normalizeText(placeResponse?.data?.awb_assigned || placeResponse?.data?.awb)
    const reference = normalizeText(placeResponse?.data?.reference_number || customGlobalOrderId)
    if (placeResponse?.status === false || !awb) {
      throw new HttpError(502, extractBigshipError(placeResponse) || 'Bigship did not return an AWB')
    }

    let label: string | undefined
    try {
      const labelResponse = await this.request('get', '/api/outbound/download-shipment-documents', {
        CustomGlobalOrderId: customGlobalOrderId,
        document_type: 'label',
      })
      label = normalizeText(labelResponse?.data?.AttachmentData) || undefined
    } catch (error: any) {
      console.warn('[Bigship] Label lookup skipped after booking', {
        order_number: params.order_number,
        message: error?.message || error,
      })
    }

    return {
      status: true,
      order_id: customGlobalOrderId,
      shipment_id: reference || customGlobalOrderId,
      awb_number: awb,
      courier_name: selectedRate?.courierName || 'Bigship',
      courier_id: Number(selectedCourierId),
      courier_cost:
        selectedRate?.total !== undefined
          ? toNumber(selectedRate.total)
          : selectedRate?.total_freight !== undefined
            ? toNumber(selectedRate.total_freight)
            : null,
      label,
      provider_reference: customGlobalOrderId,
      provider_request_id: reference || customGlobalOrderId,
      provider_service: selectedRate?.courierType || selectedRate?.planName || undefined,
      provider_mode: selectedRate?.courierType || undefined,
      bigship: {
        segment_type: segmentType,
        draft,
        rate: selectedRate,
        place: placeResponse,
      },
    }
  }

  async createShipment(params: ShipmentParams) {
    return this.createShipmentForSegment(params, 'domestic_b2c')
  }

  async createB2BShipment(params: ShipmentParams) {
    return this.createShipmentForSegment(params, 'domestic_b2b')
  }

  async testCredentials() {
    const token = await this.ensureToken()
    return {
      authenticated: Boolean(token),
      apiBase: this.apiBase,
      username: this.username,
      tokenExpiresAt: this.tokenExpiresAt ? new Date(this.tokenExpiresAt).toISOString() : null,
    }
  }

  async cancelShipment(orderId: string) {
    return this.request('post', '/api/outbound/cancel-order', {
      CustomGlobalOrderId: orderId,
    })
  }

  async trackShipment(orderId: string) {
    return this.request('get', '/api/outbound/track-order', {
      CustomGlobalOrderId: orderId,
    })
  }
}
