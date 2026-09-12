// services/generateCustomLabelService.ts
import axios from 'axios'
import bwipjs from 'bwip-js'
import { eq } from 'drizzle-orm'
import fileType from 'file-type'
import PdfPrinter from 'pdfmake'
import { db } from '../client'
import { labelPreferences } from '../schema/labelPreferences'
import { userProfiles } from '../schema/userProfile'
import {
  getCourierProviderDisplayName,
  getProviderMetaCourierName,
  resolveCourierProviderKeyFromFields,
} from '../../utils/courierProvider'
import { getAdminInvoicePreferences } from './invoicePreferences.service'
import { presignDownload, uploadBufferToStorage } from './upload.service'
import { uploadBufferToDatabase } from './databaseUpload.service'

const LABEL_ASSET_TIMEOUT_MS = 10000
const PLATFORM_LABEL_BRAND = 'FastShip'

function isValidDataUrl(str: string | null): boolean {
  return typeof str === 'string' && str.startsWith('data:image/')
}

// Helper function to convert buffer to data URL with proper MIME type detection
async function bufferToDataUrl(buffer: Buffer): Promise<string | null> {
  try {
    if (!buffer || buffer.length === 0) {
      console.warn('⚠️ Empty buffer provided to bufferToDataUrl')
      return null
    }
    const type = await fileType.fromBuffer(buffer)
    if (!type) {
      console.warn('⚠️ Could not detect image type, defaulting to PNG')
      return `data:image/png;base64,${buffer.toString('base64')}`
    }
    // Only allow image types
    if (!type.mime.startsWith('image/')) {
      console.warn(`⚠️ Invalid image type: ${type.mime}, defaulting to PNG`)
      return `data:image/png;base64,${buffer.toString('base64')}`
    }
    const dataUrl = `data:${type.mime};base64,${buffer.toString('base64')}`
    // Validate the data URL format
    if (!dataUrl.startsWith('data:image/')) {
      console.warn('⚠️ Invalid data URL format generated')
      return null
    }
    return dataUrl
  } catch (err) {
    console.warn('⚠️ Error detecting image type, defaulting to PNG:', err)
    try {
      return `data:image/png;base64,${buffer.toString('base64')}`
    } catch (bufferErr) {
      console.error('⚠️ Failed to convert buffer to base64:', bufferErr)
      return null
    }
  }
}

async function generateBarcodeBase64(text: string): Promise<string | null> {
  if (!text) return null
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text,
      scale: 4,
      height: 22,
      includetext: false,
      paddingwidth: 0,
      paddingheight: 0,
    })
    return `data:image/png;base64,${png.toString('base64')}`
  } catch (err) {
    console.warn('⚠️ Barcode generation failed:', err)
    return null
  }
}

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
}

const DEFAULT_LABEL_SETTINGS = {
  printer_type: 'thermal',
  char_limit: 36,
  max_items: 4,
  order_info: {
    orderId: true,
    invoiceNumber: true,
    orderDate: false,
    invoiceDate: false,
    orderBarcode: true,
    invoiceBarcode: true,
    customerPhone: true,
    rtoRoutingCode: true,
    declaredValue: true,
    cod: true,
    awb: true,
    terms: true,
  },
  shipper_info: {
    shipperPhone: true,
    gstin: true,
    shipperAddress: true,
    rtoAddress: false,
    sellerBrandName: true,
    brandLogo: true,
  },
  product_info: {
    itemName: true,
    productCost: false,
    productQuantity: true,
    skuCode: true,
    dimension: true,
    deadWeight: true,
    otherCharges: true,
  },
  powered_by: PLATFORM_LABEL_BRAND,
}

async function generateDataMatrixBase64(text: string): Promise<string | null> {
  if (!text) return null
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'datamatrix',
      text,
      scale: 4,
      paddingwidth: 0,
      paddingheight: 0,
    })
    return `data:image/png;base64,${png.toString('base64')}`
  } catch (err) {
    console.warn('Data Matrix generation failed:', err)
    return null
  }
}

const compactAddress = (parts: unknown[]) =>
  parts
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(', ')

export async function buildB2BLabelDefinition(order: any, pickup: any, rto: any) {
  const packages = safeParseArray(order.packages)
  const packageRows = packages.length > 0 ? packages : [{}]
  const lrn = String(order.awb_number || order.provider_reference || order.shipment_id || '-').trim()
  const masterNumber = String(order.shipment_id || order.provider_reference || lrn).trim()
  const courier = String(order.courier_partner || order.courier_name || 'Courier').trim()
  const orderDateValue = order.order_date || order.created_at
  const parsedDate = orderDateValue ? new Date(orderDateValue) : new Date()
  const dateLabel = Number.isNaN(parsedDate.getTime())
    ? String(orderDateValue || '-')
    : parsedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  const destinationAddress = compactAddress([
    order.buyer_name,
    order.address,
    order.city,
    order.state,
    order.pincode,
    order.buyer_phone ? `Phone: ${order.buyer_phone}` : '',
  ])
  const returnSource = rto?.address ? rto : pickup
  const returnAddress = compactAddress([
    returnSource?.warehouse_name || returnSource?.name,
    returnSource?.address,
    returnSource?.city,
    returnSource?.state,
    returnSource?.pincode,
  ])
  const originName = String(pickup?.warehouse_name || pickup?.name || 'SHIPPER').trim()
  const routingCode = String(order.sort_code || order.routing_code || order.delivery_location || '').trim()

  const labelCells = await Promise.all(
    packageRows.map(async (pkg: any, index: number) => {
      const packageTracking = String(
        pkg.awb_number || pkg.tracking_number || pkg.waybill || masterNumber,
      ).trim()
      const boxName = String(pkg.box_name || pkg.boxName || pkg.name || pkg.product_name || 'PACKAGE').trim()
      const isMaster = index === 0
      const barcode = await generateBarcodeBase64(packageTracking)
      const dataMatrix = await generateDataMatrixBase64(`${lrn}|${packageTracking}|${order.pincode || ''}`)
      const borderLayout = {
        hLineColor: () => '#111111',
        vLineColor: () => '#111111',
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      }

      return {
        table: {
          dontBreakRows: true,
          widths: [108, '*'],
          body: [
            [
              {
                stack: [
                  { text: courier.toUpperCase(), bold: true, fontSize: 12 },
                  { text: 'B2B SHIPPING', bold: true, color: '#d71920', fontSize: 5.8 },
                ],
                rowSpan: 2,
                margin: [1, 1, 1, 1],
              },
              { text: `Date: ${dateLabel}`, bold: true, fontSize: 7 },
            ],
            [{}, { text: `LRN: ${lrn}`, bold: true, fontSize: 7 }],
            [
              dataMatrix
                ? { image: dataMatrix, width: 48, height: 48, alignment: 'left', margin: [4, 4, 0, 4] }
                : { text: '', margin: [0, 22, 0, 22] },
              {
                stack: [
                  { text: `OID: ${order.order_number || '-'}`, bold: true, fontSize: 7.2 },
                  { text: boxName.toUpperCase(), bold: true, fontSize: 7.2, margin: [0, 2, 0, 4] },
                  { text: `Master: ${masterNumber}`, bold: true, fontSize: 7 },
                  {
                    text: `${order.pincode || '-'}${routingCode ? ` ${routingCode}` : ''}`,
                    bold: true,
                    fontSize: 7.2,
                    margin: [0, 5, 0, 0],
                  },
                ],
              },
            ],
            [
              {
                colSpan: 2,
                stack: [
                  ...(barcode
                    ? [{ image: barcode, width: 145, height: 25, alignment: 'center' }]
                    : []),
                  { text: packageTracking, alignment: 'center', bold: true, fontSize: 6 },
                ],
                margin: [0, 1, 0, 1],
              },
              {},
            ],
            [
              { text: `Box : ${index + 1}/${packageRows.length}`, bold: true, alignment: 'center', fontSize: 7.3 },
              { text: isMaster ? 'MASTER' : 'CHILD', alignment: 'center', fontSize: 7.3 },
            ],
            [
              { text: order.delivery_location || routingCode || '-', fontSize: 6.3 },
              { text: originName, bold: true, alignment: 'center', fontSize: 6.5 },
            ],
            [
              {
                stack: [
                  { text: 'Shipping address :', bold: true, fontSize: 6.8 },
                  { text: destinationAddress || '-', fontSize: 6.1, lineHeight: 1.05 },
                ],
              },
              { text: boxName.toUpperCase(), fontSize: 6.3, alignment: 'center', margin: [0, 12, 0, 0] },
            ],
            [
              {
                colSpan: 2,
                stack: [
                  { text: 'Return address :', bold: true, fontSize: 6.8 },
                  { text: returnAddress || '-', fontSize: 6.1, lineHeight: 1.05 },
                ],
              },
              {},
            ],
          ],
        },
        layout: borderLayout,
        margin: [0, 0, 0, 8],
      }
    }),
  )

  const pages: any[] = []
  for (let start = 0; start < labelCells.length; start += 4) {
    const group = labelCells.slice(start, start + 4)
    const rows: any[] = []
    for (let index = 0; index < group.length; index += 2) {
      rows.push([group[index], group[index + 1] || { text: '' }])
    }
    pages.push({
      table: { dontBreakRows: true, widths: ['*', '*'], body: rows },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 5, paddingRight: () => 5, paddingTop: () => 0, paddingBottom: () => 0 },
      pageBreak: start > 0 ? 'before' : undefined,
    })
  }

  return {
    defaultStyle: { font: 'Helvetica', color: '#111111' },
    pageSize: 'A4',
    pageMargins: [96, 14, 96, 14],
    content: pages,
  }
}

function safeParseObject(value: unknown, fallback: Record<string, any> = {}) {
  if (!value) return fallback
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
    } catch (err) {
      console.warn('⚠️ Failed to parse label object JSON, using fallback:', err)
      return fallback
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : fallback
}

function safeParseArray(value: unknown, fallback: any[] = []) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : fallback
    } catch (err) {
      console.warn('⚠️ Failed to parse label array JSON, using fallback:', err)
      return fallback
    }
  }
  return fallback
}

function mergeSettings(prefs: any) {
  if (!prefs) return DEFAULT_LABEL_SETTINGS
  return {
    printer_type: prefs.printer_type ?? DEFAULT_LABEL_SETTINGS.printer_type,
    char_limit: prefs.char_limit ?? DEFAULT_LABEL_SETTINGS.char_limit,
    max_items: prefs.max_items ?? DEFAULT_LABEL_SETTINGS.max_items,
    order_info: { ...(DEFAULT_LABEL_SETTINGS.order_info as any), ...(prefs.order_info || {}) },
    shipper_info: {
      ...(DEFAULT_LABEL_SETTINGS.shipper_info as any),
      ...(prefs.shipper_info || {}),
    },
    product_info: {
      ...(DEFAULT_LABEL_SETTINGS.product_info as any),
      ...(prefs.product_info || {}),
    },
    powered_by: prefs.powered_by ?? DEFAULT_LABEL_SETTINGS.powered_by,
  }
}

export async function generateLabelForOrder(order: any, userId: string, tx: any = db) {
  console.log('ORDER', order)

  // Load preferences
  const [prefsRow] = await tx
    .select()
    .from(labelPreferences)
    .where(eq(labelPreferences.user_id, userId))
  const prefs = prefsRow ?? undefined
  const settings: any = mergeSettings(prefs)

  // Load user profile (logo)
  const [profileOfUser] = await tx
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
  let logoBase64: string | null = null
  if (settings.shipper_info?.brandLogo && profileOfUser?.companyInfo?.companyLogoUrl) {
    try {
      const logoUrl = await presignDownload(profileOfUser.companyInfo.companyLogoUrl)
      const finalUrl = Array.isArray(logoUrl) ? (logoUrl.length > 0 ? logoUrl[0] : null) : logoUrl
      if (finalUrl) {
        const logoResp = await axios.get(finalUrl, {
          responseType: 'arraybuffer',
          timeout: LABEL_ASSET_TIMEOUT_MS,
        })
        const buffer = Buffer.from(logoResp.data)
        const dataUrl = await bufferToDataUrl(buffer)
        if (dataUrl && isValidDataUrl(dataUrl)) {
          logoBase64 = dataUrl
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch company logo:', err)
    }
  }

  const adminPrefs = await getAdminInvoicePreferences().catch((err: any) => {
    console.warn('Skipping platform logo on custom label; invoice preferences could not be loaded:', {
      message: err?.message || err,
    })
    return null
  })
  const platformLogoKey =
    adminPrefs?.includeLogo !== false && adminPrefs?.logoFile ? adminPrefs.logoFile : null
  // Keep labels platform-branded even when seller profile branding is configured.
  let platformLogoBase64: string | null = null
  if (platformLogoKey) {
    try {
      const logoUrl = await presignDownload(platformLogoKey)
      const finalUrl = Array.isArray(logoUrl) ? logoUrl[0] : logoUrl
      if (finalUrl) {
        const logoResp = await axios.get(finalUrl, {
          responseType: 'arraybuffer',
          timeout: LABEL_ASSET_TIMEOUT_MS,
        })
        const buffer = Buffer.from(logoResp.data)
        const dataUrl = await bufferToDataUrl(buffer)
        if (dataUrl && isValidDataUrl(dataUrl)) {
          platformLogoBase64 = dataUrl
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch platform logo from admin billing preferences:', err)
    }
  } else {
    console.log('ℹ️ No admin billing-preferences logo configured for custom label')
  }

  // Normalize fields
  const consignee = {
    name: order.buyer_name ?? order.consignee_name ?? '',
    address: order.address ?? '',
    city: order.city ?? '',
    state: order.state ?? '',
    pincode: order.pincode ?? '',
    phone: order.buyer_phone ?? order.phone ?? '',
  }

  const pickup = safeParseObject(order.pickup_details)
  const providerMeta = safeParseObject(order.provider_meta)

  const rto = safeParseObject(order.rto_details)
  // B2B rows uniquely expose the `packages` column. Keep the existing B2C
  // renderer untouched and use the compact multi-piece layout only for B2B.
  const isB2BOrder =
    String(order.business_type || order.businessType || '').toUpperCase() === 'B2B' ||
    Object.prototype.hasOwnProperty.call(order, 'packages')

  const products = safeParseArray(order.products)
  const paymentType = (order.payment_type ?? order.order_type ?? order.type ?? '')
    .toString()
    .toLowerCase()

  const pages: any[] = []
  const primaryColor = '#111827'
  const accentColor = '#ffffff'
  const darkTextColor = '#000000'
  const mutedTextColor = '#1f2937'
  const lightBorderColor = '#111827'
  const strongBorderColor = '#000000'
  const isEnabled = (value: unknown) => (value === undefined ? true : value === true)
  const awbEnabled = isEnabled(settings.order_info?.awb)
  const showOrderId = isEnabled(settings.order_info?.orderId)
  const showInvoiceNumber = isEnabled(settings.order_info?.invoiceNumber)
  const showOrderDate = isEnabled(settings.order_info?.orderDate)
  const showInvoiceDate = isEnabled(settings.order_info?.invoiceDate)
  const showOrderBarcode = isEnabled(settings.order_info?.orderBarcode)
  const showInvoiceBarcode = isEnabled(settings.order_info?.invoiceBarcode)
  const showRtoRoutingCode = isEnabled(settings.order_info?.rtoRoutingCode)
  const showDeclaredValue = isEnabled(settings.order_info?.declaredValue)
  const showCodBanner = isEnabled(settings.order_info?.cod)
  const showTerms = isEnabled(settings.order_info?.terms)
  const showCustomerPhone = isEnabled(settings.order_info?.customerPhone)
  const showBrandName = isEnabled(settings.shipper_info?.sellerBrandName)
  const showShipperAddress = isEnabled(settings.shipper_info?.shipperAddress)
  const showShipperPhone = isEnabled(settings.shipper_info?.shipperPhone)
  const showShipperGst = isEnabled(settings.shipper_info?.gstin)
  const showRto = isEnabled(settings.shipper_info?.rtoAddress)
  const showBrandLogo = isEnabled(settings.shipper_info?.brandLogo)
  const includeProductName = isEnabled(settings.product_info?.itemName)
  const includeCost = isEnabled(settings.product_info?.productCost)
  const includeQty = isEnabled(settings.product_info?.productQuantity)
  const includeSku = true
  const includeDimension = isEnabled(settings.product_info?.dimension)
  const includeDeadWeight = isEnabled(settings.product_info?.deadWeight)
  const showOrderValueSection = includeCost && isEnabled(settings.product_info?.otherCharges)
  const showPlatformBranding = true
  const charLimit = Math.max(10, Number(settings.char_limit ?? 36))
  const maxItems = Math.max(1, Number(settings.max_items ?? 4))

  // Prefer a locally generated AWB barcode so labels do not repeat the AWB text below the bars.
  // Courier barcode images are still used as a fallback when an AWB number is unavailable.
  let awbBarcode: string | null = null
  const providerKey = (order.integration_type || order.courier_partner || '')
    .toString()
    .toLowerCase()

  // Check for barcode from courier APIs - can be URL or data URL
  const barcodeSource =
    order.barcode_img || order.barcode_url || order.barcode_image || order.barcode || null

  const trackingIdentifier = String(
    order?.awb_number || order?.provider_reference || order?.shipment_id || '',
  ).trim()
  const trackingIdentifierLabel = order?.awb_number ? 'AWB' : 'LRN'

  if (awbEnabled && trackingIdentifier) {
    awbBarcode = await generateBarcodeBase64(trackingIdentifier)
    console.log(`✅ Generated ${trackingIdentifierLabel} barcode locally`)
  }

  if (!awbBarcode && awbEnabled && providerKey.includes('delhivery') && barcodeSource) {
    try {
      // Check if it's already a data URL
      if (isValidDataUrl(barcodeSource)) {
        awbBarcode = barcodeSource
        console.log('✅ Using barcode from courier API (data URL format)')
      } else if (typeof barcodeSource === 'string' && barcodeSource.startsWith('http')) {
        // It's a URL - download and convert to data URL
        console.log(`📥 Downloading barcode from courier API: ${barcodeSource}`)
        try {
          const barcodeResponse = await axios.get(barcodeSource, {
            responseType: 'arraybuffer',
            timeout: 10000,
          })
          const barcodeBuffer = Buffer.from(barcodeResponse.data)
          const dataUrl = await bufferToDataUrl(barcodeBuffer)
          if (dataUrl && isValidDataUrl(dataUrl)) {
            awbBarcode = dataUrl
            console.log('✅ Barcode downloaded and converted to data URL')
          } else {
            console.warn('⚠️ Failed to convert downloaded barcode to data URL')
          }
        } catch (downloadErr: any) {
          console.warn(
            `⚠️ Failed to download barcode from URL: ${barcodeSource}`,
            downloadErr?.message || downloadErr,
          )
        }
      } else {
        console.warn(`⚠️ Barcode from courier API is in unexpected format: ${typeof barcodeSource}`)
      }
    } catch (err: any) {
      console.warn(`⚠️ Error processing barcode from courier API:`, err?.message || err)
    }
  }

  const orderBarcode =
    showOrderBarcode && order.order_number ? await generateBarcodeBase64(order.order_number) : null
  const invoiceBarcode =
    showInvoiceBarcode && order.invoice_number
      ? await generateBarcodeBase64(order.invoice_number)
      : null

  const toAmount = (value: unknown) => {
    const n = Number(value ?? 0)
    return Number.isFinite(n) ? n : 0
  }
  const formatCurrency = (value: number | string | null | undefined) =>
    `Rs. ${toAmount(value).toFixed(2)}`

  const buildAddress = (addr: Record<string, any>) => {
    const lines = [
      addr.address,
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.pincode,
    ].filter((line) => typeof line === 'string' && line.trim().length > 0)

    return lines.join('\n')
  }

  // Register images in pdfmake's images dictionary FIRST
  // Only add images that are valid data URLs
  const images: Record<string, string> = {}
  if (showBrandLogo && logoBase64 && isValidDataUrl(logoBase64)) {
    images.logo = logoBase64
  }
  if (showPlatformBranding && platformLogoBase64 && isValidDataUrl(platformLogoBase64)) {
    images.platformLogo = platformLogoBase64
  }
  if (awbEnabled && awbBarcode && isValidDataUrl(awbBarcode)) {
    images.awbBarcode = awbBarcode
  }
  if (orderBarcode && isValidDataUrl(orderBarcode)) {
    images.orderBarcode = orderBarcode
  }
  if (invoiceBarcode && isValidDataUrl(invoiceBarcode)) {
    images.invoiceBarcode = invoiceBarcode
  }

  const chunk = products.slice(0, maxItems)
  const pageContent: any[] = []

  const trimText = (value: any, max = charLimit) => {
    const text = String(value ?? '').trim()
    if (!text) return '-'
    return text.length > max ? `${text.slice(0, max)}...` : text
  }

  const rawProductSubtotal = products.reduce((sum: number, p: any) => {
    const qty = Math.max(1, toAmount(p?.qty ?? p?.quantity ?? 1))
    const unitPrice = toAmount(p?.original_price ?? p?.price)
    return sum + unitPrice * qty
  }, 0)
  const netOrderSubtotal = toAmount(order.order_amount)
  const netProductSubtotal = Math.max(
    0,
    netOrderSubtotal -
      toAmount(order.shipping_charges) -
      toAmount(order.other_charges) -
      toAmount(order.gift_wrap) -
      toAmount(order.transaction_fee),
  )
  const subtotalScaleFactor =
    rawProductSubtotal > 0 &&
    netProductSubtotal > 0 &&
    Math.abs(rawProductSubtotal - netProductSubtotal) > 0.01
      ? netProductSubtotal / rawProductSubtotal
      : 1

  const getDisplayedUnitPrice = (product: any) => {
    const qty = Math.max(1, toAmount(product?.qty ?? product?.quantity ?? 1))
    const storedNetUnitPrice = toAmount(
      product?.net_price ?? product?.discounted_price ?? product?.display_price,
    )
    const originalUnitPrice = toAmount(product?.original_price ?? product?.price)
    const lineDiscount = toAmount(product?.discount)
    if (storedNetUnitPrice > 0) {
      return storedNetUnitPrice
    }
    if (subtotalScaleFactor !== 1) {
      return originalUnitPrice * subtotalScaleFactor
    }
    if (lineDiscount > 0) {
      return Math.max(0, (originalUnitPrice * qty - lineDiscount) / qty)
    }
    return originalUnitPrice
  }

  const pickFirstText = (...values: unknown[]) =>
    values.map((value) => String(value ?? '').trim()).find(Boolean) || ''
  const formatDate = (value: unknown) => {
    const raw = pickFirstText(value)
    if (!raw) return '-'
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return trimText(raw, 18)
    return date.toLocaleDateString('en-CA')
  }

  const sellerBrandName = pickFirstText(
    profileOfUser?.companyInfo?.brandName,
    profileOfUser?.companyInfo?.businessName,
    profileOfUser?.companyInfo?.companyName,
    profileOfUser?.companyInfo?.displayName,
    pickup?.warehouse_name,
  )
  const merchantContactName = pickFirstText(
    profileOfUser?.companyInfo?.contactPerson,
    pickup?.name,
    pickup?.contact_name,
    pickup?.warehouse_name,
  )
  const merchantContactPhone = pickFirstText(
    profileOfUser?.companyInfo?.contactNumber,
    profileOfUser?.companyInfo?.companyContactNumber,
    pickup?.phone,
    pickup?.mobile,
  )
  const normalizedSortCode = pickFirstText(order?.sort_code, order?.routing_code)
  const referenceNumber = pickFirstText(
    order?.reference_number,
    order?.ref_no,
    order?.provider_reference,
    order?.shipment_id,
  )
  const orderDate = formatDate(order.order_date ?? order.created_at)
  const invoiceDate = formatDate(order.invoice_date)
  const invoiceValue = formatCurrency(order.order_amount)
  const paymentLabel = paymentType === 'cod' ? 'COD' : 'PREPAID'
  const serviceMode = pickFirstText(order.shipping_mode, order.mode, order.service_type)
  const providerKeyForDisplay = resolveCourierProviderKeyFromFields(
    order.integration_type,
    order.provider,
    providerMeta.provider,
    providerMeta.provider_name,
    providerMeta.service_provider,
  )
  const providerDisplayName = getCourierProviderDisplayName(providerKeyForDisplay)
  const providerMetaCourierName = getProviderMetaCourierName(providerMeta)
  const shouldPreferProviderName =
    Boolean(providerKeyForDisplay) && providerKeyForDisplay !== 'delhivery'
  const courierName = shouldPreferProviderName
    ? providerDisplayName
    : pickFirstText(providerMetaCourierName, order.courier_partner, order.courier_name, providerDisplayName, 'Courier')

  const dimensionLabel =
    order.length && order.breadth && order.height
      ? `${order.length} x ${order.breadth} x ${order.height} cm`
      : ''
  const deadWeightKg = Number(order.weight ?? order.actual_weight ?? 0) / 1000
  const volumetricWeightKg = Number(order.volumetric_weight ?? 0) / 1000
  const chargeableWeightKg = Number(order.charged_weight ?? order.weight ?? 0) / 1000
  const packageWeightLabel = chargeableWeightKg
    ? `${chargeableWeightKg.toFixed(chargeableWeightKg >= 10 ? 1 : 2)} kg`
    : deadWeightKg
    ? `${deadWeightKg.toFixed(deadWeightKg >= 10 ? 1 : 2)} kg`
    : '-'
  const weightLines: string[] = []
  if (includeDeadWeight) {
    const slabWeightKg =
      order.charged_slabs && chargeableWeightKg
        ? chargeableWeightKg / Number(order.charged_slabs)
        : null
    const slabsApplied = order.charged_slabs ?? null
    const walletDebitValue = Number(order.wallet_debit_amount ?? 0)
    const freightValue =
      Number.isFinite(walletDebitValue) && walletDebitValue > 0
        ? walletDebitValue
        : Number(order.freight_charges ?? 0) + Number(order.gst_amount ?? 0)

    weightLines.push(`Dead Weight: ${deadWeightKg ? deadWeightKg.toFixed(3) + ' kg' : '-'}`)
    weightLines.push(
      `Volumetric Weight: ${volumetricWeightKg ? volumetricWeightKg.toFixed(3) + ' kg' : 'calculated'}`,
    )
    weightLines.push(
      `Chargeable Weight: ${chargeableWeightKg ? chargeableWeightKg.toFixed(3) + ' kg' : '-'}`,
    )
    weightLines.push(`Slab: ${slabWeightKg ? (slabWeightKg * 1000).toFixed(0) + ' g' : 'from rate card'}`)
    weightLines.push(`Slabs Applied: ${slabsApplied ?? '-'}`)
    weightLines.push(`Courier rate + taxes: ${formatCurrency(freightValue)}`)
  }
  const shipmentMetricLines: string[] = []
  if (includeDimension && dimensionLabel) {
    shipmentMetricLines.push(`Dimensions: ${dimensionLabel}`)
  }
  if (weightLines.length > 0) {
    shipmentMetricLines.push(...weightLines)
  }

  const sectionLabel = (text: string, fillColor = '#0f2e4d') => ({
    text,
    bold: true,
    fontSize: 8.5,
    color: '#ffffff',
    fillColor,
    margin: [5, 4, 5, 4],
    characterSpacing: 0.7,
  })
  const labelText = (text: string) => ({
    text,
    bold: true,
    fontSize: 7.5,
    color: '#475569',
    margin: [4, 3, 4, 3],
  })
  const valueText = (text: string, color = darkTextColor) => ({
    text,
    bold: true,
    fontSize: 7.7,
    color,
    margin: [4, 3, 4, 3],
  })
  const paleBoxLayout = {
    hLineColor: () => '#cbd5e1',
    vLineColor: () => '#cbd5e1',
    hLineWidth: () => 0.8,
    vLineWidth: () => 0.8,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  }
  const orderSummaryRows = [
    showOrderId && order.order_number ? ['Order Id', String(order.order_number)] : null,
    referenceNumber ? ['Ref No.', referenceNumber] : null,
    showInvoiceNumber && order.invoice_number ? ['Invoice #', String(order.invoice_number)] : null,
    showOrderDate || orderDate !== '-' ? ['Date', orderDate] : null,
    showInvoiceDate && invoiceDate !== '-' ? ['Inv. Date', invoiceDate] : null,
    showCodBanner ? ['Payment Type', paymentLabel] : null,
    // Weight must be present on every shipping label. It replaces invoice
    // value so no commercial value is printed on the consignee copy.
    ['Weight', packageWeightLabel],
    includeDimension && dimensionLabel ? ['Dimensions', trimText(dimensionLabel, 24)] : null,
  ].filter(Boolean) as string[][]

  const headerBrandStack: any[] = []
  if (showBrandLogo) {
    headerBrandStack.push({
      text: 'FS',
      bold: true,
      fontSize: 10,
      color: '#ffffff',
      alignment: 'center',
      fillColor: '#0f2e4d',
      margin: [0, 2, 7, 0],
      width: 24,
    })
  }
  headerBrandStack.push({
    stack: [
      {
        text: trimText(PLATFORM_LABEL_BRAND, 28).toUpperCase(),
        bold: true,
        fontSize: 12,
        color: '#0f172a',
      },
      {
        text: serviceMode ? serviceMode.toUpperCase() : 'SURFACE',
        bold: true,
        fontSize: 7.5,
        color: '#f15a24',
        characterSpacing: 2,
        margin: [0, 2, 0, 0],
      },
    ],
  })

  pageContent.push({
    table: {
      widths: [132, '*'],
      body: [
        [
          {
            columns: headerBrandStack,
            columnGap: 0,
            margin: [4, 7, 4, 7],
            fillColor: '#ffffff',
          },
          {
            stack: [
              {
                text: 'SHIPPING LABEL',
                alignment: 'center',
                bold: true,
                color: '#ffffff',
                fontSize: 14,
                margin: [0, 1, 0, 3],
                characterSpacing: 0.8,
              },
              {
                text: 'Safe Delivery  |  On Time  |  Every Time',
                alignment: 'center',
                bold: true,
                color: '#dbeafe',
                fontSize: 6.5,
              },
            ],
            fillColor: '#0f2e4d',
            margin: [0, 8, 0, 8],
          },
        ],
      ],
    },
    layout: paleBoxLayout,
    margin: [-4, -4, -4, 7],
  })

  const shipToStack: any[] = [
    sectionLabel('DELIVER TO'),
    { text: trimText(consignee.name, 42).toUpperCase(), fontSize: 8.8, bold: true, color: darkTextColor, margin: [6, 6, 6, 0] },
    ...(showCustomerPhone && consignee.phone
      ? [{ text: trimText(consignee.phone, 20), fontSize: 8.8, bold: true, color: '#0f2e4d', margin: [6, 4, 6, 0] }]
      : []),
    {
      text:
        [
          consignee.address,
          [consignee.city, consignee.state].filter(Boolean).join(', '),
          consignee.pincode,
        ]
          .filter(Boolean)
          .join('\n') || '-',
      fontSize: 8,
      color: darkTextColor,
      bold: true,
      margin: [6, 4, 6, 0],
      lineHeight: 1.15,
    },
  ]
  if (consignee.pincode) {
    shipToStack.push({
      text: `PIN : ${trimText(consignee.pincode, 12)}`,
      fontSize: 8.6,
      bold: true,
      color: darkTextColor,
      margin: [6, 4, 6, 6],
    })
  }

  const orderInfoTable = {
    table: {
      widths: [66, '*'],
      body: orderSummaryRows.map(([label, value]) => [
        labelText(label),
        label === 'Payment Type'
          ? {
              text: value,
              bold: true,
              fontSize: 6.2,
              color: '#ffffff',
              fillColor: paymentType === 'cod' ? '#f15a24' : '#16853f',
              alignment: 'center',
              margin: [3, 2, 3, 2],
            }
          : valueText(value, label === 'Invoice Value' ? '#f15a24' : darkTextColor),
      ]),
    },
    layout: paleBoxLayout,
  }

  pageContent.push({
    table: {
      widths: ['*', 134],
      body: [[{ stack: shipToStack }, orderInfoTable]],
    },
    layout: paleBoxLayout,
    margin: [0, 0, 0, 7],
  })

  const courierStack: any[] = [
    sectionLabel('COURIER'),
    {
      text: trimText(courierName, 34),
      fontSize: 9,
      bold: true,
      alignment: 'center',
      color: '#475569',
      margin: [6, 18, 6, 0],
    },
  ]
  if (serviceMode) {
    courierStack.push({
      text: `(${trimText(serviceMode, 18)})`,
      fontSize: 8,
      bold: true,
      alignment: 'center',
      color: '#475569',
      margin: [6, 3, 6, 8],
    })
  }

  const awbStack: any[] = []
  if (awbEnabled && trackingIdentifier) {
    awbStack.push({
      text: `${trackingIdentifierLabel} / TRACKING NO`,
      bold: true,
      alignment: 'center',
      color: '#000000',
      fontSize: 7.8,
      fillColor: '#f8fafc',
      margin: [0, 5, 0, 4],
    })
    awbStack.push({
      text: trackingIdentifier,
      bold: true,
      alignment: 'center',
      color: '#0f172a',
      fontSize: 9.5,
      characterSpacing: 1.7,
      margin: [0, 0, 0, 2],
    })
  }
  if (awbEnabled && awbBarcode && isValidDataUrl(awbBarcode)) {
    awbStack.push({ image: awbBarcode, width: 150, height: 32, alignment: 'center', margin: [0, 1, 0, 7] })
  } else if (awbEnabled && images.awbBarcode) {
    awbStack.push({ image: 'awbBarcode', width: 150, height: 32, alignment: 'center', margin: [0, 1, 0, 7] })
  }
  if (showRtoRoutingCode && normalizedSortCode) {
    awbStack.push({
      text: `Sort Code: ${normalizedSortCode}`,
      fontSize: 7,
      bold: true,
      alignment: 'center',
      color: primaryColor,
      margin: [0, 0, 0, 4],
    })
  }

  pageContent.push({
    table: {
      widths: [96, '*'],
      body: [[{ stack: courierStack }, { stack: awbStack }]],
    },
    layout: paleBoxLayout,
    margin: [0, 0, 0, 7],
  })

  if (includeProductName && chunk.length > 0) {
    const productHeaders: any[] = [{ text: 'Product Name', bold: true, fontSize: 7.2 }]
    const productWidths: any[] = []
    productWidths.push('*')
    if (includeQty) {
      productHeaders.push({ text: 'Qty', bold: true, fontSize: 7.2, alignment: 'center' })
      productWidths.push(42)
    }
    if (includeCost) {
      productHeaders.push({ text: 'Price', bold: true, fontSize: 7.2, alignment: 'right' })
      productWidths.push(54)
    }
    if (includeSku) {
      productHeaders.splice(1, 0, { text: 'Sku', bold: true, fontSize: 7.2, alignment: 'center' })
      productWidths.splice(1, 0, 44)
    }

    const productRows = chunk.map((p: any) => {
      const rowCells: any[] = []
      const itemName = p.name ?? p.productName ?? p.box_name ?? '-'
      const qty = Number(p.qty ?? p.quantity ?? 1)
      const price = getDisplayedUnitPrice(p)
      const sku = p.sku ?? p.skuCode ?? '-'

      rowCells.push({ text: trimText(itemName, charLimit), fontSize: 7.2, bold: true })
      if (includeSku) rowCells.push({ text: trimText(sku, 18), fontSize: 6.7, alignment: 'center' })
      if (includeQty) rowCells.push({ text: String(qty), alignment: 'center', fontSize: 8, bold: true })
      if (includeCost) rowCells.push({ text: formatCurrency(price), alignment: 'right', fontSize: 7.4, bold: true })

      return rowCells
    })

    const summaryLabelColSpan = Math.max(1, productWidths.length - (includeCost ? 1 : 0))
    const showProductValueRows = includeCost || showOrderValueSection

    pageContent.push({
      table: {
        headerRows: 1,
        widths: productWidths,
        body: [
          productHeaders,
          ...productRows,
          ...(showOrderValueSection && order.otherCharges
            ? [
                [
                  {
                    text: 'Other Charges',
                    colSpan: summaryLabelColSpan,
                    fontSize: 11,
                    bold: true,
                  },
                  ...Array.from({ length: summaryLabelColSpan - 1 }, () => ({})),
                  ...(includeCost
                    ? [{ text: formatCurrency(order.otherCharges), alignment: 'right', fontSize: 11 }]
                    : []),
                ],
              ]
            : []),
          ...(showProductValueRows
            ? [
                [
                  {
                    text: 'Total',
                    colSpan: summaryLabelColSpan,
                    fontSize: 8.5,
                    fontWeight: '700' as any,
                    fillColor: '#fff7ed',
                    margin: [5, 3, 5, 3],
                  },
                  ...Array.from({ length: summaryLabelColSpan - 1 }, () => ({})),
                  ...(includeCost
                    ? [{ text: formatCurrency(order.order_amount), alignment: 'right', fontSize: 8.5, bold: true, color: '#f15a24', fillColor: '#fff7ed', margin: [5, 3, 5, 3] }]
                    : []),
                ],
              ]
            : []),
        ],
      },
      layout: {
        hLineColor: () => '#cbd5e1',
        vLineColor: () => '#cbd5e1',
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 5],
    })
  }

  const returnAddress = showRto && rto.address ? buildAddress(rto) : buildAddress(pickup)
  const merchantCompanyName = PLATFORM_LABEL_BRAND
  const returnStack: any[] = [
    {
      columns: [
        {
          text: 'R',
          width: 20,
          bold: true,
          alignment: 'center',
          color: '#ffffff',
          fillColor: '#f15a24',
          fontSize: 9,
          margin: [0, 5, 0, 5],
        },
        {
          stack: [
            { text: 'If not delivered, return to:', fontSize: 6.4, bold: true, margin: [5, 0, 0, 2] },
            { text: trimText(returnAddress, 92), fontSize: 6.8, bold: true, color: '#334155', lineHeight: 1.12, margin: [5, 0, 0, 0] },
          ],
          width: '*',
        },
      ],
      columnGap: 4,
    },
  ]
  const contactStack: any[] = [
    { text: `Contact name : ${trimText(merchantContactName || merchantCompanyName, 24)}`, fontSize: 6.9, bold: true, margin: [5, 4, 5, 2] },
    { text: `Company name : ${trimText(merchantCompanyName, 24)}`, fontSize: 6.9, bold: true, margin: [5, 1, 5, 2] },
  ]
  if (showShipperPhone && merchantContactPhone) {
    contactStack.push({ text: `Phone : ${trimText(merchantContactPhone, 22)}`, fontSize: 6.9, bold: true, margin: [5, 1, 5, 2] })
  }
  if (showShipperGst && pickup.gst_number) {
    contactStack.push({ text: `GSTIN : ${trimText(pickup.gst_number, 22)}`, fontSize: 6.7, bold: true, margin: [5, 1, 5, 2] })
  }

  if (showShipperAddress || showShipperPhone || showBrandName) {
    pageContent.push({
      table: {
        widths: ['*', 116],
        body: [[{ stack: returnStack }, { stack: contactStack }]],
      },
      layout: paleBoxLayout,
      margin: [0, 2, 0, 7],
    })
  }

  if (showTerms) {
    pageContent.push({
      text: 'Thank you for choosing us!',
      fontSize: 6.8,
      color: '#64748b',
      bold: true,
      margin: [8, 0, 0, -8],
    })
  }

  if (showPlatformBranding) {
    const footerStack: any[] = []
    if (images.platformLogo) {
      footerStack.push({ image: 'platformLogo', width: 46, alignment: 'right', margin: [0, 0, 4, 0] })
    }
    footerStack.push({
      text: `Powered by ${PLATFORM_LABEL_BRAND}`,
      fontSize: 6.8,
      alignment: images.platformLogo ? 'right' : 'center',
      color: '#475569',
      bold: true,
    })
    pageContent.push({ stack: footerStack, margin: [0, -1, 8, 0] })
  }

  // Push pageContent to pages array - CRITICAL: Without this, label will be empty!
  if (pageContent.length === 0) {
    console.warn('⚠️ pageContent is empty - label may be blank')
  }
  pages.push({ stack: pageContent })

  const docDefinition: any = isB2BOrder
    ? await buildB2BLabelDefinition(order, pickup, rto)
    : {
        defaultStyle: { font: 'Helvetica', color: darkTextColor },
        pageSize: settings.printer_type === 'thermal' ? { width: 288, height: 432 } : 'A4',
        content: pages,
        pageMargins: [10, 10, 10, 10], // Reduced margins for more space
        background: (_currentPage: number, pageSize: { width: number; height: number }) => ({
          canvas: [
            {
              type: 'rect',
              x: 5,
              y: 5,
              w: pageSize.width - 10,
              h: pageSize.height - 10,
              lineWidth: 1.4,
              lineColor: strongBorderColor,
            },
          ],
        }),
        ...(Object.keys(images).length > 0 && { images }),
      }

  try {
    const printer = new PdfPrinter(fonts)
    const pdfDoc = printer.createPdfKitDocument(docDefinition)
    const chunks: Buffer[] = []
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('data', (chunk) => chunks.push(chunk))
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
      pdfDoc.on('error', (err) => reject(err))
      pdfDoc.end()
    })

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty or invalid')
    }

    console.log(
      `📄 PDF generated successfully (${pdfBuffer.length} bytes) for order ${order?.order_number}`,
    )

    const labelIdentifier = String(order?.order_number ?? order?.id ?? 'order')
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 46) || 'order'

    const labelFilename = `label-${labelIdentifier}.pdf`
    let uploadTarget

    try {
      // Upload directly via SDK to avoid presigned PUT timeouts from the backend.
      uploadTarget = await uploadBufferToStorage({
        buffer: pdfBuffer,
        filename: labelFilename,
        contentType: 'application/pdf',
        userId,
        folderKey: 'labels',
      })
    } catch (uploadError: any) {
      console.warn('Object storage label upload failed; using database upload fallback:', {
        code: uploadError?.code || 'STORAGE_UPLOAD_FAILED',
        message: uploadError?.message || uploadError,
      })
      uploadTarget = await uploadBufferToDatabase({
        buffer: pdfBuffer,
        filename: labelFilename,
        contentType: 'application/pdf',
        userId,
      })
    }

    if (!uploadTarget?.key) {
      throw new Error('Label key is missing after upload')
    }

    const finalKey = uploadTarget.key

    // Validate key is not empty and is a string
    if (!finalKey || typeof finalKey !== 'string' || finalKey.trim().length === 0) {
      throw new Error('Label key is invalid or empty after upload')
    }

    const trimmedKey = finalKey.trim()
    console.log(`✅ Label uploaded successfully: ${trimmedKey}`)
    return trimmedKey
  } catch (err: any) {
    console.error(
      `❌ Failed to generate/upload label for order ${order?.order_number}:`,
      err?.message || err,
      err?.stack,
    )
    throw new Error(`Label generation/upload failed: ${err?.message || err}`)
  }
}
