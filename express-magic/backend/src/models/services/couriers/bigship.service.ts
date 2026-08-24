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
      this.username = cfg.username || this.username
      this.password = cfg.password || this.password
      this.accessKey = cfg.accessKey || this.accessKey
    }

    if (this.runtimeConfigOverrides) {
      this.apiBase = this.runtimeConfigOverrides.apiBase || this.apiBase
      this.username = this.runtimeConfigOverrides.username || this.username
      this.password = this.runtimeConfigOverrides.password || this.password
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

    const response = await this.client.post(this.endpoint('/api/outbound/login'), {
      username: this.username,
      password: this.password,
      access_key: this.accessKey,
    })
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
      MasterOrderShippingZipCode: normalizeText(params.consignee?.pincode),
      MasterOrderShippingCountry: normalizeText(params.consignee?.country, 'India') || 'India',
      MasterOrderShippingState: normalizeText(params.consignee?.state),
      MasterOrderShippingCity: normalizeText(params.consignee?.city),
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
    const draftPayload = this.buildCreateOrderPayload(params, segmentType)
    const draft = await this.request('post', '/api/outbound/create-order', draftPayload)
    const customGlobalOrderId = normalizeText(draft?.data?.CustomGlobalOrderId)
    if (draft?.status === false || !customGlobalOrderId) {
      throw new HttpError(502, extractBigshipError(draft) || 'Bigship draft order creation failed')
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
