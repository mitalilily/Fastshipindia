import axios, { AxiosInstance } from 'axios'
import { HttpError } from '../../../utils/classes'
import {
  getEffectiveCourierConfig,
  ShipmozoConfig,
} from '../courierCredentials.service'
import type { ShipmentParams } from '../shiprocket.service'

type ShipmozoServiceOptions = {
  configOverrides?: Partial<ShipmozoConfig>
}

type ShipmozoKeyPair = {
  publicKey: string
  privateKey: string
}

const normalizeText = (value: unknown, fallback = '') =>
  String(value ?? fallback).trim()

const normalizeLoginCredential = (value: unknown, fallback = '') =>
  normalizeText(value, fallback).replace(/\\@/g, '@')

const normalizeBaseUrl = (value: unknown) =>
  normalizeText(value, 'https://shipping-api.com/app/api/v1').replace(/\/+$/, '')

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toPositiveInt = (value: unknown, fallback = 1) => {
  const parsed = Math.round(toNumber(value, fallback))
  return parsed > 0 ? parsed : fallback
}

const toWeightGrams = (value: unknown, fallback = 500) => {
  const parsed = toNumber(value, fallback)
  if (parsed <= 0) return fallback
  return parsed > 50 ? Math.round(parsed) : Math.round(parsed * 1000)
}

const normalizePincode = (value: unknown) => normalizeText(value).replace(/\D/g, '')

const indianPhone = (value: unknown) => {
  const digits = normalizeText(value).replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

const firstOrderItem = (params: ShipmentParams) =>
  Array.isArray(params.order_items) && params.order_items.length
    ? params.order_items[0]
    : null

const extractShipmozoError = (value: any): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractShipmozoError).filter(Boolean).join(' | ')
  if (typeof value === 'object') {
    const direct = value.message || value.error || value.Info || value.info
    if (direct) return extractShipmozoError(direct)
    return Object.values(value).map(extractShipmozoError).filter(Boolean).join(' | ')
  }
  return String(value)
}

const isSuccessResponse = (response: any) =>
  String(response?.result ?? '').trim() === '1' ||
  response?.success === true ||
  String(response?.status ?? '').toLowerCase() === 'success'

const getResponseData = (response: any) => response?.data ?? response

const pickFirst = (...values: unknown[]) => values.map((value) => normalizeText(value)).find(Boolean) || ''

export class ShipmozoService {
  private apiBase = 'https://shipping-api.com/app/api/v1'
  private username = ''
  private password = ''
  private publicKey = ''
  private privateKey = ''
  private overrides: Partial<ShipmozoConfig>
  private client: AxiosInstance
  private static cachedConfig: ShipmozoConfig | null | undefined

  constructor(options: ShipmozoServiceOptions = {}) {
    this.overrides = options.configOverrides ?? {}
    this.client = axios.create({ timeout: 45000 })
  }

  static clearCachedConfig() {
    ShipmozoService.cachedConfig = undefined
  }

  private async loadConfig() {
    if (ShipmozoService.cachedConfig === undefined) {
      ShipmozoService.cachedConfig = await getEffectiveCourierConfig<ShipmozoConfig>(
        'shipmozo',
        'b2c',
      )
    }

    const cfg = ShipmozoService.cachedConfig || {}
    this.apiBase = normalizeBaseUrl(
      this.overrides.apiBase || cfg.apiBase || process.env.SHIPMOZO_API_BASE,
    )
    this.username = normalizeLoginCredential(
      this.overrides.username || cfg.username || process.env.SHIPMOZO_USERNAME,
    )
    this.password = normalizeLoginCredential(
      this.overrides.password || cfg.password || process.env.SHIPMOZO_PASSWORD,
    )
    this.publicKey = normalizeText(
      this.overrides.publicKey || cfg.publicKey || process.env.SHIPMOZO_PUBLIC_KEY,
    )
    this.privateKey = normalizeText(
      this.overrides.privateKey || cfg.privateKey || process.env.SHIPMOZO_PRIVATE_KEY,
    )
  }

  private async request<T = any>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<T> {
    await this.loadConfig()
    const url = `${this.apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    try {
      const response = await this.client.request({
        method,
        url,
        data: body,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(headers || (await this.getAuthHeaders())),
        },
      })
      return response.data
    } catch (error: any) {
      const status = Number(error?.response?.status || 502)
      const message =
        extractShipmozoError(error?.response?.data) ||
        error?.message ||
        'Shipmozo API request failed'
      throw new HttpError(status >= 400 && status < 600 ? status : 502, message)
    }
  }

  async loginWithCredentials(config?: Partial<ShipmozoConfig>): Promise<ShipmozoKeyPair> {
    const apiBase = normalizeBaseUrl(config?.apiBase || this.overrides.apiBase || this.apiBase)
    const username = normalizeLoginCredential(config?.username || this.overrides.username || this.username)
    const password = normalizeLoginCredential(config?.password || this.overrides.password || this.password)

    if (!username || !password) {
      throw new HttpError(400, 'Shipmozo username and password are required.')
    }

    try {
      const response = await this.client.post(
        `${apiBase}/login`,
        { username, password },
        { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 30000 },
      )
      if (!isSuccessResponse(response.data)) {
        throw new HttpError(401, extractShipmozoError(response.data) || 'Shipmozo login failed')
      }
      const data = getResponseData(response.data)
      const row = Array.isArray(data) ? data[0] : data
      const publicKey = normalizeText(row?.public_key || row?.publicKey)
      const privateKey = normalizeText(row?.private_key || row?.privateKey)
      if (!publicKey || !privateKey) {
        throw new HttpError(502, 'Shipmozo login did not return API keys.')
      }
      return { publicKey, privateKey }
    } catch (error: any) {
      if (error instanceof HttpError) throw error
      const status = Number(error?.response?.status || 502)
      const message =
        extractShipmozoError(error?.response?.data) ||
        error?.message ||
        'Shipmozo login failed'
      throw new HttpError(status >= 400 && status < 600 ? status : 502, message)
    }
  }

  private async getAuthHeaders() {
    await this.loadConfig()
    if (!this.publicKey || !this.privateKey) {
      const keys = await this.loginWithCredentials()
      this.publicKey = keys.publicKey
      this.privateKey = keys.privateKey
    }
    if (!this.publicKey || !this.privateKey) {
      throw new HttpError(400, 'Shipmozo public/private keys are required.')
    }
    return {
      'public-key': this.publicKey,
      'private-key': this.privateKey,
    }
  }

  async testCredentials(config?: Partial<ShipmozoConfig>) {
    await this.loadConfig()
    const apiBase = normalizeBaseUrl(config?.apiBase || this.overrides.apiBase || this.apiBase)
    const username = normalizeLoginCredential(config?.username || this.overrides.username || this.username)
    const password = normalizeLoginCredential(config?.password || this.overrides.password || this.password)
    const suppliedPublicKey = normalizeText(config?.publicKey || this.overrides.publicKey || this.publicKey)

    let keys: ShipmozoKeyPair | null = null
    if (username && password) {
      keys = await this.loginWithCredentials({ apiBase, username, password })
    }

    const publicKey = normalizeText(keys?.publicKey || suppliedPublicKey)
    const privateKey = normalizeText(keys?.privateKey || config?.privateKey || this.overrides.privateKey || this.privateKey)
    if (!publicKey || !privateKey) {
      throw new HttpError(400, 'Shipmozo credentials need username/password or public/private keys.')
    }

    const info = await this.request(
      'GET',
      '/info',
      undefined,
      { 'public-key': publicKey, 'private-key': privateKey },
    )
    if (!isSuccessResponse(info)) {
      throw new HttpError(401, extractShipmozoError(info) || 'Shipmozo authentication failed')
    }

    return {
      authenticated: true,
      apiBase,
      username,
      publicKeyMatches: suppliedPublicKey ? suppliedPublicKey === publicKey : true,
      publicKey,
      privateKey,
    }
  }

  async checkServiceability(params: { pickupPincode: unknown; deliveryPincode: unknown }) {
    const response = await this.request('POST', '/pincode-serviceability', {
      pickup_pincode: Number(normalizePincode(params.pickupPincode)),
      delivery_pincode: Number(normalizePincode(params.deliveryPincode)),
    })
    if (!isSuccessResponse(response)) {
      throw new HttpError(422, extractShipmozoError(response) || 'Shipmozo route is not serviceable')
    }
    return response
  }

  async rateCalculator(params: {
    pickupPincode: unknown
    deliveryPincode: unknown
    paymentType: unknown
    orderAmount: unknown
    codAmount?: unknown
    weight: unknown
    length: unknown
    breadth: unknown
    height: unknown
    orderId?: unknown
  }) {
    const orderId = normalizeText(params.orderId)
    const payload = {
      ...(orderId && /^\d+$/.test(orderId) ? { order_id: orderId } : {}),
      pickup_pincode: Number(normalizePincode(params.pickupPincode)),
      delivery_pincode: Number(normalizePincode(params.deliveryPincode)),
      payment_type: normalizeText(params.paymentType).toLowerCase() === 'cod' ? 'COD' : 'PREPAID',
      shipment_type: 'FORWARD',
      order_amount: Math.max(1, toNumber(params.orderAmount, 1)),
      type_of_package: 'SPS',
      rov_type: 'ROV_OWNER',
      cod_amount:
        normalizeText(params.paymentType).toLowerCase() === 'cod'
          ? String(Math.max(0, toNumber(params.codAmount ?? params.orderAmount, 0)))
          : '',
      weight: toWeightGrams(params.weight),
      dimensions: [
        {
          no_of_box: '1',
          length: String(toPositiveInt(params.length, 10)),
          width: String(toPositiveInt(params.breadth, 10)),
          height: String(toPositiveInt(params.height, 10)),
        },
      ],
    }

    const response = await this.request('POST', '/rate-calculator', payload)
    if (!isSuccessResponse(response)) {
      throw new HttpError(422, extractShipmozoError(response) || 'Shipmozo rate calculator failed')
    }
    return response
  }

  async getWarehouses() {
    const response = await this.request('GET', '/get-warehouses')
    if (!isSuccessResponse(response)) {
      throw new HttpError(502, extractShipmozoError(response) || 'Shipmozo warehouse fetch failed')
    }
    const data = getResponseData(response)
    return Array.isArray(data) ? data : []
  }

  private async resolveWarehouseId(params: ShipmentParams) {
    const explicit = pickFirst((params as any).shipmozo_warehouse_id, (params as any).warehouse_id)
    if (explicit) return explicit

    const pickupPin = normalizePincode(params.pickup?.pincode || params.origin || params.pickup_pincode)
    const warehouses = await this.getWarehouses().catch(() => [])
    const activeMatches = warehouses.filter((warehouse: any) => {
      const pincode = normalizePincode(warehouse?.pincode || warehouse?.pin_code)
      const status = normalizeText(warehouse?.status).toUpperCase()
      return pincode === pickupPin && (!status || status === 'ACTIVE')
    })
    const selected =
      activeMatches.find((warehouse: any) => normalizeText(warehouse?.default).toUpperCase() === 'YES') ||
      activeMatches[0]
    if (selected?.id) return String(selected.id)
    if (selected?.warehouse_id) return String(selected.warehouse_id)

    const titleBase = pickFirst(params.pickup?.warehouse_name, params.pickup?.name, 'FastShip Pickup')
    const createResponse = await this.request('POST', '/create-warehouse', {
      address_title: `${titleBase}-${pickupPin}`.slice(0, 80),
      name: params.pickup?.name || params.pickup?.warehouse_name || titleBase,
      phone: indianPhone(params.pickup?.phone),
      alternate_phone: indianPhone(params.pickup?.phone),
      email: '',
      address_line_one: params.pickup?.address || titleBase,
      address_line_two: params.pickup?.address_2 || params.pickup?.city || '',
      pin_code: Number(pickupPin),
    })
    if (!isSuccessResponse(createResponse)) {
      throw new HttpError(422, extractShipmozoError(createResponse) || 'Shipmozo warehouse creation failed')
    }
    const created = getResponseData(createResponse)
    const warehouseId = pickFirst(created?.warehouse_id, created?.id)
    if (!warehouseId) {
      throw new HttpError(502, 'Shipmozo did not return warehouse_id.')
    }
    return warehouseId
  }

  private buildProductDetail(params: ShipmentParams) {
    const item = firstOrderItem(params)
    return [
      {
        name: normalizeText(item?.name, 'Goods').slice(0, 120),
        sku_number: normalizeText(item?.sku, params.order_number || 'SKU').slice(0, 80),
        quantity: toPositiveInt(item?.qty ?? item?.quantity, 1),
        discount: normalizeText(item?.discount || ''),
        hsn: normalizeText(item?.hsn || item?.hsnCode || ''),
        unit_price: Math.max(1, toNumber(item?.price ?? params.order_amount, 1)),
        product_category: normalizeText((params as any).category_of_goods, 'Other') || 'Other',
      },
    ]
  }

  async createShipment(params: ShipmentParams) {
    const warehouseId = await this.resolveWarehouseId(params)
    const orderId = normalizeText(params.order_number)
    const paymentType = params.payment_type === 'cod' ? 'COD' : 'PREPAID'
    const codAmount = paymentType === 'COD' ? String(Math.max(0, toNumber(params.order_amount, 0))) : ''
    const orderDate =
      params.order_date instanceof Date
        ? params.order_date.toISOString().slice(0, 10)
        : normalizeText(params.order_date, new Date().toISOString().slice(0, 10)).slice(0, 10)

    const pushPayload = {
      order_id: orderId,
      order_date: orderDate,
      order_type: normalizeText((params as any).shipmozo_order_type, 'ESSENTIALS') || 'ESSENTIALS',
      consignee_name: params.consignee?.name || params.consignee?.company_name || 'Customer',
      consignee_phone: indianPhone(params.consignee?.phone),
      consignee_alternate_phone: indianPhone((params.consignee as any)?.alternate_phone),
      consignee_email: params.consignee?.email || '',
      consignee_address_line_one: params.consignee?.address || '',
      consignee_address_line_two: params.consignee?.address_2 || '',
      consignee_pin_code: Number(normalizePincode(params.consignee?.pincode)),
      consignee_city: params.consignee?.city || '',
      consignee_state: params.consignee?.state || '',
      product_detail: this.buildProductDetail(params),
      payment_type: paymentType,
      cod_amount: codAmount,
      weight: toWeightGrams(params.package_weight ?? params.weight),
      length: toPositiveInt(params.package_length ?? params.length, 10),
      width: toPositiveInt(params.package_breadth ?? params.breadth, 10),
      height: toPositiveInt(params.package_height ?? params.height, 10),
      warehouse_id: warehouseId,
      gst_ewaybill_number: normalizeText(params.ewaybill_number || params.ewbn || params.ewb),
      gstin_number: normalizeText(params.company?.gst || params.pickup?.gst_number || ''),
    }

    const push = await this.request('POST', '/push-order', pushPayload)
    if (!isSuccessResponse(push)) {
      throw new HttpError(422, extractShipmozoError(push) || 'Shipmozo push-order failed')
    }

    const rates = await this.rateCalculator({
      pickupPincode: params.pickup?.pincode || params.origin || params.pickup_pincode,
      deliveryPincode: params.consignee?.pincode || params.destination || params.destination_pincode,
      paymentType: params.payment_type,
      orderAmount: params.order_amount,
      codAmount,
      weight: params.package_weight ?? params.weight,
      length: params.package_length ?? params.length,
      breadth: params.package_breadth ?? params.breadth,
      height: params.package_height ?? params.height,
      orderId,
    })
    const rateList = Array.isArray(rates?.data) ? rates.data : []
    const requestedCourierId = Number(params.courier_id)
    const sortedRates = [...rateList].sort(
      (a: any, b: any) =>
        toNumber(a?.total_charges ?? a?.shipping_charges, Number.MAX_SAFE_INTEGER) -
        toNumber(b?.total_charges ?? b?.shipping_charges, Number.MAX_SAFE_INTEGER),
    )
    const selectedRate =
      rateList.find((rate: any) => Number(rate?.id) === requestedCourierId) || sortedRates[0]
    if (!selectedRate?.id) {
      throw new HttpError(422, 'Shipmozo did not return a courier rate for this route.')
    }

    const assign = await this.request('POST', '/assign-courier', {
      order_id: orderId,
      courier_id: Number(selectedRate.id),
    })
    if (!isSuccessResponse(assign)) {
      throw new HttpError(422, extractShipmozoError(assign) || 'Shipmozo assign-courier failed')
    }

    let pickupResponse: any = null
    const assignData = getResponseData(assign)
    let awb = pickFirst(assignData?.awb_number, assignData?.awb, assignData?.lr_number)
    if (!awb || normalizeText(selectedRate?.pickups_automatically_scheduled).toUpperCase() === 'NO') {
      pickupResponse = await this.request('POST', '/schedule-pickup', { order_id: orderId }).catch((error: any) => {
        const message = normalizeText(error?.message).toLowerCase()
        if (message.includes('already') || message.includes('automatic')) return null
        throw error
      })
      const pickupData = getResponseData(pickupResponse)
      awb = pickFirst(awb, pickupData?.awb_number, pickupData?.awb, pickupData?.lr_number)
    }

    if (!awb) {
      const orderDetail = await this.getOrderDetail(orderId).catch(() => null)
      const detailData = getResponseData(orderDetail)
      awb = pickFirst(detailData?.awb_number, detailData?.awb, detailData?.lr_number)
    }

    if (!awb) {
      throw new HttpError(502, 'Shipmozo shipment was created but AWB was not returned.')
    }

    return {
      status: true,
      order_id: orderId,
      shipment_id: orderId,
      awb_number: awb,
      courier_name: pickFirst(selectedRate?.name, assignData?.courier, 'Shipmozo'),
      courier_id: Number(selectedRate.id),
      courier_cost: toNumber(selectedRate?.total_charges ?? selectedRate?.shipping_charges, 0),
      provider_reference: pickFirst(assignData?.reference_id, orderId),
      provider_request_id: pickFirst(assignData?.reference_id, orderId),
      provider_service: pickFirst(selectedRate?.name, assignData?.courier),
      provider_mode: 'surface',
      shipmozo: {
        push,
        rates,
        selected_rate: selectedRate,
        assign,
        pickup: pickupResponse,
        warehouse_id: warehouseId,
      },
    }
  }

  async getOrderDetail(orderId: unknown) {
    const id = encodeURIComponent(normalizeText(orderId))
    return this.request('GET', `/get-order-detail/${id}`)
  }

  async trackShipment(awbNumber: unknown) {
    const awb = encodeURIComponent(normalizeText(awbNumber))
    return this.request('GET', `/track-order?awb_number=${awb}`)
  }

  async cancelOrder(orderId: unknown, awbNumber: unknown) {
    const response = await this.request('POST', '/cancel-order', {
      order_id: normalizeText(orderId),
      awb_number: normalizeText(awbNumber),
    })
    if (!isSuccessResponse(response)) {
      throw new HttpError(422, extractShipmozoError(response) || 'Shipmozo cancellation failed')
    }
    return response
  }
}
