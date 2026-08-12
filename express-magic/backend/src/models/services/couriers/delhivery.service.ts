import axios, { type AxiosRequestConfig } from 'axios'
import qs from 'qs'
import { DelhiveryManifestError, HttpError } from '../../../utils/classes'
import {
  normalizeCourierId,
  resolveDelhiveryShippingMode,
} from '../../../utils/delhiveryCourier'
import { getDelhiveryCredentials } from '../delhiveryCredentials.service'
import { ShipmentParams } from '../shiprocket.service'

const parseTimeout = (value: string | undefined, fallbackMs: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs
}

const extractProviderErrorMessage = (value: unknown): string | null => {
  if (!value) return null

  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = extractProviderErrorMessage(entry)
      if (message) return message
    }
    return null
  }

  if (typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const message = extractProviderErrorMessage(nestedValue)
      if (message) return message
    }
  }

  return null
}

const isTimeoutError = (err: any) => {
  const message = String(err?.message || '')
    .trim()
    .toLowerCase()

  return (
    err?.code === 'ECONNABORTED' ||
    err?.code === 'ETIMEDOUT' ||
    message.includes('timeout') ||
    message.includes('timed out')
  )
}

const getExistingPickupRequestId = (message: unknown): string | null => {
  const normalized = String(message || '').trim()
  if (!normalized) return null

  const lower = normalized.toLowerCase()
  if (!lower.includes('pickup request') || !lower.includes('already exist')) {
    return null
  }

  return normalized.match(/pickup request\s+(\d+)/i)?.[1] || null
}

const normalizeDelhiveryWeightGrams = (value: unknown, fallbackGrams = 500) => {
  const numericValue = Number(value ?? 0)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return fallbackGrams

  // Shiplifi stores B2C weights in grams; older integrations may still send kg.
  return numericValue > 50 ? Math.round(numericValue) : Math.round(numericValue * 1000)
}

const normalizeDelhiveryPincode = (value: unknown, field = 'pincode') => {
  const pincode = String(value ?? '').trim()
  if (!/^\d{6}$/.test(pincode)) {
    throw new HttpError(400, `${field} must be a valid 6-digit pincode`)
  }
  return pincode
}

const normalizeDelhiveryMot = (value: unknown) => {
  const mot = String(value || 'S')
    .trim()
    .toUpperCase()
  if (!['S', 'E', 'N'].includes(mot)) {
    throw new HttpError(400, "mot must be one of 'S', 'E', or 'N'")
  }
  return mot as 'S' | 'E' | 'N'
}

const normalizeDelhiveryProductType = (value: unknown) => {
  const pdt = String(value ?? 'B2C')
    .trim()
    .toUpperCase()
  if (!pdt) return undefined
  if (!['B2B', 'B2C'].includes(pdt)) {
    throw new HttpError(400, "pdt must be 'B2B', 'B2C', or empty")
  }
  return pdt as 'B2B' | 'B2C'
}

const normalizeDelhiveryExpectedPickupDate = (value: unknown) => {
  const expectedPickupDate = String(value ?? '').trim()
  if (!expectedPickupDate) return undefined
  if (!/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(expectedPickupDate)) {
    throw new HttpError(400, 'expected_pickup_date must be in YYYY-MM-DD or YYYY-MM-DD HH:mm format')
  }
  return expectedPickupDate
}

const normalizeDelhiveryWaybillCount = (value: unknown) => {
  const count = Number(value)
  if (!Number.isInteger(count) || count < 1 || count > 10000) {
    throw new HttpError(400, 'count must be an integer between 1 and 10000')
  }
  return count
}

const normalizeDelhiveryB2CTrackingWaybills = (value: unknown) => {
  const rawWaybill = String(value ?? '').trim()
  if (!rawWaybill) throw new HttpError(400, 'waybill is required')

  const waybills = rawWaybill
    .split(',')
    .map((waybill) => waybill.trim())
    .filter(Boolean)

  if (waybills.length === 0) throw new HttpError(400, 'waybill is required')
  if (waybills.length > 50) {
    throw new HttpError(400, 'waybill supports up to 50 comma-separated values')
  }

  return waybills.join(',')
}

const normalizeOptionalDelhiveryText = (value: unknown) => {
  if (value === undefined || value === null) return undefined
  return String(value).trim()
}

const normalizeDelhiveryB2CShippingMode = (value: unknown) => {
  const mode = String(value ?? '')
    .trim()
    .toUpperCase()
  if (!['E', 'S'].includes(mode)) {
    throw new HttpError(400, "md must be one of 'E' or 'S'")
  }
  return mode as 'E' | 'S'
}

const normalizeDelhiveryB2CShipmentStatus = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  const map: Record<string, 'Delivered' | 'RTO' | 'DTO'> = {
    delivered: 'Delivered',
    rto: 'RTO',
    dto: 'DTO',
  }
  const status = map[normalized]
  if (!status) {
    throw new HttpError(400, "ss must be one of 'Delivered', 'RTO', or 'DTO'")
  }
  return status
}

const normalizeDelhiveryB2CShippingCostPaymentType = (value: unknown) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  const map: Record<string, 'Pre-paid' | 'COD'> = {
    prepaid: 'Pre-paid',
    prepaidmode: 'Pre-paid',
    cod: 'COD',
  }
  const paymentType = map[normalized]
  if (!paymentType) {
    throw new HttpError(400, "pt must be 'Pre-paid' or 'COD'")
  }
  return paymentType
}

const normalizeRequiredPositiveInteger = (value: unknown, field: string) => {
  const numericValue = Number(value)
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new HttpError(400, `${field} must be a positive integer`)
  }
  return numericValue
}

const normalizeOptionalPositiveInteger = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === '') return undefined
  return normalizeRequiredPositiveInteger(value, field)
}

const normalizeDelhiveryB2CShippingCostParams = (params: {
  md: unknown
  cgm: unknown
  o_pin: unknown
  d_pin: unknown
  ss: unknown
  pt: unknown
  l?: unknown
  b?: unknown
  h?: unknown
  ipkg_type?: unknown
}) => {
  const optionalPackageType = normalizeOptionalDelhiveryText(params.ipkg_type)
  const length = normalizeOptionalPositiveInteger(params.l, 'l')
  const breadth = normalizeOptionalPositiveInteger(params.b, 'b')
  const height = normalizeOptionalPositiveInteger(params.h, 'h')

  return {
    md: normalizeDelhiveryB2CShippingMode(params.md),
    cgm: normalizeRequiredPositiveInteger(params.cgm, 'cgm'),
    o_pin: normalizeDelhiveryPincode(params.o_pin, 'o_pin'),
    d_pin: normalizeDelhiveryPincode(params.d_pin, 'd_pin'),
    ss: normalizeDelhiveryB2CShipmentStatus(params.ss),
    pt: normalizeDelhiveryB2CShippingCostPaymentType(params.pt),
    ...(length !== undefined ? { l: length } : {}),
    ...(breadth !== undefined ? { b: breadth } : {}),
    ...(height !== undefined ? { h: height } : {}),
    ...(optionalPackageType ? { ipkg_type: optionalPackageType } : {}),
  }
}

const normalizeOptionalDelhiveryBooleanText = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === '') return undefined
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true') return 'true'
  if (normalized === 'false') return 'false'
  throw new HttpError(400, `${field} must be true or false`)
}

const normalizeOptionalDelhiveryB2CLabelPdfSize = (value: unknown) => {
  const pdfSize = String(value ?? '')
    .trim()
    .toUpperCase()
  if (!pdfSize) return undefined
  if (!['A4', '4R'].includes(pdfSize)) {
    throw new HttpError(400, "pdf_size must be 'A4' or '4R'")
  }
  return pdfSize as 'A4' | '4R'
}

const normalizeDelhiveryB2CShippingLabelParams = (params: {
  waybill: unknown
  pdf?: unknown
  pdf_size?: unknown
}) => {
  const waybill = requiredManifestText(params.waybill, 'waybill')
  const pdf = normalizeOptionalDelhiveryBooleanText(params.pdf, 'pdf')
  const pdfSize = normalizeOptionalDelhiveryB2CLabelPdfSize(params.pdf_size)

  return {
    wbns: waybill,
    ...(pdf !== undefined ? { pdf } : {}),
    ...(pdfSize ? { pdf_size: pdfSize } : {}),
  }
}

const normalizeDelhiveryPickupDate = (value: unknown) => {
  const pickupDate = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
    throw new HttpError(400, 'pickup_date must be in YYYY-MM-DD format')
  }
  return pickupDate
}

const normalizeDelhiveryPickupTime = (value: unknown) => {
  const pickupTime = String(value ?? '').trim()
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(pickupTime)) {
    throw new HttpError(400, 'pickup_time must be in HH:mm:ss format')
  }
  return pickupTime
}

const normalizeDelhiveryB2CPickupRequestPayload = (payload: unknown) => {
  const input = payload as any
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Pickup request payload is required')
  }

  return {
    pickup_time: normalizeDelhiveryPickupTime(input.pickup_time),
    pickup_date: normalizeDelhiveryPickupDate(input.pickup_date),
    pickup_location: requiredManifestText(input.pickup_location, 'pickup_location'),
    expected_package_count: normalizeRequiredPositiveInteger(
      input.expected_package_count,
      'expected_package_count',
    ),
  }
}

const normalizeDelhiveryB2CPaymentMode = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  const map: Record<string, 'Pickup' | 'COD' | 'Prepaid' | 'REPL'> = {
    pickup: 'Pickup',
    cod: 'COD',
    prepaid: 'Prepaid',
    repl: 'REPL',
  }
  const paymentMode = map[normalized]
  if (!paymentMode) {
    throw new HttpError(400, "payment_mode must be one of 'Pickup', 'COD', 'Prepaid', or 'REPL'")
  }
  return paymentMode
}

const normalizeDelhiveryB2CEditPaymentMode = (value: unknown) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  const map: Record<string, 'COD' | 'Pre-paid'> = {
    cod: 'COD',
    prepaid: 'Pre-paid',
    prepaidmode: 'Pre-paid',
  }
  const paymentMode = map[normalized]
  if (!paymentMode) {
    throw new HttpError(400, "pt must be 'COD' or 'Pre-paid'")
  }
  return paymentMode
}

const normalizeOptionalPositiveNumber = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === '') return undefined
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new HttpError(400, `${field} must be a positive number`)
  }
  return numericValue
}

const normalizeOptionalNonNegativeNumber = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === '') return undefined
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new HttpError(400, `${field} must be a non-negative number`)
  }
  return numericValue
}

const normalizeDelhiveryB2CEditPayload = (payload: unknown) => {
  const input = payload as any
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Shipment edit payload is required')
  }

  const normalized: Record<string, unknown> = {
    waybill: requiredManifestText(input.waybill, 'waybill'),
  }

  const copyTextField = (sourceKey: string, targetKey = sourceKey) => {
    if (input[sourceKey] === undefined || input[sourceKey] === null) return
    const value = String(input[sourceKey]).trim()
    if (value) normalized[targetKey] = value
  }

  copyTextField('name')
  copyTextField('add')
  copyTextField('products_desc')

  if (input.phone !== undefined && input.phone !== null) {
    const phones = Array.isArray(input.phone) ? input.phone : [input.phone]
    const normalizedPhones = phones.map((phone: unknown) => String(phone).trim()).filter(Boolean)
    if (normalizedPhones.length) normalized.phone = normalizedPhones
  }

  if (input.pt !== undefined && input.pt !== null && String(input.pt).trim()) {
    normalized.pt = normalizeDelhiveryB2CEditPaymentMode(input.pt)
  }

  for (const field of ['gm', 'shipment_height', 'shipment_width', 'shipment_length']) {
    const value = normalizeOptionalPositiveNumber(input[field], field)
    if (value !== undefined) normalized[field] = value
  }

  const cod = normalizeOptionalNonNegativeNumber(input.cod, 'cod')
  if (cod !== undefined) normalized.cod = cod
  if (normalized.pt === 'COD' && normalized.cod === undefined) {
    throw new HttpError(400, 'cod is required when pt is COD')
  }

  if (Object.keys(normalized).length === 1) {
    throw new HttpError(400, 'At least one editable shipment field is required')
  }

  return normalized
}

const normalizeDelhiveryB2CEwaybillUpdatePayload = (waybill: unknown, payload: unknown) => {
  const normalizedWaybill = requiredManifestText(waybill, 'waybill')
  const input = payload as any
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Ewaybill update payload is required')
  }

  const sourceRows = Array.isArray(input.data) ? input.data : [input]
  if (sourceRows.length === 0) {
    throw new HttpError(400, 'data must contain at least one ewaybill entry')
  }

  const data = sourceRows.map((entry: any, index: number) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new HttpError(400, `data[${index}] must be an object`)
    }
    return {
      dcn: requiredManifestText(entry.dcn, `data[${index}].dcn`),
      ewbn: requiredManifestText(entry.ewbn, `data[${index}].ewbn`),
    }
  })

  return { waybill: normalizedWaybill, payload: { data } }
}

const requiredManifestText = (value: unknown, field: string) => {
  const text = String(value ?? '').trim()
  if (!text) throw new HttpError(400, `${field} is required`)
  return text
}

const normalizeDelhiveryPositiveIntegerText = (value: unknown, field: string) => {
  const text = requiredManifestText(value, field)
  const numericValue = Number(text)
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new HttpError(400, `${field} must be a positive integer`)
  }
  return text
}

const normalizeDelhiveryNonNegativeIntegerText = (value: unknown, field: string) => {
  const text = requiredManifestText(value, field)
  const numericValue = Number(text)
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new HttpError(400, `${field} must be a non-negative integer`)
  }
  return text
}

const normalizeDelhiveryB2CShipmentManifest = (
  payload: unknown,
  options: { requireMps?: boolean } = {},
) => {
  const manifest = payload as any
  if (!manifest || typeof manifest !== 'object') {
    throw new HttpError(400, 'Shipment manifest payload is required')
  }
  if (!Array.isArray(manifest.shipments) || manifest.shipments.length === 0) {
    throw new HttpError(400, 'shipments must be a non-empty array')
  }
  if (options.requireMps && manifest.shipments.length < 2) {
    throw new HttpError(400, 'MPS shipments must include at least two boxes in shipments')
  }

  const pickupName = requiredManifestText(manifest.pickup_location?.name, 'pickup_location.name')
  const shipments = manifest.shipments.map((shipment: any, index: number) => {
    if (!shipment || typeof shipment !== 'object') {
      throw new HttpError(400, `shipments[${index}] must be an object`)
    }

    const normalizedShipment = {
      ...shipment,
      name: requiredManifestText(shipment.name, `shipments[${index}].name`),
      order: requiredManifestText(shipment.order, `shipments[${index}].order`),
      phone: requiredManifestText(shipment.phone, `shipments[${index}].phone`),
      add: requiredManifestText(shipment.add, `shipments[${index}].add`),
      pin: normalizeDelhiveryPincode(shipment.pin, `shipments[${index}].pin`),
      payment_mode: normalizeDelhiveryB2CPaymentMode(shipment.payment_mode),
    }

    if (!options.requireMps) return normalizedShipment

    return {
      ...normalizedShipment,
      shipment_type: 'MPS',
      mps_amount: normalizeDelhiveryNonNegativeIntegerText(
        shipment.mps_amount,
        `shipments[${index}].mps_amount`,
      ),
      mps_children: normalizeDelhiveryPositiveIntegerText(
        shipment.mps_children,
        `shipments[${index}].mps_children`,
      ),
      master_id: requiredManifestText(shipment.master_id, `shipments[${index}].master_id`),
      waybill: requiredManifestText(shipment.waybill, `shipments[${index}].waybill`),
    }
  })

  if (options.requireMps) {
    const expectedChildren = shipments.length
    const masterId = String(shipments[0].master_id)
    shipments.forEach((shipment: any, index: number) => {
      if (Number(shipment.mps_children) !== expectedChildren) {
        throw new HttpError(
          400,
          `shipments[${index}].mps_children must equal total shipments count ${expectedChildren}`,
        )
      }
      if (String(shipment.master_id) !== masterId) {
        throw new HttpError(400, `shipments[${index}].master_id must match the master waybill`)
      }
    })
  }

  return {
    ...manifest,
    shipments,
    pickup_location: {
      ...manifest.pickup_location,
      name: pickupName,
    },
  }
}

export const isDelhiveryB2CPincodeServiceable = (response: unknown) => {
  const payload = response as any
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.delivery_codes)
      ? payload.delivery_codes
      : Array.isArray(payload?.data)
        ? payload.data
        : []

  return rows.some((row: any) => {
    const details = row?.postal_code || row
    return String(details?.remarks ?? details?.remark ?? '').trim().toLowerCase() !== 'embargo'
  })
}

export const isDelhiveryB2CHeavyPincodeServiceable = (response: unknown) => {
  const payload = response as any
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.serviceability)
        ? payload.serviceability
        : Array.isArray(payload?.pincode_serviceability_data)
          ? payload.pincode_serviceability_data
          : Array.isArray(payload?.serviceability_data)
            ? payload.serviceability_data
            : []

  const stringify = (value: unknown) => {
    try {
      return JSON.stringify(value || {}).toLowerCase()
    } catch {
      return String(value || '').toLowerCase()
    }
  }

  const candidates = rows.length ? rows : payload ? [payload] : []

  return candidates.some((row: any) => {
    const details = row?.postal_code || row?.pincode || row
    const responseText = stringify(details)
    if (
      responseText.includes('nsz') ||
      responseText.includes('non serviceable') ||
      responseText.includes('non-serviceable')
    ) {
      return false
    }

    const serviceable =
      details?.serviceable ?? details?.is_serviceable ?? details?.isServiceable ?? details?.active
    if (typeof serviceable === 'boolean') return serviceable

    const status = String(
      details?.status ?? details?.serviceability_status ?? details?.serviceability ?? '',
    )
      .trim()
      .toLowerCase()
    if (['nsz', 'non_serviceable', 'non-serviceable', 'not_serviceable'].includes(status)) {
      return false
    }
    if (['serviceable', 'sz', 'active', 'true'].includes(status)) return true

    const paymentType = details?.payment_type ?? details?.payment_types ?? details?.paymentMode
    if (Array.isArray(paymentType)) return paymentType.length > 0
    if (paymentType && typeof paymentType === 'object') {
      return Object.values(paymentType).some((value) => {
        if (typeof value === 'boolean') return value
        const normalized = String(value || '').trim().toLowerCase()
        return Boolean(normalized) && !['false', 'no', 'nsz', 'non-serviceable'].includes(normalized)
      })
    }
    if (paymentType !== undefined && paymentType !== null) {
      const normalized = String(paymentType).trim().toLowerCase()
      return Boolean(normalized) && !['false', 'no', 'nsz', 'non-serviceable'].includes(normalized)
    }

    return Object.keys(details || {}).length > 0
  })
}

const delhiveryCancellationResponseText = (value: unknown) => {
  try {
    return JSON.stringify(value || {}).toLowerCase()
  } catch {
    return String(value || '').toLowerCase()
  }
}

const isDelhiveryAlreadyCancelledResponse = (value: unknown) => {
  const responseText = delhiveryCancellationResponseText(value)
  return responseText.includes('already cancelled') || responseText.includes('already canceled')
}

const getDelhiveryCancellationMessage = (value: unknown): string | null => {
  if (!value) return null

  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? normalized : null
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = getDelhiveryCancellationMessage(entry)
      if (message) return message
    }
    return null
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['message', 'remark', 'remarks', 'responseMsg', 'ReturnMessage']) {
      const direct = record[key]
      if (typeof direct === 'string' && direct.trim()) return direct.trim()
    }

    for (const key of ['packages', 'package', 'response', 'data']) {
      const nested = record[key]
      if (nested) {
        const message = getDelhiveryCancellationMessage(nested)
        if (message) return message
      }
    }
  }

  return null
}

export const isDelhiveryCancellationAccepted = (value: unknown) => {
  const result = value as any
  const responseText = delhiveryCancellationResponseText(value)
  const numericStatus = Number(result?.status ?? result?.responseCode ?? result?.code)
  const alreadyCancelled = isDelhiveryAlreadyCancelledResponse(value)
  const acceptedText =
    responseText.includes('cancelled') ||
    responseText.includes('canceled') ||
    responseText.includes('cancellation initiated') ||
    responseText.includes('cancellation accepted') ||
    responseText.includes('cancellation request accepted') ||
    responseText.includes('marked for cancellation')
  const rejectedText =
    responseText.includes('not accepted') ||
    responseText.includes('not found') ||
    responseText.includes('invalid') ||
    responseText.includes('failed') ||
    responseText.includes('failure') ||
    responseText.includes('error')

  return (
    alreadyCancelled ||
    result?.success === true ||
    result?.Success === true ||
    result?.status === true ||
    String(result?.status || '').toLowerCase() === 'success' ||
    String(result?.Status || '').toLowerCase() === 'success' ||
    (Number.isFinite(numericStatus) && numericStatus >= 200 && numericStatus < 300) ||
    result?.response?.status === true ||
    (acceptedText && !rejectedText)
  )
}

export class DelhiveryService {
  private apiBase = 'https://track.delhivery.com'
  private token = ''
  private clientName = ''
  private readonly requestTimeoutMs = parseTimeout(process.env.DELHIVERY_REQUEST_TIMEOUT_MS, 30000)
  private readonly labelTimeoutMs = parseTimeout(process.env.DELHIVERY_LABEL_TIMEOUT_MS, 15000)

  private async ensureCredentials() {
    const credentials = await getDelhiveryCredentials()
    this.apiBase = credentials.apiBase
    this.token = credentials.apiKey
    this.clientName = credentials.clientName
  }

  private get headers() {
    return {
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  private async postFormEncoded(path: string, payload: unknown) {
    await this.ensureCredentials()
    const encodedData = qs.stringify({
      format: 'json',
      data: JSON.stringify(payload),
    })

    return axios.post(`${this.apiBase}${path}`, encodedData, {
      headers: {
        Authorization: `Token ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: this.requestTimeoutMs,
    })
  }

  private async getWithTimeout(url: string, config: AxiosRequestConfig = {}, timeoutMs?: number) {
    return axios.get(url, {
      ...config,
      timeout: timeoutMs ?? this.requestTimeoutMs,
    })
  }

  private async postWithTimeout(
    url: string,
    data: unknown,
    config: AxiosRequestConfig = {},
    timeoutMs?: number,
  ) {
    return axios.post(url, data, {
      ...config,
      timeout: timeoutMs ?? this.requestTimeoutMs,
    })
  }

  // 🔹 1. Check Serviceability
  async checkServiceability(pincode: string) {
    try {
      const normalizedPincode = normalizeDelhiveryPincode(pincode)
      await this.ensureCredentials()
      const url = `${this.apiBase}/c/api/pin-codes/json/`
      const res = await this.getWithTimeout(url, {
        headers: this.headers,
        params: { filter_codes: normalizedPincode },
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery serviceability error:', {
        pincode,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to fetch Delhivery serviceability')
    }
  }

  async checkHeavyProductTypeServiceability(pincode: string) {
    try {
      const normalizedPincode = normalizeDelhiveryPincode(pincode)
      await this.ensureCredentials()
      const url = `${this.apiBase}/api/dc/fetch/serviceability/pincode`
      const res = await this.getWithTimeout(url, {
        headers: {
          Authorization: `Token ${this.token}`,
          Accept: 'application/json',
        },
        params: {
          product_type: 'Heavy',
          pincode: normalizedPincode,
        },
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery Heavy serviceability error:', {
        pincode,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to fetch Delhivery Heavy serviceability')
    }
  }

  // 🔹 2. Expected TAT (Transit Time)
  async getExpectedTAT(
    origin: string,
    destination: string,
    mot: 'S' | 'E' = 'S',
    pdt: 'B2B' | 'B2C' = 'B2C',
  ) {
    try {
      await this.ensureCredentials()
      const url = `${this.apiBase}/api/dc/expected_tat?origin_pin=${origin}&destination_pin=${destination}&mot=${mot}&pdt=${pdt}`
      const res = await this.getWithTimeout(url, { headers: this.headers })
      const tat = res.data?.data?.tat
      return typeof tat === 'number' || typeof tat === 'string' ? Number(tat) : null
    } catch (err: any) {
      console.error('Delhivery TAT API error:', err.response?.data || err.message)
      return null
    }
  }

  async getB2CExpectedTAT(params: {
    origin_pin: unknown
    destination_pin: unknown
    mot: unknown
    pdt?: unknown
    expected_pickup_date?: unknown
  }) {
    try {
      const originPin = normalizeDelhiveryPincode(params.origin_pin, 'origin_pin')
      const destinationPin = normalizeDelhiveryPincode(params.destination_pin, 'destination_pin')
      const mot = normalizeDelhiveryMot(params.mot)
      const pdt = normalizeDelhiveryProductType(params.pdt)
      const expectedPickupDate = normalizeDelhiveryExpectedPickupDate(params.expected_pickup_date)

      await this.ensureCredentials()
      const url = `${this.apiBase}/api/dc/expected_tat`
      const res = await this.getWithTimeout(url, {
        headers: this.headers,
        params: {
          origin_pin: originPin,
          destination_pin: destinationPin,
          mot,
          ...(pdt ? { pdt } : {}),
          ...(expectedPickupDate ? { expected_pickup_date: expectedPickupDate } : {}),
        },
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery B2C Expected TAT error:', {
        origin_pin: params.origin_pin,
        destination_pin: params.destination_pin,
        mot: params.mot,
        pdt: params.pdt,
        expected_pickup_date: params.expected_pickup_date,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to fetch Delhivery B2C Expected TAT')
    }
  }

  // 🔹 3. Fetch Waybills
  async fetchWaybills(count: number = 10) {
    try {
      await this.ensureCredentials()
      const normalizedCount = Math.max(1, Number(count || 1))
      const isBulk = normalizedCount > 1
      const path = isBulk ? '/waybill/api/bulk/json/' : '/waybill/api/fetch/json/'
      const query = qs.stringify({
        cl: this.clientName,
        token: this.token,
        ...(isBulk ? { count: normalizedCount } : {}),
      })
      const url = `${this.apiBase}${path}?${query}`
      const res = await this.getWithTimeout(url, { headers: this.headers })
      return res.data?.waybill ?? res.data?.waybills ?? res.data
    } catch (err: any) {
      console.error('Delhivery waybill fetch error:', err.response?.data || err.message)
      throw new Error('Failed to fetch Delhivery waybill')
    }
  }

  async fetchB2CBulkWaybills(count: unknown) {
    try {
      const normalizedCount = normalizeDelhiveryWaybillCount(count)
      await this.ensureCredentials()
      const url = `${this.apiBase}/waybill/api/bulk/json/`
      const res = await this.getWithTimeout(url, {
        headers: {
          Accept: 'application/json',
        },
        params: {
          token: this.token,
          count: normalizedCount,
        },
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery B2C bulk waybill error:', {
        count,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to fetch Delhivery B2C bulk waybills')
    }
  }

  async fetchB2CSingleWaybill() {
    try {
      await this.ensureCredentials()
      const url = `${this.apiBase}/waybill/api/fetch/json/`
      const res = await this.getWithTimeout(url, {
        headers: {
          Accept: 'application/json',
        },
        params: {
          token: this.token,
        },
      })
      return res.data
    } catch (err: any) {
      console.error('❌ Delhivery B2C single waybill error:', {
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to fetch Delhivery B2C single waybill')
    }
  }

  async trackB2CShipment(params: { waybill: unknown; ref_ids?: unknown }) {
    try {
      const waybill = normalizeDelhiveryB2CTrackingWaybills(params.waybill)
      const refIds = normalizeOptionalDelhiveryText(params.ref_ids)

      await this.ensureCredentials()
      const url = `${this.apiBase}/api/v1/packages/json/`
      const res = await this.getWithTimeout(url, {
        headers: {
          Authorization: `Token ${this.token}`,
          'Content-Type': 'application/json',
        },
        params: {
          waybill,
          ref_ids: refIds ?? '',
        },
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('âŒ Delhivery B2C shipment tracking error:', {
        waybill: params.waybill,
        ref_ids: params.ref_ids,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to fetch Delhivery B2C shipment tracking')
    }
  }

  async calculateB2CShippingCost(params: {
    md: unknown
    cgm: unknown
    o_pin: unknown
    d_pin: unknown
    ss: unknown
    pt: unknown
    l?: unknown
    b?: unknown
    h?: unknown
    ipkg_type?: unknown
  }) {
    try {
      const normalizedParams = normalizeDelhiveryB2CShippingCostParams(params)

      await this.ensureCredentials()
      const url = `${this.apiBase}/api/kinko/v1/invoice/charges/.json`
      const res = await this.getWithTimeout(url, {
        headers: {
          Authorization: `Token ${this.token}`,
          'Content-Type': 'application/json',
        },
        params: normalizedParams,
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('âŒ Delhivery B2C shipping cost error:', {
        params,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to calculate Delhivery B2C shipping cost')
    }
  }

  async generateB2CShippingLabel(params: { waybill: unknown; pdf?: unknown; pdf_size?: unknown }) {
    try {
      const normalizedParams = normalizeDelhiveryB2CShippingLabelParams(params)

      await this.ensureCredentials()
      const url = `${this.apiBase}/api/p/packing_slip`
      const res = await this.getWithTimeout(url, {
        headers: {
          Authorization: `Token ${this.token}`,
          'Content-Type': 'application/json',
        },
        params: normalizedParams,
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('âŒ Delhivery B2C shipping label error:', {
        params,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to generate Delhivery B2C shipping label')
    }
  }

  async createB2CPickupRequest(payload: unknown) {
    try {
      const pickupRequest = normalizeDelhiveryB2CPickupRequestPayload(payload)

      await this.ensureCredentials()
      const res = await this.postWithTimeout(`${this.apiBase}/fm/request/new/`, pickupRequest, {
        headers: {
          Authorization: `Token ${this.token}`,
          'Content-Type': 'application/json',
        },
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('âŒ Delhivery B2C pickup request creation error:', {
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to create Delhivery B2C pickup request')
    }
  }

  async createB2CShipmentManifest(payload: unknown) {
    try {
      const manifest = normalizeDelhiveryB2CShipmentManifest(payload)
      const res = await this.postFormEncoded('/api/cmu/create.json', manifest)
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery B2C shipment creation error:', {
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to create Delhivery B2C shipment')
    }
  }

  async createB2CMpsShipmentManifest(payload: unknown) {
    try {
      const manifest = normalizeDelhiveryB2CShipmentManifest(payload, { requireMps: true })
      const res = await this.postFormEncoded('/api/cmu/create.json', manifest)
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery B2C MPS shipment creation error:', {
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to create Delhivery B2C MPS shipment')
    }
  }

  async editB2CShipment(payload: unknown) {
    try {
      const editPayload = normalizeDelhiveryB2CEditPayload(payload)
      await this.ensureCredentials()
      const res = await this.postWithTimeout(`${this.apiBase}/api/p/edit`, editPayload, {
        headers: {
          Authorization: `Token ${this.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery B2C shipment edit error:', {
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to edit Delhivery B2C shipment')
    }
  }

  async updateB2CEwaybill(waybill: unknown, payload: unknown) {
    try {
      const normalized = normalizeDelhiveryB2CEwaybillUpdatePayload(waybill, payload)
      await this.ensureCredentials()
      const res = await axios.put(
        `${this.apiBase}/api/rest/ewaybill/${encodeURIComponent(normalized.waybill)}/`,
        normalized.payload,
        {
          headers: {
            Authorization: `Token ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: this.requestTimeoutMs,
        },
      )
      return res.data
    } catch (err: any) {
      if (err instanceof HttpError) throw err
      console.error('❌ Delhivery B2C ewaybill update error:', {
        waybill,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
      })
      throw new Error('Failed to update Delhivery B2C ewaybill')
    }
  }

  // 🔹 4. Create Shipment (Manifestation)
  async createShipment(params: ShipmentParams, waybill?: string) {
    try {
      const normalizedCourierId = normalizeCourierId(params.courier_id)
      if (normalizedCourierId === null) {
        throw new HttpError(
          400,
          'Delhivery courier_id is required for Air/Express or Surface bookings.',
        )
      }
      const shippingMode = resolveDelhiveryShippingMode({
        courierId: normalizedCourierId,
        mode: params.shipping_mode,
        courierName: params.courier_partner,
      })
      if (!shippingMode) {
        throw new HttpError(
          400,
          `Invalid Delhivery courier selection: courier_id ${normalizedCourierId} does not map to Air/Express or Surface.`,
        )
      }

      const sanitizeString = (value?: string | null) => {
        if (!value) return ''
        return String(value).trim()
      }
      const sanitizePhone = (value?: string | null) => {
        const digits = String(value || '').replace(/\\D/g, '')
        return digits.length >= 10 ? digits.slice(-10) : digits
      }
      const sanitizePincode = (value?: string | number | null) => {
        if (value === undefined || value === null) return ''
        return String(value).trim()
      }
      const sanitizeBoolean = (value?: boolean | string | number | null) => {
        if (value === undefined || value === null) return undefined
        if (typeof value === 'boolean') return value
        const normalized = String(value).trim().toLowerCase()
        return ['true', '1', 'yes', 'y'].includes(normalized)
      }

      const pickup = params.pickup || ({} as ShipmentParams['pickup'])
      const consignee = params.consignee || ({} as ShipmentParams['consignee'])
      const boxes = Array.isArray(params.boxes) ? params.boxes : []
      const orderNumber = sanitizeString(params.order_number)
      const invoiceNumber = sanitizeString(params.invoice_number)
      const pickupDate = sanitizeString(params.pickup_date || pickup.pickup_date)
      const pickupTime = sanitizeString(params.pickup_time || pickup.pickup_time)
      const resolvedInvoiceNumber = invoiceNumber || orderNumber
      const orderAmount = Number(params.order_amount ?? 0)
      const orderItems = Array.isArray(params.order_items) ? params.order_items : []
      const hsnCodes = Array.from(
        new Set(
          orderItems
            .map((item) => (item?.hsn || item?.hsnCode || '').toString().trim())
            .filter((code) => code.length > 0),
        ),
      )

      if (!orderNumber) {
        throw new HttpError(400, 'order_number is required to create a Delhivery shipment.')
      }
      if (!invoiceNumber) {
        console.warn(
          `ℹ️ Delhivery invoice_number missing for order ${orderNumber}; using order_number as fallback.`,
        )
      }
      // if (!invoiceNumber) {
      //   throw new HttpError(
      //     400,
      //     'invoice_number (invoice_reference) is mandatory for Delhivery B2C manifests. Please provide the seller invoice number.',
      //   )
      // }
      // if (!hsnCodes.length) {
      //   throw new HttpError(
      //     400,
      //     'Delhivery requires HSN/SAC codes for at least one of the products you are shipping. Attach HSN codes to your order items.',
      //   )
      // }
      if (orderAmount <= 0 || Number.isNaN(orderAmount)) {
        throw new HttpError(
          400,
          'order_amount is required and must be a positive number when booking with Delhivery.',
        )
      }
      if ((params.mps || boxes.length > 1) && !waybill) {
        throw new HttpError(
          400,
          'Delhivery multi-piece shipment is not supported in the current B2C flow. Use a single-package shipment.',
        )
      }

      const pickupAddressParts = [
        sanitizeString(pickup.address),
        sanitizeString(pickup.address_2),
      ].filter((part) => part.length > 0)
      const pickupAddress =
        pickupAddressParts.length > 0
          ? pickupAddressParts.join(', ')
          : sanitizeString(pickup.warehouse_name)

      const sellerName = sanitizeString(params.company?.name || pickup.name || 'Shiplifi')
      const sellerGst = sanitizeString(params.company?.gst || pickup.gst_number || '')
      const productNames = orderItems
        .map((item) => sanitizeString(item?.name))
        .filter((name) => name.length > 0)
      const productsDesc = productNames.length ? productNames.join(', ') : 'General Merchandise'

      const consigneePhone = sanitizePhone(consignee.phone)
      if (!consigneePhone) {
        throw new HttpError(
          400,
          'Consignee phone must contain at least 10 digits for Delhivery shipments.',
        )
      }
      const pickupPhone = sanitizePhone(pickup.phone)
      if (!pickupPhone) {
        throw new HttpError(400, 'Valid pickup phone is required for Delhivery manifests.')
      }

      const orderDate =
        params.order_date instanceof Date
          ? params.order_date.toISOString().split('T')[0]
          : sanitizeString(params.order_date) || new Date().toISOString().split('T')[0]
      const invoiceDate =
        params.invoice_date && sanitizeString(params.invoice_date)
          ? sanitizeString(params.invoice_date)
          : orderDate
      const paymentMode =
        params.payment_type === 'cod'
          ? 'COD'
          : params.payment_type === 'reverse'
            ? 'Pickup'
            : params.payment_type === 'replacement'
              ? 'REPL'
              : 'Prepaid'
      const codAmount = paymentMode === 'COD' ? orderAmount : 0
      const packageWeightGrams = normalizeDelhiveryWeightGrams(params.package_weight)

      const manifestShipment: Record<string, any> = {
        order: orderNumber,
        order_date: orderDate,
        name: sanitizeString(consignee.name),
        phone: consigneePhone,
        add: sanitizeString(consignee.address),
        city: sanitizeString(consignee.city),
        state: sanitizeString(consignee.state),
        pin: sanitizePincode(consignee.pincode),
        country: 'India',
        payment_mode: paymentMode,
        cod_amount: codAmount,
        total_amount: orderAmount,
        products_desc: productsDesc,
        hsn_code: hsnCodes.join(', '),
        weight: packageWeightGrams,
        shipment_length: Number(params.package_length ?? 10),
        shipment_width: Number(params.package_breadth ?? 10),
        shipment_height: Number(params.package_height ?? 10),
        seller_name: sellerName,
        seller_add: pickupAddress,
        seller_city: sanitizeString(pickup.city),
        seller_state: sanitizeString(pickup.state),
        seller_pin: sanitizePincode(pickup.pincode),
        seller_phone: pickupPhone,
        seller_gst_tin: sellerGst,
        seller_inv: resolvedInvoiceNumber,
        invoice_reference: resolvedInvoiceNumber,
        invoice_date: invoiceDate,
        pickup_location: sanitizeString(pickup.warehouse_name) || 'Default Warehouse',
        pickup_address: pickupAddress,
        pickup_city: sanitizeString(pickup.city),
        pickup_state: sanitizeString(pickup.state),
        pickup_pin: sanitizePincode(pickup.pincode),
        pickup_phone: pickupPhone,
        pickup_country: 'India',
        pickup_date: pickupDate || undefined,
        pickup_time: pickupTime || undefined,
        shipping_mode: shippingMode,
        client_name: this.clientName || sellerName,
        client_gst_tin: sellerGst,
        waybill: waybill || undefined,
      }

      if (params.transport_speed) {
        manifestShipment.transport_speed = sanitizeString(params.transport_speed)
      }
      if (params.address_type) {
        manifestShipment.address_type = sanitizeString(params.address_type)
      }
      const ewbnValue =
        params.ewbn || params.ewb || params.ewbn_number || params.ewaybill_number || undefined
      if (ewbnValue) {
        manifestShipment.ewbn = sanitizeString(ewbnValue)
      }
      if (params.dangerous_good !== undefined) {
        manifestShipment.dangerous_good = sanitizeBoolean(params.dangerous_good)
      }
      if (params.fragile_shipment !== undefined) {
        manifestShipment.fragile_shipment = sanitizeBoolean(params.fragile_shipment)
      }
      if (params.plastic_packaging !== undefined) {
        manifestShipment.plastic_packaging = sanitizeBoolean(params.plastic_packaging)
      }
      if (params.quantity !== undefined && params.quantity !== null) {
        manifestShipment.quantity = sanitizeString(String(params.quantity))
      }
      if (params.country) {
        manifestShipment.country = sanitizeString(params.country)
      }

      const resolvedReturnAddress =
        params.rto && params.is_rto_different === 'yes'
          ? params.rto
          : paymentMode === 'REPL'
            ? (params.rto ?? params.pickup)
            : null

      if (resolvedReturnAddress) {
        Object.assign(manifestShipment, {
          return_name: resolvedReturnAddress.name,
          return_add: resolvedReturnAddress.address,
          return_address: resolvedReturnAddress.address,
          return_city: resolvedReturnAddress.city,
          return_state: resolvedReturnAddress.state,
          return_pin: resolvedReturnAddress.pincode,
          return_phone: resolvedReturnAddress.phone,
          return_country: 'India',
        })
      }

      const payload = {
        shipments: [manifestShipment],
        pickup_location: {
          name: sanitizeString(pickup.warehouse_name) || 'Default Warehouse',
        },
      }

      console.log('📤 Delhivery createShipment payload summary', {
        order: orderNumber,
        pickup_location: payload.shipments[0].pickup_location,
        pickup_date: payload.shipments[0].pickup_date ?? null,
        pickup_time: payload.shipments[0].pickup_time ?? null,
        weight_g: packageWeightGrams,
        payment_mode: paymentMode,
        hsn_present: hsnCodes.length,
        invoice_number: invoiceNumber,
        shipping_mode: shippingMode,
        cod_amount: codAmount,
      })

      const res = await this.postFormEncoded('/api/cmu/create.json', payload)
      const responseData = res.data

      const packages: any[] = Array.isArray(responseData?.packages)
        ? responseData.packages
        : responseData?.packages
          ? [responseData.packages]
          : []

      const normalizedStatus = (value?: string) => (value || '').toLowerCase()
      const normalizeRemarks = (remarks: unknown): string[] => {
        if (!remarks) return []
        if (Array.isArray(remarks)) {
          return remarks
            .flatMap((entry) => normalizeRemarks(entry))
            .filter((entry) => entry.trim().length > 0)
        }
        if (typeof remarks === 'string') {
          return [remarks.trim()].filter(Boolean)
        }
        if (typeof remarks === 'object') {
          return Object.values(remarks as Record<string, unknown>)
            .flatMap((entry) => normalizeRemarks(entry))
            .filter((entry) => entry.trim().length > 0)
        }
        return [String(remarks).trim()].filter(Boolean)
      }
      const overallStatus = normalizedStatus(responseData?.status)
      const packageFailures = packages.filter(
        (pkg) =>
          normalizedStatus(pkg?.status) === 'fail' || pkg?.serviceable === false || !pkg?.waybill,
      )
      const packageFailuresWithRemarks = packageFailures.map((pkg) => ({
        ...pkg,
        remarks: normalizeRemarks(pkg?.remarks),
      }))
      const successPackage = packages.find(
        (pkg) =>
          pkg?.waybill && pkg?.serviceable !== false && normalizedStatus(pkg?.status) !== 'fail',
      )

      if (
        overallStatus === 'fail' ||
        responseData?.success === false ||
        responseData?.serviceable === false ||
        !successPackage
      ) {
        console.error('❌ Delhivery manifest rejected', {
          order: orderNumber,
          response: responseData,
          packageFailures: packageFailuresWithRemarks,
        })

        const failureReason =
          responseData?.message ||
          responseData?.status_message ||
          normalizeRemarks(responseData?.rmk).join(' | ') ||
          packageFailuresWithRemarks
            .map((pkg) => {
              const joinedRemarks = pkg.remarks.join(' | ')
              return (
                joinedRemarks ||
                pkg?.message ||
                pkg?.reason ||
                pkg?.rmk ||
                `status=${pkg?.status ?? 'unknown'}`
              )
            })
            .filter(Boolean)
            .join(' | ') ||
          'Delhivery reported a failure during shipment creation.'
        throw new DelhiveryManifestError(502, failureReason, responseData)
      }

      const responseShippingMode =
        responseData?.shipping_mode ??
        successPackage?.shipping_mode ??
        successPackage?.service_mode ??
        successPackage?.service_type ??
        successPackage?.mode ??
        null

      console.log('📤 Delhivery API response service', {
        order: orderNumber,
        requested_shipping_mode: shippingMode,
        response_shipping_mode: responseShippingMode,
        response_package_keys: successPackage ? Object.keys(successPackage) : [],
      })

      let sortCode: string | null = null
      if (successPackage) {
        sortCode =
          (successPackage.sort_code ||
            successPackage.sortCode ||
            successPackage.routing_code ||
            successPackage.routingCode) ??
          null
      }

      if (sortCode && successPackage) {
        successPackage.sort_code = sortCode
      }

      return responseData
    } catch (err: any) {
      console.error('Delhivery shipment error:', err.response?.data || err.message)
      if (err instanceof HttpError) {
        throw err
      }
      throw new Error('Delhivery shipment creation failed')
    }
  }

  // 🔹 6. Cancel Shipment
  async cancelShipment(waybill: string) {
    const normalizedWaybill = String(waybill || '').trim()
    if (!normalizedWaybill) {
      throw new HttpError(400, 'Delhivery AWB number is required for cancellation')
    }

    try {
      await this.ensureCredentials()
      console.log('🚚 Delhivery Cancel Shipment Request:', {
        waybill: normalizedWaybill,
        apiBase: this.apiBase,
      })

      const res = await this.postWithTimeout(
        `${this.apiBase}/api/p/edit`,
        { waybill: normalizedWaybill, cancellation: 'true' },
        {
          headers: {
            Authorization: `Token ${this.token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      )

      console.log('📥 Delhivery Cancel Shipment Response:', {
        status: res.status,
        data: JSON.stringify(res.data, null, 2),
        success: res.data?.success,
        Success: res.data?.Success,
        statusField: res.data?.status,
        message: res.data?.message,
      })

      if (!isDelhiveryCancellationAccepted(res.data)) {
        const providerMessage =
          getDelhiveryCancellationMessage(res.data) ||
          extractProviderErrorMessage(res.data) ||
          'Delhivery cancellation not accepted'
        throw new Error(providerMessage)
      }

      return {
        success: true,
        status: 'success',
        provider: 'delhivery',
        awb_number: normalizedWaybill,
        alreadyCancelled: isDelhiveryAlreadyCancelledResponse(res.data),
        message:
          getDelhiveryCancellationMessage(res.data) ||
          (isDelhiveryAlreadyCancelledResponse(res.data)
            ? 'Delhivery shipment was already cancelled'
            : 'Delhivery cancellation accepted'),
        provider_response: res.data,
      }
    } catch (err: any) {
      console.error('❌ Delhivery cancellation error:', {
        waybill: normalizedWaybill,
        status: err.response?.status,
        data: JSON.stringify(err.response?.data, null, 2),
        message: err.message,
        stack: err.stack,
      })
      const providerMessage =
        extractProviderErrorMessage(err.response?.data) ||
        err.response?.data?.message ||
        err.message ||
        'Delhivery cancellation failed'
      throw new Error(providerMessage)
    }
  }

  // 🔹 7. Track Shipment
  async trackShipment(awb: string) {
    await this.ensureCredentials()
    const res = await this.getWithTimeout(`${this.apiBase}/api/v1/packages/json/?waybill=${awb}`, {
      headers: this.headers,
    })
    return res.data
  }

  // 🔹 8. NDR Action (RE-ATTEMPT / PICKUP_RESCHEDULE)
  async submitNdrAction(
    actions: Array<{
      waybill: string
      act: 'RE-ATTEMPT' | 'DEFER_DLV' | 'EDIT_DETAILS' | 'PICKUP_RESCHEDULE'
      action_data?: Record<string, any>
    }>,
  ) {
    try {
      await this.ensureCredentials()
      const url = `${this.apiBase}/api/p/update`
      const payload = actions.map((action) => {
        const mappedAct = action.act === 'PICKUP_RESCHEDULE' ? 'DEFER_DLV' : action.act
        const actionData = { ...(action.action_data || {}) } as Record<string, any>

        if (mappedAct === 'DEFER_DLV') {
          const normalizedDeferredDate =
            actionData.deferred_date || actionData.deferment_date || actionData.defermentDate
          if (normalizedDeferredDate) {
            actionData.deferred_date = normalizedDeferredDate
          }
          delete actionData.deferment_date
          delete actionData.defermentDate
        }

        return {
          waybill: action.waybill,
          act: mappedAct,
          ...(Object.keys(actionData).length ? { action_data: actionData } : {}),
        }
      })
      const res = await this.postWithTimeout(url, { data: payload }, { headers: this.headers })
      return res.data // contains UPL id(s)
    } catch (err: any) {
      console.error('Delhivery NDR action error:', err.response?.data || err.message)
      throw new Error('Failed to submit Delhivery NDR action')
    }
  }

  // 🔹 9. Get NDR UPL Status
  async getNdrStatus(uplId: string, verbose: boolean = true) {
    try {
      await this.ensureCredentials()
      const url = `${this.apiBase}/api/cmu/get_bulk_upl/${encodeURIComponent(uplId)}?verbose=${
        verbose ? 'true' : 'false'
      }`
      const res = await this.getWithTimeout(url, { headers: this.headers })
      return res.data
    } catch (err: any) {
      console.error('Delhivery NDR status error:', err.response?.data || err.message)
      throw new Error('Failed to fetch Delhivery NDR status')
    }
  }

  // 🔹 8. Pickup Request (manual scheduling)
  async requestPickup(pickupData: any) {
    await this.ensureCredentials()
    const res = await this.postWithTimeout(`${this.apiBase}/fm/request/new/`, pickupData, {
      headers: this.headers,
    })
    return res.data
  }

  // services/delhivery.service.ts
  async createWarehouse(warehouse: {
    name: string
    registered_name?: string
    phone: string
    email?: string
    address: string
    city: string
    pin: string
    country?: string
    return_address: string
    return_city?: string
    return_pin?: string
    return_state?: string
    return_country?: string
  }) {
    try {
      await this.ensureCredentials()
      const url = `${this.apiBase}/api/backend/clientwarehouse/create/`
      const headers = {
        Authorization: `Token ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }

      const res = await this.postWithTimeout(url, warehouse, { headers })
      return res.data
    } catch (err: any) {
      console.error('❌ Delhivery warehouse creation error:', err.response?.data || err.message)
      // Re-throw original error so upstream callers can inspect Delhivery's response
      throw err
    }
  }

  async triggerDelhiveryPickupRequest(pickupLocationName: string, packageCount: number) {
    try {
      // 🔹 Current date in YYYY-MM-DD
      const now = new Date()
      const pickup_date = now.toISOString().split('T')[0]

      // 🔹 Pickup time → 1 hour from now (HH:mm:ss)
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
      const pickup_time = oneHourLater.toTimeString().split(' ')[0] // "HH:mm:ss"

      const payload = {
        pickup_date,
        pickup_time,
        pickup_location: pickupLocationName,
        expected_package_count: packageCount,
      }

      const res = await this.requestPickup(payload)

      if (!res?.success) {
        console.error('❌ Delhivery pickup creation failed:', res)
        throw new Error(res?.message || 'Delhivery pickup request failed')
      }

      console.log(`✅ Pickup request created for ${pickupLocationName} (${packageCount} packages)`)
      return res
    } catch (err: any) {
      console.error('❌ Pickup request creation error:', err.message)
      throw err
    }
  }
  // 🔹 10. Create Reverse Shipment
  // Delhivery reverse shipments are created via the same create.json manifestation API,
  // with `package_type: "Pickup"` and reverse-specific shipment values.
  async createReverseShipment(params: {
    originalAwb: string
    originalOrderId?: string
    consignee: ShipmentParams['consignee']
    pickup: ShipmentParams['pickup']
    rto?: ShipmentParams['rto']
    order_amount?: number
    package_weight?: number
    package_length?: number
    package_breadth?: number
    package_height?: number
    order_items?: ShipmentParams['order_items']
  }) {
    try {
      const reverseDrop = params.rto ?? params.pickup
      const reversePayload: any = {
        shipments: [
          {
            order: params.originalOrderId || `REVERSE-${params.originalAwb}`,
            name: params.consignee?.name || '',
            phone: String(params.consignee?.phone || '')
              .replace(/\D/g, '')
              .slice(-10),
            add: params.consignee?.address || '',
            city: params.consignee?.city || '',
            state: params.consignee?.state || '',
            pin: String(params.consignee?.pincode || '')
              .padStart(6, '0')
              .slice(0, 6),
            country: 'India',
            payment_mode: 'Pickup',
            package_type: 'Pickup',
            total_amount: Number(params.order_amount || 0),
            cod_amount: '0',
            products_desc:
              params.order_items?.map((i) => i.name).join(', ') || 'Reverse Pickup Shipment',
            weight: normalizeDelhiveryWeightGrams(params.package_weight),
            shipment_length: Number(params.package_length ?? 10),
            shipment_width: Number(params.package_breadth ?? 10),
            shipment_height: Number(params.package_height ?? 10),
            pickup_location: params.pickup?.warehouse_name ?? 'Default Warehouse',
            seller_name: params.pickup?.name ?? 'Shiplifi',
            seller_add: params.pickup?.address ?? '',
            order_date: new Date().toISOString().split('T')[0],
            return_name: reverseDrop?.name ?? params.pickup?.name ?? 'Return',
            return_add: reverseDrop?.address ?? '',
            return_city: reverseDrop?.city ?? '',
            return_state: reverseDrop?.state ?? '',
            return_pin: String(reverseDrop?.pincode ?? '')
              .padStart(6, '0')
              .slice(0, 6),
            return_phone: String(reverseDrop?.phone ?? '')
              .replace(/\D/g, '')
              .slice(-10),
            return_country: 'India',
          },
        ],
      }

      if (params.order_items && params.order_items.length > 0) {
        reversePayload.shipments[0].products_desc = params.order_items
          .map((item) => item?.name || 'Item')
          .join(', ')
      }

      const res = await this.postFormEncoded('/api/cmu/create.json', reversePayload)

      if (!res.data?.packages?.length) {
        throw new Error('Delhivery reverse shipment creation failed - no packages returned')
      }

      const pkg = res.data.packages[0]
      const delhiveryCost =
        pkg?.charge || pkg?.amount || res.data?.charge || res.data?.amount || null

      return {
        success: true,
        packages: res.data.packages,
        upload_wbn: res.data.upload_wbn,
        shipment_id: res.data.upload_wbn,
        awb_number: pkg.waybill,
        courier_name: 'Delhivery',
        courier_cost: delhiveryCost ? Number(delhiveryCost) : null,
        status: 'booked',
      }
    } catch (err: any) {
      console.error('Delhivery reverse shipment error:', err.response?.data || err.message)
      throw new Error(err?.message || 'Delhivery reverse shipment creation failed')
    }
  }

  async updateWarehouse(data: {
    name: string // warehouse name (case-sensitive, cannot be changed)
    address?: string
    pin: string
    phone?: string
  }) {
    try {
      await this.ensureCredentials()
      const url = `${this.apiBase}/api/backend/clientwarehouse/edit/`
      const headers = {
        Authorization: `Token ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }

      const payload = {
        name: data.name,
        address: data.address,
        pin: data.pin,
        phone: data.phone,
      }

      const res = await this.postWithTimeout(url, payload, { headers })
      return res.data
    } catch (err: any) {
      console.error('❌ Delhivery warehouse update error:', err.response?.data || err.message)
      throw new Error('Failed to update Delhivery warehouse')
    }
  }

  async createPickupRequest({
    pickup_date,
    pickup_time,
    pickup_location,
    expected_package_count,
  }: {
    pickup_date: string
    pickup_time: string
    pickup_location: string
    expected_package_count: number
  }) {
    try {
      await this.ensureCredentials()
      const url = `${this.apiBase}/fm/request/new/`
      const payload = {
        pickup_date,
        pickup_time,
        pickup_location, // must exactly match warehouse name in Delhivery
        expected_package_count,
      }

      const headers = {
        Authorization: `Token ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }

      const res = await this.postWithTimeout(url, payload, { headers })
      const responseData = res.data
      const rejected =
        responseData?.success === false ||
        responseData?.status === false ||
        Boolean(responseData?.error) ||
        Boolean(responseData?.errors)

      if (rejected) {
        throw new Error(
          extractProviderErrorMessage(responseData) || 'Delhivery pickup request was rejected',
        )
      }

      return responseData
    } catch (err: any) {
      const providerError = err.response?.data
      const timeoutError = isTimeoutError(err)

      const providerMessage =
        (!timeoutError && extractProviderErrorMessage(providerError?.pickup_date)) ||
        extractProviderErrorMessage(providerError?.message) ||
        extractProviderErrorMessage(providerError?.error) ||
        (!timeoutError && extractProviderErrorMessage(providerError)) ||
        (typeof err.message === 'string' && err.message.trim().length > 0 && !timeoutError
          ? err.message.trim()
          : 'Pickup request is taking longer than expected. Please try again.')

      const existingPickupRequestId = getExistingPickupRequestId(providerMessage)
      if (existingPickupRequestId) {
        console.warn('ℹ️ Delhivery pickup request already exists; treating as accepted', {
          pickup_request_id: existingPickupRequestId,
          pickup_location,
          pickup_date,
          pickup_time,
          expected_package_count,
        })
        return {
          success: true,
          already_exists: true,
          pickup_request_id: existingPickupRequestId,
          message: providerMessage,
          provider_response: providerError || null,
        }
      }

      console.error('❌ Delhivery pickup request error:', providerError || err.message)

      const error = new Error(providerMessage)
      ;(error as any).statusCode = typeof err.response?.status === 'number'
        ? err.response.status
        : timeoutError
          ? 504
          : 500
      ;(error as any).details = providerError || null
      ;(error as any).isPickupRequestError = true
      ;(error as any).providerStatus = err.response?.status ?? null
      ;(error as any).providerStatusText = err.response?.statusText ?? null
      ;(error as any).code = err?.code ?? null
      throw error
    }
  }
  // 🔹 9. Fetch Shipping Label from Delhivery packing_slip API
  // format=json -> metadata (barcodes, sort code, etc.)
  // format=pdf  -> raw PDF bytes (used to ensure provider-side label generation activity)
  async generateLabel(awb: string, options: { format?: 'json' | 'pdf' } = { format: 'json' }) {
    await this.ensureCredentials()
    const format = options.format || 'json'
    const url = `${this.apiBase}/api/p/packing_slip?wbns=${encodeURIComponent(awb)}${
      format === 'pdf' ? '&pdf=true' : '&pdf=false'
    }`
    const responseType = format === 'pdf' ? 'arraybuffer' : 'json'
    const res = await this.getWithTimeout(
      url,
      {
      headers: this.headers,
      responseType,
      },
      format === 'pdf' ? this.labelTimeoutMs : this.requestTimeoutMs,
    )

    return format === 'pdf' ? Buffer.from(res.data) : res.data
  }

  // COD Settlement APIs not publicly available
  // Use CSV download from Delhivery dashboard instead:
  // Dashboard → Finances → Remittance → Download Report
}
