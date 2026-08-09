import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { randomUUID } from 'crypto'
import { HttpError } from '../../../utils/classes'
import {
  DelhiveryB2BCredentials,
  getDelhiveryB2BCredentials,
} from '../delhiveryB2BCredentials.service'

type CredentialsOverride = Partial<DelhiveryB2BCredentials> & { apiBase: string }

export type DelhiveryB2BUpload = {
  buffer: Buffer
  mimetype: string
  originalname: string
}

type CachedToken = {
  credentialKey: string
  token: string
  expiresAt: number
}

type LoginResult = {
  token: string
  expiresAt: number
  cached: boolean
}

type InFlightLogin = {
  credentialKey: string
  promise: Promise<LoginResult>
}

const DELHIVERY_B2B_TRACKING_STATUS_MAP: Record<string, string> = {
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
}

export const mapDelhiveryB2BTrackingStatus = (value: unknown) => {
  const status = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return DELHIVERY_B2B_TRACKING_STATUS_MAP[status] || null
}

let cachedToken: CachedToken | null = null
let loginInFlight: InFlightLogin | null = null

const clean = (value: unknown) => String(value ?? '').trim()
const timeoutMs = () => {
  const configured = Number(process.env.DELHIVERY_B2B_REQUEST_TIMEOUT_MS || 30000)
  return Number.isFinite(configured) && configured > 0 ? configured : 30000
}

const trimBaseUrl = (value: string) => value.replace(/\/+$/, '')

const extractMessage = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.trim() || null
  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = extractMessage(entry)
      if (message) return message
    }
    return null
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['message', 'detail', 'error', 'errors', 'remark', 'remarks']) {
      const message = extractMessage(record[key])
      if (message) return message
    }
  }
  return null
}

const parseJwtExpiry = (token: string) => {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    const expiresAt = Number(payload?.exp || 0) * 1000
    return expiresAt > Date.now() ? expiresAt : Date.now() + 23 * 60 * 60 * 1000
  } catch {
    return Date.now() + 23 * 60 * 60 * 1000
  }
}

const tokenFromResponse = (data: any) =>
  clean(data?.data?.jwt || data?.data?.token || data?.jwt || data?.token || data?.access_token)

const makeCredentialKey = (credentials: DelhiveryB2BCredentials) =>
  `${credentials.apiBase}|${credentials.username}|${credentials.password}`

const ensureRequired = (value: unknown, field: string) => {
  const normalized = clean(value)
  if (!normalized) throw new HttpError(400, `${field} is required for Delhivery B2B`)
  return normalized
}

const ensurePincode = (value: unknown, field = 'pincode') => {
  const pincode = ensureRequired(value, field)
  if (!/^\d{6}$/.test(pincode)) {
    throw new HttpError(400, `${field} must be a 6-digit Indian postal code`)
  }
  return pincode
}

const optionalWeightGrams = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined
  const weight = Number(value)
  if (!Number.isFinite(weight) || weight < 0) {
    throw new HttpError(400, 'weight must be a non-negative number in grams')
  }
  return weight
}

const ensureNumber = (value: unknown, field: string, minimum = 0) => {
  const number = Number(value)
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    typeof value === 'boolean' ||
    typeof value === 'object' ||
    !Number.isFinite(number)
  ) {
    throw new HttpError(400, `${field} must be a number`)
  }
  if (number < minimum) {
    throw new HttpError(400, `${field} must be at least ${minimum}`)
  }
  return number
}

const ensureBoolean = (value: unknown, field: string) => {
  if (typeof value !== 'boolean') throw new HttpError(400, `${field} must be a boolean`)
  return value
}

const normalizeFreightDimensions = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'dimensions must be a non-empty array')
  }

  return value.map((dimension, index) => {
    if (!dimension || typeof dimension !== 'object' || Array.isArray(dimension)) {
      throw new HttpError(400, `dimensions[${index}] must be an object`)
    }
    const entry = dimension as Record<string, unknown>
    const boxCount = ensureNumber(entry.box_count, `dimensions[${index}].box_count`, 1)
    if (!Number.isInteger(boxCount)) {
      throw new HttpError(400, `dimensions[${index}].box_count must be an integer`)
    }
    return {
      ...entry,
      length_cm: ensureNumber(entry.length_cm, `dimensions[${index}].length_cm`, 0.01),
      width_cm: ensureNumber(entry.width_cm, `dimensions[${index}].width_cm`, 0.01),
      height_cm: ensureNumber(entry.height_cm, `dimensions[${index}].height_cm`, 0.01),
      box_count: boxCount,
    }
  })
}

const WEEKDAYS = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
const WAREHOUSE_BOOLEAN_FIELDS = [
  'same_as_fwd_add',
  'is_warehouse',
  'use_client_state',
  'active',
  'qr_enabled',
] as const
const WAREHOUSE_TEXT_FIELDS = [
  'city',
  'state',
  'country',
  'tin_number',
  'cst_number',
  'warehouse_type',
  'accessibility_id',
  'incoming_center',
  'rto_center',
  'store_type',
  'tag',
  'qr_data',
] as const

const ensureObject = (value: unknown, field: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an object`)
  }
  return value as Record<string, unknown>
}

const ensureText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} must be a non-empty string`)
  }
  return value
}

const normalizeWarehouseDays = (value: unknown, field: string) => {
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array`)
  return value.map((day, index) => {
    const normalized = clean(day).toUpperCase()
    if (!WEEKDAYS.has(normalized)) {
      throw new HttpError(400, `${field}[${index}] must be a valid weekday`)
    }
    return normalized
  })
}

const normalizeWarehouseHours = (value: unknown, field: string) => {
  const schedule = ensureObject(value, field)
  const normalized: Record<string, unknown> = {}
  for (const [day, hours] of Object.entries(schedule)) {
    const normalizedDay = clean(day).toUpperCase()
    if (!WEEKDAYS.has(normalizedDay)) {
      throw new HttpError(400, `${field}.${day} must use a valid weekday key`)
    }
    const entry = ensureObject(hours, `${field}.${normalizedDay}`)
    for (const timeField of ['start_time', 'close_time']) {
      const time = clean(entry[timeField])
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        throw new HttpError(400, `${field}.${normalizedDay}.${timeField} must use HH:mm format`)
      }
    }
    normalized[normalizedDay] = { ...entry }
  }
  return normalized
}

const normalizeWarehousePayload = (payload: Record<string, unknown>) => {
  const name = ensureText(payload.name, 'name')
  const addressDetails = ensureObject(payload.address_details, 'address_details')
  for (const field of ['address', 'contact_person', 'phone_number']) {
    ensureText(addressDetails[field], `address_details.${field}`)
  }

  const data: Record<string, unknown> = {
    ...payload,
    name,
    pin_code: ensurePincode(payload.pin_code, 'pin_code'),
    address_details: { ...addressDetails },
  }

  for (const field of WAREHOUSE_TEXT_FIELDS) {
    if (payload[field] !== undefined) data[field] = ensureText(payload[field], field)
  }
  for (const field of WAREHOUSE_BOOLEAN_FIELDS) {
    if (payload[field] !== undefined) data[field] = ensureBoolean(payload[field], field)
  }
  for (const field of ['ret_address', 'billing_details']) {
    if (payload[field] !== undefined) data[field] = { ...ensureObject(payload[field], field) }
  }
  for (const field of ['business_hours', 'buisness_hours', 'pick_up_hours']) {
    if (payload[field] !== undefined) data[field] = normalizeWarehouseHours(payload[field], field)
  }
  for (const field of ['business_days', 'buisness_days', 'pick_up_days']) {
    if (payload[field] !== undefined) data[field] = normalizeWarehouseDays(payload[field], field)
  }

  if (payload.consignee_gst !== undefined) {
    const gst = ensureText(payload.consignee_gst, 'consignee_gst')
    if (!/^[A-Za-z0-9]{15}$/.test(gst)) {
      throw new HttpError(400, 'consignee_gst must be 15 alphanumeric characters')
    }
    data.consignee_gst = gst
  }
  return data
}

const normalizeWarehouseUpdatePayload = (payload: Record<string, unknown>) => {
  const updateDict =
    payload.update_dict === undefined ? {} : ensureObject(payload.update_dict, 'update_dict')
  const normalizedUpdate: Record<string, unknown> = { ...updateDict }

  for (const field of [
    'city',
    'state',
    'country',
    'tin_number',
    'cst_number',
    'appointment_required',
  ]) {
    if (updateDict[field] !== undefined) {
      normalizedUpdate[field] = ensureText(updateDict[field], `update_dict.${field}`)
    }
  }
  if (updateDict.qr_enabled !== undefined) {
    normalizedUpdate.qr_enabled = ensureBoolean(updateDict.qr_enabled, 'update_dict.qr_enabled')
  }

  if (updateDict.address_details !== undefined) {
    const address = ensureObject(updateDict.address_details, 'update_dict.address_details')
    for (const field of ['address', 'contact_person', 'phone_number', 'email', 'company']) {
      if (address[field] !== undefined) {
        ensureText(address[field], `update_dict.address_details.${field}`)
      }
    }
    normalizedUpdate.address_details = { ...address }
  }

  if (updateDict.ret_address !== undefined) {
    const returnAddress = ensureObject(updateDict.ret_address, 'update_dict.ret_address')
    const normalizedReturnAddress: Record<string, unknown> = { ...returnAddress }
    if (returnAddress.pin !== undefined) {
      normalizedReturnAddress.pin = ensurePincode(returnAddress.pin, 'update_dict.ret_address.pin')
    }
    for (const field of ['address', 'city', 'state', 'country']) {
      if (returnAddress[field] !== undefined) {
        ensureText(returnAddress[field], `update_dict.ret_address.${field}`)
      }
    }
    normalizedUpdate.ret_address = normalizedReturnAddress
  }

  if (updateDict.billing_details !== undefined) {
    normalizedUpdate.billing_details = {
      ...ensureObject(updateDict.billing_details, 'update_dict.billing_details'),
    }
  }
  for (const field of ['business_hours', 'buisness_hours', 'drop_hours']) {
    if (updateDict[field] !== undefined) {
      normalizedUpdate[field] = normalizeWarehouseHours(updateDict[field], `update_dict.${field}`)
    }
  }
  for (const field of ['pick_up_days', 'drop_days']) {
    if (updateDict[field] !== undefined) {
      normalizedUpdate[field] = normalizeWarehouseDays(updateDict[field], `update_dict.${field}`)
    }
  }

  return {
    ...payload,
    cl_warehouse_name: ensureText(payload.cl_warehouse_name, 'cl_warehouse_name'),
    update_dict: normalizedUpdate,
  }
}

const parseStructuredField = (value: unknown, field: string) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    throw new HttpError(400, `${field} must contain valid JSON`)
  }
}

const normalizeMultipartBoolean = (value: unknown, field: string) => {
  if (typeof value === 'boolean') return value
  const normalized = clean(value).toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  throw new HttpError(400, `${field} must be a boolean`)
}

const normalizeManifestObject = (value: unknown, field: string) =>
  ensureObject(parseStructuredField(value, field), field)

const normalizeManifestList = (value: unknown, field: string) => {
  const parsed = parseStructuredField(value, field)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new HttpError(400, `${field} must be a non-empty array`)
  }
  return parsed
}

const normalizeB2BUploads = (value: unknown, field: string) => {
  const uploads = value ? (Array.isArray(value) ? value : [value]) : []
  if (uploads.length > 10 || uploads.some((upload) => !isUpload(upload))) {
    throw new HttpError(400, `${field} must contain at most 10 valid files`)
  }
  const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.pdf', '.bmp'])
  let totalBytes = 0
  for (const upload of uploads as DelhiveryB2BUpload[]) {
    totalBytes += upload.buffer.length
    const extension = upload.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] || ''
    if (!allowedExtensions.has(extension)) {
      throw new HttpError(400, `Unsupported ${field} format: ${upload.originalname}`)
    }
  }
  if (totalBytes > 20 * 1024 * 1024) {
    throw new HttpError(400, `${field} aggregate size must not exceed 20 MB`)
  }
  return uploads as DelhiveryB2BUpload[]
}

const normalizeManifestPayload = (payload: Record<string, unknown>) => {
  const pickupName = clean(payload.pickup_location_name)
  const pickupId = clean(payload.pickup_location_id)
  if (!pickupName && !pickupId) {
    throw new HttpError(400, 'pickup_location_name or pickup_location_id is required')
  }

  const paymentMode = clean(payload.payment_mode).toLowerCase()
  if (!['cod', 'prepaid'].includes(paymentMode)) {
    throw new HttpError(400, 'payment_mode must be either cod or prepaid')
  }

  const dropoffStoreCode = clean(payload.dropoff_store_code)
  const dropoffLocation = payload.dropoff_location
    ? normalizeManifestObject(payload.dropoff_location, 'dropoff_location')
    : undefined
  if (!dropoffStoreCode && !dropoffLocation) {
    throw new HttpError(400, 'dropoff_store_code or dropoff_location is required')
  }
  if (dropoffLocation) {
    for (const field of ['consignee_name', 'address', 'city', 'state', 'phone']) {
      ensureText(dropoffLocation[field], `dropoff_location.${field}`)
    }
    dropoffLocation.zip = ensurePincode(dropoffLocation.zip, 'dropoff_location.zip')
  }

  const shipmentDetails = normalizeManifestList(payload.shipment_details, 'shipment_details').map(
    (shipment, index) => {
      const entry = ensureObject(shipment, `shipment_details[${index}]`)
      const boxCount = ensureNumber(entry.box_count, `shipment_details[${index}].box_count`, 1)
      if (!Number.isInteger(boxCount)) {
        throw new HttpError(400, `shipment_details[${index}].box_count must be an integer`)
      }
      const normalized: Record<string, unknown> = {
        ...entry,
        order_id: ensureText(entry.order_id, `shipment_details[${index}].order_id`),
        box_count: boxCount,
      }
      if (entry.weight !== undefined) {
        normalized.weight = ensureNumber(entry.weight, `shipment_details[${index}].weight`, 0.01)
      }
      if (entry.master !== undefined) {
        normalized.master = normalizeMultipartBoolean(
          entry.master,
          `shipment_details[${index}].master`,
        )
      }
      if (entry.waybills !== undefined && !Array.isArray(entry.waybills)) {
        throw new HttpError(400, `shipment_details[${index}].waybills must be an array`)
      }
      return normalized
    },
  )

  const invoices = normalizeManifestList(payload.invoices, 'invoices').map((invoice, index) => {
    const entry = ensureObject(invoice, `invoices[${index}]`)
    const qrCode = clean(entry.inv_qr_code)
    const normalized: Record<string, unknown> = { ...entry }
    if (!qrCode) {
      normalized.inv_num = ensureText(entry.inv_num, `invoices[${index}].inv_num`)
      normalized.inv_amt = ensureNumber(entry.inv_amt, `invoices[${index}].inv_amt`)
    } else {
      normalized.inv_qr_code = qrCode
      if (entry.inv_amt !== undefined) {
        normalized.inv_amt = ensureNumber(entry.inv_amt, `invoices[${index}].inv_amt`)
      }
    }
    return normalized
  })

  const data: Record<string, unknown> = {
    ...payload,
    payment_mode: paymentMode,
    weight: ensureNumber(payload.weight, 'weight', 0.01),
    shipment_details: shipmentDetails,
    invoices,
  }
  if (pickupName) {
    data.pickup_location_name = ensureText(payload.pickup_location_name, 'pickup_location_name')
  }
  if (pickupId) {
    data.pickup_location_id = ensureText(payload.pickup_location_id, 'pickup_location_id')
  }
  if (dropoffStoreCode) data.dropoff_store_code = dropoffStoreCode
  if (dropoffLocation) data.dropoff_location = dropoffLocation

  if (paymentMode === 'cod') {
    data.cod_amount = ensureNumber(payload.cod_amount, 'cod_amount')
  } else if (payload.cod_amount !== undefined) {
    data.cod_amount = ensureNumber(payload.cod_amount, 'cod_amount')
  }

  if (payload.lrn !== undefined && clean(payload.lrn)) data.lrn = ensureText(payload.lrn, 'lrn')
  for (const field of ['rov_insurance', 'enable_paperless_movement', 'fm_pickup']) {
    if (payload[field] !== undefined) {
      data[field] = normalizeMultipartBoolean(payload[field], field)
    }
  }

  if (payload.freight_mode !== undefined) {
    const mode = clean(payload.freight_mode).toLowerCase()
    if (!['fop', 'fod'].includes(mode)) {
      throw new HttpError(400, 'freight_mode must be either fop or fod')
    }
    data.freight_mode = mode
  }

  if (payload.dimensions !== undefined) {
    data.dimensions = normalizeManifestList(payload.dimensions, 'dimensions').map(
      (dimension, index) => {
        const entry = ensureObject(dimension, `dimensions[${index}]`)
        const normalized: Record<string, unknown> = { ...entry }
        const boxCount = ensureNumber(entry.box_count, `dimensions[${index}].box_count`, 1)
        if (!Number.isInteger(boxCount)) {
          throw new HttpError(400, `dimensions[${index}].box_count must be an integer`)
        }
        normalized.box_count = boxCount
        for (const candidates of [
          ['length', 'length_cm'],
          ['width', 'width_cm'],
          ['height', 'height_cm'],
        ]) {
          const field = candidates.find((candidate) => entry[candidate] !== undefined)
          if (!field) throw new HttpError(400, `dimensions[${index}].${candidates[0]} is required`)
          normalized[field] = ensureNumber(entry[field], `dimensions[${index}].${field}`, 0.01)
        }
        return normalized
      },
    )
  }

  for (const field of ['return_address', 'callback']) {
    if (payload[field] !== undefined) data[field] = normalizeManifestObject(payload[field], field)
  }
  if (payload.billing_address !== undefined) {
    const billing = normalizeManifestObject(payload.billing_address, 'billing_address')
    for (const field of ['name', 'company', 'consignor', 'address', 'city', 'state', 'pin', 'phone']) {
      ensureText(billing[field], `billing_address.${field}`)
    }
    billing.pin = ensurePincode(billing.pin, 'billing_address.pin')
    if (!clean(billing.pan_number) && !clean(billing.gst_number)) {
      throw new HttpError(400, 'billing_address requires pan_number or gst_number')
    }
    data.billing_address = billing
  }

  const uploads = normalizeB2BUploads(payload.doc_file, 'doc_file')
  if (uploads.length > 0) {
    const documentData = normalizeManifestList(payload.doc_data, 'doc_data').map(
      (entry, index) => {
        const document = ensureObject(entry, `doc_data[${index}]`)
        ensureText(document.doc_type, `doc_data[${index}].doc_type`)
        ensureObject(document.doc_meta, `doc_data[${index}].doc_meta`)
        return { ...document }
      },
    )
    if (documentData.length !== uploads.length) {
      throw new HttpError(400, 'doc_data must contain one entry for each doc_file')
    }
    data.doc_file = uploads
    data.doc_data = documentData
  } else if (payload.doc_data !== undefined) {
    data.doc_data = normalizeManifestList(payload.doc_data, 'doc_data')
  }

  return data
}

const normalizeShipmentUpdatePayload = (payload: Record<string, unknown>) => {
  const supportedFields = [
    'payment_mode',
    'cod_amount',
    'consignee_name',
    'consignee_address',
    'consignee_pincode',
    'consignee_phone',
    'weight_g',
    'dimensions',
    'callback',
    'cb',
    'invoices',
    'invoice_file',
    'invoice_files_meta',
  ]
  const hasSupportedValue = supportedFields.some((field) => {
    const value = payload[field]
    if (value === undefined || value === null || value === '') return false
    return !Array.isArray(value) || value.length > 0
  })
  if (!hasSupportedValue) {
    throw new HttpError(400, 'At least one supported LR update field is required')
  }

  const data: Record<string, unknown> = { ...payload }
  if (payload.payment_mode !== undefined) {
    const paymentMode = clean(payload.payment_mode).toLowerCase()
    if (!['cod', 'prepaid'].includes(paymentMode)) {
      throw new HttpError(400, 'payment_mode must be either cod or prepaid')
    }
    if (paymentMode === 'prepaid') {
      throw new HttpError(400, 'Delhivery B2B LR updates are not supported for prepaid shipments')
    }
    data.payment_mode = paymentMode
    data.cod_amount = ensureNumber(payload.cod_amount, 'cod_amount')
  } else if (payload.cod_amount !== undefined) {
    data.cod_amount = ensureNumber(payload.cod_amount, 'cod_amount')
  }

  for (const field of [
    'consignee_name',
    'consignee_address',
    'consignee_phone',
  ]) {
    if (payload[field] !== undefined) data[field] = ensureText(payload[field], field)
  }
  if (payload.consignee_pincode !== undefined) {
    data.consignee_pincode = ensurePincode(payload.consignee_pincode, 'consignee_pincode')
  }
  if (payload.weight_g !== undefined) {
    data.weight_g = ensureNumber(payload.weight_g, 'weight_g', 0.01)
  }

  if (payload.dimensions !== undefined) {
    data.dimensions = normalizeManifestList(payload.dimensions, 'dimensions').map(
      (dimension, index) => {
        const entry = ensureObject(dimension, `dimensions[${index}]`)
        const boxCount = ensureNumber(entry.box_count, `dimensions[${index}].box_count`, 1)
        if (!Number.isInteger(boxCount)) {
          throw new HttpError(400, `dimensions[${index}].box_count must be an integer`)
        }
        return {
          ...entry,
          width_cm: ensureNumber(entry.width_cm, `dimensions[${index}].width_cm`, 0.01),
          height_cm: ensureNumber(entry.height_cm, `dimensions[${index}].height_cm`, 0.01),
          length_cm: ensureNumber(entry.length_cm, `dimensions[${index}].length_cm`, 0.01),
          box_count: boxCount,
        }
      },
    )
  }

  const callbackValue = payload.cb ?? payload.callback
  if (callbackValue !== undefined) {
    const callback = normalizeManifestObject(callbackValue, 'callback')
    ensureText(callback.uri, 'callback.uri')
    ensureText(callback.method, 'callback.method')
    data.cb = callback
    delete data.callback
  }

  let invoices: Record<string, unknown>[] | undefined
  if (payload.invoices !== undefined) {
    invoices = normalizeManifestList(payload.invoices, 'invoices').map((invoice, index) => {
      const entry = ensureObject(invoice, `invoices[${index}]`)
      const qrCode = clean(entry.qr_code)
      const normalized: Record<string, unknown> = { ...entry }
      if (!qrCode) {
        normalized.inv_number = ensureText(entry.inv_number, `invoices[${index}].inv_number`)
        normalized.inv_amount = ensureNumber(entry.inv_amount, `invoices[${index}].inv_amount`)
      } else {
        normalized.qr_code = ensureText(entry.qr_code, `invoices[${index}].qr_code`)
        if (entry.inv_amount !== undefined) {
          normalized.inv_amount = ensureNumber(
            entry.inv_amount,
            `invoices[${index}].inv_amount`,
          )
        }
      }
      return normalized
    })
    data.invoices = invoices
  }

  const invoiceFiles = normalizeB2BUploads(payload.invoice_file, 'invoice_file')
  if (invoiceFiles.length > 0) {
    if (!invoices) throw new HttpError(400, 'invoices is required with invoice_file')
    const metadata = normalizeManifestList(payload.invoice_files_meta, 'invoice_files_meta').map(
      (entry, index) => {
        const meta = ensureObject(entry, `invoice_files_meta[${index}]`)
        if (!Array.isArray(meta.invoices) || meta.invoices.length === 0) {
          throw new HttpError(400, `invoice_files_meta[${index}].invoices must be a non-empty array`)
        }
        return { ...meta }
      },
    )
    if (metadata.length !== invoiceFiles.length) {
      throw new HttpError(400, 'invoice_files_meta must contain one entry for each invoice_file')
    }
    data.invoice_file = invoiceFiles
    data.invoice_files_meta = metadata
  } else if (payload.invoice_files_meta !== undefined) {
    throw new HttpError(400, 'invoice_file is required with invoice_files_meta')
  }

  return data
}

const LAST_MILE_APPOINTMENT_SLOTS = new Set([
  '03:00 PM-06:00 PM',
  '06:00 PM-09:00 PM',
  '07:00 AM-10:00 AM',
  '09:00 AM-06:00 PM',
  '09:00 PM-11:59 PM',
  '09:00 AM-12:00 PM',
  '12:00 AM-07:00 AM',
  '12:00 PM-03:00 PM',
])

const parseIndianAppointmentDate = (value: unknown, field: string) => {
  const date = ensureText(value, field)
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date)
  if (!match) throw new HttpError(400, `${field} must use DD/MM/YYYY format`)
  const [, dayText, monthText, yearText] = match
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new HttpError(400, `${field} must be a valid calendar date`)
  }
  return { date, timestamp }
}

const indiaTodayTimestamp = () => {
  const indiaNow = new Date(Date.now() + 330 * 60 * 1000)
  return Date.UTC(
    indiaNow.getUTCFullYear(),
    indiaNow.getUTCMonth(),
    indiaNow.getUTCDate(),
  )
}

const parseIndianPickupDate = (value: unknown) => {
  const date = ensureText(value, 'pickup_date')
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new HttpError(400, 'pickup_date must use YYYY-MM-DD format')
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new HttpError(400, 'pickup_date must be a valid calendar date')
  }
  return { date, timestamp }
}

const normalizePickupRequestPayload = (payload: Record<string, unknown>) => {
  const pickupDate = parseIndianPickupDate(payload.pickup_date)
  if (pickupDate.timestamp < indiaTodayTimestamp()) {
    throw new HttpError(400, 'pickup_date must be today or a future date')
  }

  const startTime = ensureText(payload.start_time, 'start_time')
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(startTime)) {
    throw new HttpError(400, 'start_time must use HH:MM:SS format')
  }

  const expectedPackageCount = ensureNumber(
    payload.expected_package_count,
    'expected_package_count',
    1,
  )
  if (!Number.isInteger(expectedPackageCount)) {
    throw new HttpError(400, 'expected_package_count must be an integer')
  }

  return {
    ...payload,
    client_warehouse: ensureText(payload.client_warehouse, 'client_warehouse'),
    pickup_date: pickupDate.date,
    start_time: startTime,
    expected_package_count: expectedPackageCount,
  }
}

const LR_COPY_TYPES = new Set([
  'SHIPPER COPY',
  'ORIGIN ACCOUNTS COPY',
  'REGULATORY COPY',
  'LM POD',
  'RECIPIENT COPY',
])

const normalizeLrCopyTypes = (value?: string | string[]) => {
  if (value === undefined || value === null || value === '') return undefined
  if (Array.isArray(value) && value.length === 0) return undefined

  const rawTypes = Array.isArray(value) ? value : value.split(',')
  const normalizedTypes = rawTypes.map((entry) =>
    ensureText(entry, 'lr_copy_type').trim().toUpperCase(),
  )
  const invalidType = normalizedTypes.find((entry) => !LR_COPY_TYPES.has(entry))
  if (invalidType) {
    throw new HttpError(400, `lr_copy_type contains unsupported value: ${invalidType}`)
  }
  return [...new Set(normalizedTypes)].join(',')
}

const normalizeDocumentType = (value: unknown): 'shipping_label' | 'lr_copy' => {
  const docType = clean(value).toLowerCase()
  if (docType !== 'shipping_label' && docType !== 'lr_copy') {
    throw new HttpError(400, 'doc_type must be shipping_label or lr_copy')
  }
  return docType
}

const normalizeDocumentCallback = (value: unknown) => {
  const callback = ensureObject(value, 'callback')
  const uri = ensureText(callback.uri, 'callback.uri').trim()
  let parsed: URL
  try {
    parsed = new URL(uri)
  } catch {
    throw new HttpError(400, 'callback.uri must be a valid HTTP(S) URL')
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    !parsed.hostname.includes('.') ||
    parsed.username ||
    parsed.password
  ) {
    throw new HttpError(400, 'callback.uri must be a valid HTTP(S) URL with a qualified host')
  }

  const method = ensureText(callback.method, 'callback.method').trim().toUpperCase()
  if (method !== 'POST') throw new HttpError(400, 'callback.method must be POST')

  const normalized: Record<string, unknown> = { ...callback, uri, method }
  if (callback.authorization !== undefined) {
    normalized.authorization = ensureText(callback.authorization, 'callback.authorization')
  }
  return normalized
}

const normalizeGenerateDocumentPayload = (
  docTypeValue: unknown,
  payload: Record<string, unknown>,
) => {
  const docType = normalizeDocumentType(docTypeValue)
  if (!Array.isArray(payload.lrns)) throw new HttpError(400, 'lrns must be an array')
  if (payload.lrns.length === 0 || payload.lrns.length > 25) {
    throw new HttpError(400, 'lrns must contain between 1 and 25 values')
  }
  const lrns = payload.lrns.map((lrn, index) => ensureText(lrn, `lrns[${index}]`).trim())
  const data: Record<string, unknown> = {
    ...payload,
    lrns,
    callback: normalizeDocumentCallback(payload.callback),
  }

  if (docType === 'shipping_label') {
    const size = ensureText(payload.size, 'size').trim().toLowerCase()
    if (!['sm', 'md', 'a4', 'std'].includes(size)) {
      throw new HttpError(400, 'size must be one of sm, md, a4, or std')
    }
    data.size = size
    delete data.lr_copy_type
  } else {
    delete data.size
    if (payload.lr_copy_type !== undefined) {
      if (!Array.isArray(payload.lr_copy_type)) {
        throw new HttpError(400, 'lr_copy_type must be an array')
      }
      const copyTypes = normalizeLrCopyTypes(payload.lr_copy_type)
      if (copyTypes) data.lr_copy_type = copyTypes.split(',')
      else delete data.lr_copy_type
    }
  }

  return { docType, data }
}

const normalizeDownloadDocumentParams = (params: Record<string, unknown>) => {
  const lrn = params.lrn === undefined ? '' : ensureText(params.lrn, 'lrn').trim()
  const mwn = params.mwn === undefined ? '' : ensureText(params.mwn, 'mwn').trim()
  if (!lrn && !mwn) throw new HttpError(400, 'either lrn or mwn is required')

  const normalized: Record<string, string> = { version: 'latest' }
  if (lrn) normalized.lrn = lrn
  if (mwn) normalized.mwn = mwn

  if (params.doc_type !== undefined) {
    const docType = ensureText(params.doc_type, 'doc_type').trim().toUpperCase()
    if (!/^[A-Z0-9_]+$/.test(docType)) {
      throw new HttpError(400, 'doc_type must contain only letters, numbers, and underscores')
    }
    normalized.doc_type = docType
  }

  if (params.auto_download !== undefined) {
    const autoDownload =
      typeof params.auto_download === 'boolean'
        ? String(params.auto_download)
        : clean(params.auto_download).toLowerCase()
    if (autoDownload !== 'true' && autoDownload !== 'false') {
      throw new HttpError(400, 'auto_download must be true or false')
    }
    normalized.auto_download = autoDownload
  }

  if (params.version !== undefined) {
    const version = ensureText(params.version, 'version').trim().toLowerCase()
    if (version !== 'all' && version !== 'latest') {
      throw new HttpError(400, 'version must be all or latest')
    }
    normalized.version = version
  }

  if (params.fields !== undefined) {
    normalized.fields = ensureText(params.fields, 'fields').trim()
  }

  return normalized
}

const normalizeLastMileAppointmentPayload = (payload: Record<string, unknown>) => {
  const appointmentDate = parseIndianAppointmentDate(payload.date, 'date')
  if (appointmentDate.timestamp < indiaTodayTimestamp()) {
    throw new HttpError(400, 'date must be today or a future date')
  }

  const appointmentSlot = ensureText(payload.appointment_slot, 'appointment_slot')
  if (!LAST_MILE_APPOINTMENT_SLOTS.has(appointmentSlot)) {
    throw new HttpError(400, 'appointment_slot is not one of the supported Delhivery slots')
  }

  const poNumbers = (Array.isArray(payload.po_number)
    ? payload.po_number
    : clean(payload.po_number).split(','))
    .map(clean)
    .filter(Boolean)
  if (poNumbers.length === 0 || poNumbers.length > 5) {
    throw new HttpError(400, 'po_number must contain between 1 and 5 values')
  }

  const expiryDate = parseIndianAppointmentDate(payload.po_expiry_date, 'po_expiry_date')
  if (expiryDate.timestamp < appointmentDate.timestamp) {
    throw new HttpError(400, 'po_expiry_date must not be earlier than the appointment date')
  }

  const data: Record<string, unknown> = {
    ...payload,
    lrn: ensureRequired(payload.lrn, 'lrn'),
    date: appointmentDate.date,
    appointment_slot: appointmentSlot,
    po_number: poNumbers,
    po_expiry_date: expiryDate.date,
  }
  if (payload.appointment_id !== undefined) {
    if (typeof payload.appointment_id !== 'string') {
      throw new HttpError(400, 'appointment_id must be a string')
    }
    data.appointment_id = payload.appointment_id
  }
  return data
}

const formValue = (value: unknown) => {
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

const isUpload = (value: unknown): value is DelhiveryB2BUpload =>
  Boolean(
    value &&
      typeof value === 'object' &&
      Buffer.isBuffer((value as DelhiveryB2BUpload).buffer) &&
      (value as DelhiveryB2BUpload).originalname,
  )

export class DelhiveryB2BService {
  constructor(private readonly override?: CredentialsOverride) {}

  static clearTokenCache() {
    cachedToken = null
    loginInFlight = null
  }

  async getOperationalDefaults() {
    const credentials = await this.credentials()
    return {
      clientId: credentials.clientId,
      warehouseId: credentials.warehouseId,
      freightMode: credentials.freightMode,
      fmPickup: credentials.fmPickup,
    }
  }

  private async credentials(): Promise<DelhiveryB2BCredentials> {
    if (!this.override) return getDelhiveryB2BCredentials()
    return {
      apiBase: trimBaseUrl(this.override.apiBase),
      username: clean(this.override.username),
      password: clean(this.override.password),
      clientId: clean(this.override.clientId),
      warehouseId: clean(this.override.warehouseId),
      freightMode: this.override.freightMode === 'fod' ? 'fod' : 'fop',
      fmPickup: this.override.fmPickup ?? true,
    }
  }

  private async baseUrl() {
    const credentials = await this.credentials()
    return trimBaseUrl(credentials.apiBase)
  }

  private providerError(error: any, fallback: string): never {
    const status = Number(error?.response?.status || error?.statusCode || 502)
    const message = extractMessage(error?.response?.data) || clean(error?.message) || fallback
    throw new HttpError(status >= 400 && status < 600 ? status : 502, message)
  }

  async resetPassword(username?: string) {
    const credentials = await this.credentials()
    const accountUsername = ensureRequired(username || credentials.username, 'username')
    try {
      const response = await axios.post(
        `${trimBaseUrl(credentials.apiBase)}/forgot-password`,
        { username: accountUsername },
        { timeout: timeoutMs(), headers: { 'Content-Type': 'application/json' } },
      )
      return response.data
    } catch (error) {
      this.providerError(error, 'Delhivery B2B password reset request failed')
    }
  }

  async login(force = false): Promise<LoginResult> {
    const credentials = await this.credentials()
    const username = ensureRequired(credentials.username, 'username')
    const password = ensureRequired(credentials.password, 'password')
    const credentialKey = makeCredentialKey(credentials)

    if (
      !force &&
      cachedToken?.credentialKey === credentialKey &&
      cachedToken.expiresAt > Date.now() + 60_000
    ) {
      return { token: cachedToken.token, expiresAt: cachedToken.expiresAt, cached: true }
    }

    if (loginInFlight?.credentialKey === credentialKey) {
      return loginInFlight.promise
    }

    const promise: Promise<LoginResult> = (async () => {
      try {
        const response = await axios.post(
          `${trimBaseUrl(credentials.apiBase)}/ums/login`,
          { username, password },
          { timeout: timeoutMs(), headers: { 'Content-Type': 'application/json' } },
        )
        const token = tokenFromResponse(response.data)
        if (!token) throw new HttpError(502, 'Delhivery B2B login response did not contain a JWT')
        const expiresAt = parseJwtExpiry(token)
        cachedToken = { credentialKey, token, expiresAt }
        return { token, expiresAt, cached: false }
      } catch (error) {
        if (error instanceof HttpError) throw error
        this.providerError(error, 'Delhivery B2B login failed')
      }
    })()

    loginInFlight = { credentialKey, promise }
    try {
      return await promise
    } finally {
      if (loginInFlight?.promise === promise) loginInFlight = null
    }
  }

  async logout() {
    const credentials = await this.credentials()
    const { token } = await this.login()
    try {
      const response = await axios.get(`${trimBaseUrl(credentials.apiBase)}/ums/logout`, {
        timeout: timeoutMs(),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      cachedToken = null
      return response.data
    } catch (error) {
      this.providerError(error, 'Delhivery B2B logout failed')
    }
  }

  private async authorizedRequest<T = any>(
    config: AxiosRequestConfig,
    retryUnauthorized = true,
  ): Promise<T> {
    const baseURL = await this.baseUrl()
    const { token } = await this.login()
    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': randomUUID(),
    }
    if (!(config.data instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json'
    }
    try {
      const response: AxiosResponse<T> = await axios.request({
        baseURL,
        timeout: timeoutMs(),
        ...config,
        headers: {
          ...defaultHeaders,
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
      })
      return response.data
    } catch (error: any) {
      if (retryUnauthorized && error?.response?.status === 401) {
        cachedToken = null
        await this.login(true)
        return this.authorizedRequest<T>(config, false)
      }
      this.providerError(error, 'Delhivery B2B request failed')
    }
  }

  private toMultipart(payload: Record<string, unknown>) {
    const form = new FormData()
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value) && value.length === 0) continue

      if (isUpload(value)) {
        form.append(
          key,
          new Blob([value.buffer as any], { type: value.mimetype || 'application/octet-stream' }),
          value.originalname,
        )
        continue
      }

      if (Array.isArray(value) && value.every(isUpload)) {
        for (const upload of value) {
          form.append(
            key,
            new Blob([upload.buffer as any], {
              type: upload.mimetype || 'application/octet-stream',
            }),
            upload.originalname,
          )
        }
        continue
      }

      form.append(key, formValue(value))
    }
    return form
  }

  async checkServiceability(pincode: string, weight?: number) {
    const pin = ensurePincode(pincode)
    const normalizedWeight = optionalWeightGrams(weight)
    return this.authorizedRequest({
      method: 'GET',
      url: `/pincode-service/${encodeURIComponent(pin)}`,
      params: normalizedWeight === undefined ? undefined : { weight: normalizedWeight },
    })
  }

  getExpectedTat(originPin: string, destinationPin: string) {
    return this.authorizedRequest({
      method: 'GET',
      url: '/tat/estimate',
      params: {
        origin_pin: ensurePincode(originPin, 'origin_pin'),
        destination_pin: ensurePincode(destinationPin, 'destination_pin'),
      },
    })
  }

  async estimateFreight(payload: Record<string, unknown>) {
    const paymentMode = clean(payload.payment_mode).toLowerCase()
    if (!['cod', 'prepaid'].includes(paymentMode)) {
      throw new HttpError(400, 'payment_mode must be either cod or prepaid')
    }

    const requestedFreightMode = clean(payload.freight_mode).toLowerCase()
    if (requestedFreightMode && !['fop', 'fod'].includes(requestedFreightMode)) {
      throw new HttpError(400, 'freight_mode must be either fop or fod')
    }
    const freightMode = requestedFreightMode || (await this.credentials()).freightMode

    const data: Record<string, unknown> = {
      ...payload,
      dimensions: normalizeFreightDimensions(payload.dimensions),
      weight_g: ensureNumber(payload.weight_g, 'weight_g', 0.01),
      source_pin: ensurePincode(payload.source_pin, 'source_pin'),
      consignee_pin: ensurePincode(payload.consignee_pin, 'consignee_pin'),
      payment_mode: paymentMode,
      inv_amount: ensureNumber(payload.inv_amount, 'inv_amount'),
      freight_mode: freightMode,
    }

    if (payload.cheque_payment !== undefined) {
      data.cheque_payment = ensureBoolean(payload.cheque_payment, 'cheque_payment')
    }
    if (payload.rov_insurance !== undefined) {
      data.rov_insurance = ensureBoolean(payload.rov_insurance, 'rov_insurance')
    }
    if (paymentMode === 'cod') {
      data.cod_amount = ensureNumber(payload.cod_amount, 'cod_amount')
    } else if (payload.cod_amount !== undefined) {
      data.cod_amount = ensureNumber(payload.cod_amount, 'cod_amount')
    }

    return this.authorizedRequest({ method: 'POST', url: '/freight/estimate', data })
  }

  getFreightCharges(lrns: string[] | string) {
    const values = (Array.isArray(lrns) ? lrns : [lrns])
      .flatMap((entry) => clean(entry).split(','))
      .map(clean)
      .filter(Boolean)
    if (values.length === 0) throw new HttpError(400, 'lrns is required for Delhivery B2B')
    if (values.length > 25) throw new HttpError(400, 'A maximum of 25 LRNs is allowed')
    const value = values.join(',')
    return this.authorizedRequest({
      method: 'GET',
      url: `/lrn/freight-breakup/lrns=${encodeURIComponent(value)}`,
    })
  }

  createWarehouse(payload: Record<string, unknown>) {
    return this.authorizedRequest({
      method: 'POST',
      url: '/client-warehouse/create/',
      data: normalizeWarehousePayload(payload),
    })
  }

  async updateWarehouse(payload: Record<string, unknown>) {
    const data = normalizeWarehouseUpdatePayload(payload)
    try {
      return await this.authorizedRequest({
        method: 'PATCH',
        url: '/client-warehouses/update',
        data,
      })
    } catch (error) {
      if (!(error instanceof HttpError) || ![404, 405].includes(error.statusCode)) throw error
      return this.authorizedRequest({
        method: 'PATCH',
        url: '/client-warehouse/update/',
        data,
      })
    }
  }

  manifestShipment(payload: Record<string, unknown>) {
    return this.authorizedRequest({
      method: 'POST',
      url: '/manifest',
      data: this.toMultipart(normalizeManifestPayload(payload)),
    })
  }

  getManifestStatus(jobId: string) {
    return this.authorizedRequest({
      method: 'GET',
      url: '/manifest',
      params: { job_id: ensureRequired(jobId, 'job_id') },
    })
  }

  updateShipment(lrn: string, payload: Record<string, unknown>) {
    return this.authorizedRequest({
      method: 'PUT',
      url: `/lrn/update/${encodeURIComponent(ensureRequired(lrn, 'lrn'))}`,
      data: this.toMultipart(normalizeShipmentUpdatePayload(payload)),
    })
  }

  getShipmentUpdateStatus(jobId: string) {
    return this.authorizedRequest({
      method: 'GET',
      url: '/lrn/update/status',
      params: { job_id: ensureRequired(jobId, 'job_id') },
    })
  }

  cancelShipment(lrn: string) {
    return this.authorizedRequest({
      method: 'DELETE',
      url: `/lrn/cancel/${encodeURIComponent(ensureRequired(lrn, 'lrn'))}`,
    })
  }

  trackShipment(lrn: string, allWaybills = false) {
    return this.authorizedRequest({
      method: 'GET',
      url: '/lrn/track',
      params: {
        lrnum: ensureRequired(lrn, 'lrn'),
        ...(allWaybills ? { all_wbns: true } : {}),
      },
    })
  }

  bookLastMileAppointment(payload: Record<string, unknown>) {
    return this.authorizedRequest({
      method: 'POST',
      url: '/v2/appointments/lm',
      data: normalizeLastMileAppointmentPayload(payload),
    })
  }

  createPickupRequest(payload: Record<string, unknown>) {
    return this.authorizedRequest({
      method: 'POST',
      url: '/pickup_requests',
      data: normalizePickupRequestPayload(payload),
    })
  }

  cancelPickupRequest(pickupId: string) {
    return this.authorizedRequest({
      method: 'DELETE',
      url: `/pickup_requests/${encodeURIComponent(ensureRequired(pickupId, 'pickup_id'))}`,
    })
  }

  getShippingLabel(lrn: string, size: string) {
    const normalizedSize = clean(size).toLowerCase()
    if (!['sm', 'md', 'a4', 'std'].includes(normalizedSize)) {
      throw new HttpError(400, 'size must be one of sm, md, a4, or std')
    }
    return this.authorizedRequest({
      method: 'GET',
      url: `/label/get_urls/${normalizedSize}/${encodeURIComponent(ensureRequired(lrn, 'lrn'))}`,
    })
  }

  getLrCopy(lrn: string, lrCopyType?: string | string[]) {
    const normalizedCopyTypes = normalizeLrCopyTypes(lrCopyType)
    return this.authorizedRequest({
      method: 'GET',
      url: `/lr_copy/print/${encodeURIComponent(ensureRequired(lrn, 'lrn'))}`,
      params: normalizedCopyTypes ? { lr_copy_type: normalizedCopyTypes } : undefined,
    })
  }

  generateDocument(docType: string, payload: Record<string, unknown>) {
    const normalized = normalizeGenerateDocumentPayload(docType, payload)
    return this.authorizedRequest({
      method: 'POST',
      url: `/generate/${normalized.docType}`,
      data: normalized.data,
    })
  }

  getGenerateDocumentStatus(docType: string, jobId: string) {
    const normalizedDocType = normalizeDocumentType(docType)
    return this.authorizedRequest({
      method: 'GET',
      url: `/generate/${normalizedDocType}/status/${encodeURIComponent(ensureRequired(jobId, 'job_id'))}`,
    })
  }

  downloadDocument(params: Record<string, unknown>) {
    return this.authorizedRequest({
      method: 'GET',
      url: '/document/download',
      params: normalizeDownloadDocumentParams(params),
    })
  }
}
