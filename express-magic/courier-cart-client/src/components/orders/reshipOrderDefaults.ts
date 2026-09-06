import type { B2COrder } from '../../types/generic.types'
import type { B2BFormData, Box, Invoice, Product as B2BProduct } from './b2b/B2BOrderForm'
import type { B2CFormData } from './b2c/B2COrderForm'
import { getB2COrderFormDefaults } from './b2c/orderFormDefaults'

type OrderLike = Record<string, any> & {
  type?: 'b2c' | 'b2b'
  source_type?: 'b2c' | 'b2b'
  invoices?: unknown
  invoice_details?: unknown
  pickup_details?: unknown
  rto_details?: unknown
  packages?: unknown
  products?: unknown
}

export type ReshipCreateOrderState = {
  mode: 'reship'
  activeTab: 'b2c' | 'b2b'
  sourceOrderNumber: string
  initialValues: {
    b2c?: Partial<B2CFormData>
    b2b?: Partial<B2BFormData>
  }
}

const RESHIP_STATUSES = new Set([
  'failed',
  'manifest_failed',
  'cancelled',
  'canceled',
])

const padDatePart = (value: number) => String(value).padStart(2, '0')

const getTodayDate = () => {
  const today = new Date()
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`
}

const normalizeStatus = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const normalizeOrderType = (value: unknown): 'prepaid' | 'cod' =>
  String(value || '').trim().toLowerCase() === 'cod' ? 'cod' : 'prepaid'

const parseRecord = (value: unknown): Record<string, unknown> => {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return {}
}

const parseArray = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : []
    } catch {
      return []
    }
  }
  return []
}

const numberValue = (value: unknown, fallback = 0) => {
  const numericValue = Number(value ?? fallback)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

const textValue = (...values: unknown[]) =>
  values
    .map((value) => String(value ?? '').trim())
    .find(Boolean) || ''

const makeReshipOrderId = (orderNumber?: string | null) => {
  const base = String(orderNumber || 'ORDER')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32)
  return `${base || 'ORDER'}-RS-${Date.now().toString().slice(-6)}`
}

const makeInvoiceNumber = (order: OrderLike, reshipOrderId: string) => {
  const invoiceNumber = textValue((order as any).invoice_number, (order as any).invoiceNo)
  return invoiceNumber ? makeReshipOrderId(invoiceNumber) : reshipOrderId
}

const getOrderKind = (order: OrderLike): 'b2c' | 'b2b' => {
  const type = String(order.type || order.source_type || '').toLowerCase()
  return type === 'b2b' ? 'b2b' : 'b2c'
}

const getB2BProducts = (order: OrderLike): B2BProduct[] => {
  const products = parseArray(order.products)
  if (!products.length) {
    return [{ productName: '', quantity: 1, unitPrice: numberValue((order as any).order_amount) }]
  }

  return products.map((product, index) => ({
    productName: textValue(product.productName, product.name, product.box_name, `Product ${index + 1}`),
    quantity: Math.max(1, numberValue(product.quantity ?? product.qty, 1)),
    unitPrice: numberValue(product.unitPrice ?? product.price),
    sku: textValue(product.sku),
    hsnCode: textValue(product.hsnCode, product.hsn),
  }))
}

const getB2BBoxes = (order: OrderLike): Box[] => {
  const boxes = parseArray(order.packages)
  if (!boxes.length) {
    return [
      {
        quantity: 1,
        lengthCm: numberValue((order as any).length),
        breadthCm: numberValue((order as any).breadth),
        heightCm: numberValue((order as any).height),
        weightKg: numberValue((order as any).weight),
      },
    ]
  }

  return boxes.map((box) => ({
    quantity: Math.max(1, numberValue(box.quantity ?? box.box_count, 1)),
    lengthCm: numberValue(box.lengthCm ?? box.length),
    breadthCm: numberValue(box.breadthCm ?? box.breadth ?? box.width),
    heightCm: numberValue(box.heightCm ?? box.height),
    weightKg: numberValue(box.weightKg ?? box.weight),
  }))
}

const getB2BInvoices = (order: OrderLike, reshipOrderId: string): Invoice[] => {
  const invoiceRows = parseArray(order.invoices || order.invoice_details)
  if (invoiceRows.length) {
    return invoiceRows.map((invoice) => ({
      invoiceNumber: makeReshipOrderId(textValue(invoice.invoiceNumber, invoice.invoice_number, invoice.inv_num)),
      invoiceDate: getTodayDate(),
      invoiceValue: numberValue(invoice.invoiceValue ?? invoice.invoice_amount ?? invoice.inv_amt),
      invoiceFileUrl: '',
    }))
  }

  return [
    {
      invoiceNumber: makeInvoiceNumber(order, reshipOrderId),
      invoiceDate: getTodayDate(),
      invoiceValue: numberValue((order as any).invoice_amount ?? (order as any).order_amount),
      invoiceFileUrl: '',
    },
  ]
}

const getB2BOrderFormDefaults = (order: OrderLike): Partial<B2BFormData> => {
  const pickup = parseRecord(order.pickup_details)
  const rto = parseRecord(order.rto_details)
  const reshipOrderId = makeReshipOrderId((order as any).order_number)
  const products = getB2BProducts(order)
  const invoices = getB2BInvoices(order, reshipOrderId)
  const boxes = getB2BBoxes(order)

  return {
    buyerName: textValue((order as any).buyer_name, (order as any).consignee_name),
    buyerPhone: textValue((order as any).buyer_phone, (order as any).phone),
    buyerEmail: textValue((order as any).buyer_email),
    companyName: textValue((order as any).company_name, (order as any).buyer_name),
    gstin: textValue((order as any).company_gst),
    address: textValue((order as any).address),
    pincode: textValue((order as any).pincode),
    city: textValue((order as any).city),
    state: textValue((order as any).state),
    country: textValue((order as any).country, 'India'),
    boxes,
    products,
    invoices,
    weight: boxes.reduce((sum, box) => sum + numberValue(box.weightKg) * Math.max(1, numberValue(box.quantity, 1)), 0),
    orderId: reshipOrderId,
    orderDate: getTodayDate(),
    orderType: normalizeOrderType((order as any).order_type),
    orderAmount: invoices.reduce((sum, invoice) => sum + numberValue(invoice.invoiceValue), 0),
    transactionFee: numberValue((order as any).transaction_fee),
    giftWrap: numberValue((order as any).gift_wrap),
    discount: numberValue((order as any).discount),
    prepaidAmount: numberValue((order as any).prepaid_amount),
    courierCod: numberValue((order as any).cod_charges),
    forwardCharges: 0,
    courierCost: null,
    courierPartner: '',
    courierPartnerId: '',
    courierOptionKey: '',
    selectedMaxSlabWeight: null,
    integrationType: undefined,
    shippingMode: '',
    pickupLocationId: textValue((order as any).pickup_location_id),
    pickupLocationPincode: textValue(pickup.pincode),
    pickupLocationName: textValue(pickup.warehouse_name, pickup.name),
    pickupAddress: textValue(pickup.address),
    pickupLocationPOCName: textValue(pickup.name, pickup.contact_name),
    pickupLocationPOCPhone: textValue(pickup.phone, pickup.mobile),
    pickupCity: textValue(pickup.city),
    pickupState: textValue(pickup.state),
    pickupDate: getTodayDate(),
    pickupTime: '',
    billingPanNumber: '',
    billingGstin: textValue(pickup.gst_number, pickup.gstNumber),
    isRtoSame: !(order as any).is_rto_different,
    rtoLocationPincode: textValue(rto.pincode),
    rtoLocationName: textValue(rto.warehouse_name, rto.name),
    rtoAddress: textValue(rto.address),
    rtoLocationPOCName: textValue(rto.name, rto.contact_name),
    rtoLocationPOCPhone: textValue(rto.phone, rto.mobile),
    rtoCity: textValue(rto.city),
    rtoState: textValue(rto.state),
    isInsurance: Boolean((order as any).is_insurance),
    zone: textValue((order as any).delivery_location),
    zoneId: '',
  }
}

export const isReshipEligible = (order: OrderLike) => {
  return RESHIP_STATUSES.has(normalizeStatus((order as any).order_status))
}

export const buildReshipCreateOrderState = (order: OrderLike): ReshipCreateOrderState => {
  const kind = getOrderKind(order)
  const sourceOrderNumber = textValue((order as any).order_number, (order as any).id)

  if (kind === 'b2b') {
    return {
      mode: 'reship',
      activeTab: 'b2b',
      sourceOrderNumber,
      initialValues: { b2b: getB2BOrderFormDefaults(order) },
    }
  }

  const b2cDefaults = getB2COrderFormDefaults(order as B2COrder)
  return {
    mode: 'reship',
    activeTab: 'b2c',
    sourceOrderNumber,
    initialValues: {
      b2c: {
        ...b2cDefaults,
        orderId: makeReshipOrderId((order as any).order_number),
        orderDate: getTodayDate(),
        pickupDate: getTodayDate(),
        pickupTime: '',
        courierPartner: '',
        courierPartnerId: '',
        courierOptionKey: '',
        selectedMaxSlabWeight: null,
        forwardCharges: 0,
        courierCost: null,
        chargeableWeight: null,
        volumetricWeight: null,
        slabs: null,
        integrationType: undefined,
      },
    },
  }
}
