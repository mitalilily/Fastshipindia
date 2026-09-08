import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'
import fileType from 'file-type'
import PdfPrinter from 'pdfmake'
import type { TableCell } from 'pdfmake/interfaces'
import { db } from '../client'
import { invoices } from '../schema/invoices'
import { presignDownload } from './upload.service'
import { getAdminInvoicePreferences } from './invoicePreferences.service'
// Product + Invoice types
// ----------------------
const PLATFORM_BRAND_NAME = 'Fastship'
const normalizePlatformBrandName = (value?: string | null) => {
  const brandName = value?.trim()
  if (!brandName || /^shiplifi$/i.test(brandName)) return PLATFORM_BRAND_NAME
  return brandName
}

export interface Product {
  name: string
  sku: string
  qty: number
  price: number
  hsn: string
  discount: number
  box_name?: string
  tax_rate: number
}

interface InvoiceData {
  invoiceNumber: string
  invoicePrefix?: string
  invoiceSuffix?: string
  invoiceDate: string
  buyerName: string
  orderAmt?: number
  buyerPhone: string
  buyerEmail: string
  supportEmail?: string
  buyerAddress: string
  buyerCity: string
  buyerState: string
  buyerPincode: string
  products: Product[]
  invoiceAmount?: number
  shippingCharges: number
  giftWrap?: number
  transactionFee?: number
  discount?: number
  orderType: 'prepaid' | 'cod'
  courierCod?: number
  prepaidAmount?: number
  courierName: string
  courierId: string
  logoBuffer?: Buffer
  signatureBuffer?: Buffer
  companyName?: string
  companyGST?: string
  layout?: 'classic' | 'thermal'
  orderId?: string
  awbNumber?: string
  courierPartner?: string
  serviceType?: string
  pickupPincode?: string
  deliveryPincode?: string
  orderDate?: string
  sellerName?: string
  brandName?: string
  sellerAddress?: string
  sellerStateCode?: string
  gstNumber?: string
  panNumber?: string
  supportPhone?: string
  invoiceNotes?: string
  termsAndConditions?: string
  rtoCharges?: number
}

// ----------------------
// Generate Invoice PDF
// ----------------------
export const generateInvoicePDF = async (invoice: InvoiceData): Promise<Buffer> => {
  const merchantFontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Merchant.ttf')
  const hasMerchantFont = fs.existsSync(merchantFontPath)
  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
    Courier: {
      normal: 'Courier',
      bold: 'Courier-Bold',
      italics: 'Courier-Oblique',
      bolditalics: 'Courier-BoldOblique',
    },
    ...(hasMerchantFont
      ? {
          Merchant: {
            normal: merchantFontPath,
            bold: merchantFontPath,
            italics: merchantFontPath,
            bolditalics: merchantFontPath,
          },
        }
      : {}),
  }
  const printer = new PdfPrinter(fonts)

  const invoiceNumber = `${invoice.invoicePrefix ?? ''}${invoice.invoiceNumber}${
    invoice.invoiceSuffix ?? ''
  }`
  const isThermal = invoice.layout === 'thermal'
  const fontSize = isThermal ? 7 : 10
  const classicBaseFont = 'Helvetica'
  const accentColor = '#0a6fa5'
  const toAmount = (value: unknown) => {
    const n = Number(value ?? 0)
    return Number.isFinite(n) ? n : 0
  }
  const formatCurrency = (value: number | string | null | undefined) => {
    const num = toAmount(value)
    const abs = Math.abs(num).toFixed(2)
    return `${num < 0 ? '-' : ''}Rs. ${abs}`
  }

  const numberToWords = (value: number): string => {
    const ones = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ]
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    const belowHundred = (num: number) =>
      num < 20 ? ones[num] : [tens[Math.floor(num / 10)], ones[num % 10]].filter(Boolean).join(' ')
    const belowThousand = (num: number) =>
      [
        num >= 100 ? `${ones[Math.floor(num / 100)]} Hundred` : '',
        num % 100 ? belowHundred(num % 100) : '',
      ]
        .filter(Boolean)
        .join(' ')

    const parts: string[] = []
    const crore = Math.floor(value / 10000000)
    value %= 10000000
    const lakh = Math.floor(value / 100000)
    value %= 100000
    const thousand = Math.floor(value / 1000)
    value %= 1000

    if (crore) parts.push(`${belowThousand(crore)} Crore`)
    if (lakh) parts.push(`${belowThousand(lakh)} Lakh`)
    if (thousand) parts.push(`${belowThousand(thousand)} Thousand`)
    if (value) parts.push(belowThousand(value))
    return parts.length ? parts.join(' ') : 'Zero'
  }

  const amountInWords = (value: number): string => {
    const amount = Math.max(0, Number.isFinite(value) ? value : 0)
    const rupees = Math.floor(amount)
    const paise = Math.round((amount - rupees) * 100)
    return `Rupees ${numberToWords(rupees)}${paise ? ` and ${numberToWords(paise)} Paise` : ''} Only`
  }

  const mutedTextColor = '#4b5563'
  const sectionTitleColor = '#000000'

  // Helper function to validate if buffer is a valid PNG/JPEG/GIF
  const isValidImageBuffer = (buffer: Buffer): boolean => {
    if (!buffer || buffer.length < 4) return false

    // Check for PNG signature: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return true
    }
    // Check for JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true
    }
    // Check for GIF signature: 47 49 46 38 (GIF8)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return true
    }
    // Check for WebP signature: RIFF...WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return true
    }
    return false
  }

  // Helper function to convert buffer to data URL with proper MIME type detection
  const bufferToDataUrl = async (buffer: Buffer): Promise<string | null> => {
    try {
      if (!buffer || buffer.length === 0) {
        console.warn('⚠️ Empty buffer provided to bufferToDataUrl')
        return null
      }

      // First, try to detect file type using file-type library
      const type = await fileType.fromBuffer(buffer)

      if (type) {
        // Only allow image types
        if (!type.mime.startsWith('image/')) {
          console.warn(`⚠️ Invalid image type detected: ${type.mime}, skipping image`)
          return null
        }
        const dataUrl = `data:${type.mime};base64,${buffer.toString('base64')}`
        // Validate the data URL format
        if (!dataUrl.startsWith('data:image/')) {
          console.warn('⚠️ Invalid data URL format generated')
          return null
        }
        return dataUrl
      }

      // If file-type couldn't detect, validate buffer manually
      if (!isValidImageBuffer(buffer)) {
        // Check if buffer might be corrupted or incomplete
        if (buffer.length < 100) {
          console.warn(
            `⚠️ Buffer too small (${buffer.length} bytes) - likely corrupted or incomplete download, skipping image`,
          )
        } else {
          console.warn(
            `⚠️ Could not detect image type and buffer does not appear to be a valid image format (PNG/JPEG/GIF/WebP), skipping image (buffer size: ${buffer.length} bytes)`,
          )
        }
        return null
      }

      // Buffer appears to be a valid image but type detection failed
      // Try to determine type from buffer signature
      let mimeType = 'image/png' // default
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        mimeType = 'image/jpeg'
      } else if (buffer[0] === 0x47 && buffer[1] === 0x49) {
        mimeType = 'image/gif'
      } else if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45) {
        mimeType = 'image/webp'
      }

      console.warn(
        `⚠️ Could not detect image type via file-type, but buffer appears valid. Using ${mimeType}`,
      )
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`

      if (!dataUrl.startsWith('data:image/')) {
        console.warn('⚠️ Invalid data URL format generated')
        return null
      }
      return dataUrl
    } catch (err) {
      console.error('⚠️ Error converting buffer to data URL:', err)
      return null
    }
  }

  // Logo & Signature - handle errors gracefully, don't fail PDF generation
  let logoDataUrl: string | undefined
  if (invoice.logoBuffer) {
    try {
      const dataUrl = await bufferToDataUrl(invoice.logoBuffer)
      if (dataUrl) {
        logoDataUrl = dataUrl
      }
    } catch (err) {
      console.warn('⚠️ Failed to process logo buffer, continuing without logo:', err)
    }
  }

  const adminPrefs = await getAdminInvoicePreferences().catch((err: any) => {
    console.warn(
      'Failed to load admin invoice preferences, continuing invoice PDF without platform logo:',
      err?.message || err,
    )
    return null
  })
  const platformLogoKey =
    adminPrefs?.includeLogo !== false && adminPrefs?.logoFile ? adminPrefs.logoFile : null

  const platformBrandName = normalizePlatformBrandName(adminPrefs?.brandName)

  // Platform logo comes from admin billing preferences only.
  let platformLogoDataUrl: string | undefined
  if (platformLogoKey) {
    try {
      const logoUrl = await presignDownload(platformLogoKey)
      if (logoUrl && typeof logoUrl === 'string') {
        try {
          const resp = await axios.get(logoUrl, { responseType: 'arraybuffer', timeout: 5000 })
          const buffer = Buffer.from(resp.data)
          const dataUrl = await bufferToDataUrl(buffer)
          if (dataUrl) {
            platformLogoDataUrl = dataUrl
          }
        } catch (err) {
          console.warn(
            '⚠️ Failed to download platform logo from admin billing preferences, continuing without it:',
            err,
          )
        }
      }
    } catch (err) {
      console.warn(
        '⚠️ Failed to get platform logo URL from admin billing preferences, continuing without it:',
        err,
      )
    }
  } else {
    console.log('ℹ️ No admin billing-preferences logo configured, skipping platform logo')
  }

  let signatureDataUrl: string | undefined
  if (invoice.signatureBuffer) {
    try {
      console.log('📝 Processing signature buffer for invoice...')
      const dataUrl = await bufferToDataUrl(invoice.signatureBuffer)
      if (dataUrl) {
        signatureDataUrl = dataUrl
        console.log('✅ Signature buffer successfully converted to data URL')
      } else {
        console.warn('⚠️ Signature buffer conversion returned null/undefined')
      }
    } catch (err) {
      console.warn('⚠️ Failed to process signature buffer, continuing without signature:', err)
    }
  } else {
    console.log('ℹ️ No signature buffer provided for invoice')
  }


  // -------------------
  // Prepare images object for pdfmake (must be before content arrays)
  // -------------------
  const images: Record<string, string> = {}

  // Validate and add logo
  if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.startsWith('data:image/')) {
    try {
      const base64Match = logoDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
      if (base64Match && base64Match[1] && base64Match[1].length > 0) {
        images.logo = logoDataUrl
        console.log('✅ Logo successfully added to invoice PDF')
      } else {
        console.warn('⚠️ Logo data URL missing base64 data, skipping')
      }
    } catch (err) {
      console.warn('⚠️ Error validating logo data URL, skipping:', err)
    }
  }

  // Validate and add signature
  if (
    signatureDataUrl &&
    typeof signatureDataUrl === 'string' &&
    signatureDataUrl.startsWith('data:image/')
  ) {
    try {
      const base64Match = signatureDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
      if (base64Match && base64Match[1] && base64Match[1].length > 0) {
        images.signature = signatureDataUrl
        console.log('✅ Signature successfully added to invoice PDF')
      } else {
        console.warn('⚠️ Signature data URL missing base64 data, skipping')
      }
    } catch (err) {
      console.warn('⚠️ Error validating signature data URL, skipping:', err)
    }
  } else if (invoice.signatureBuffer) {
    console.warn('⚠️ Signature buffer provided but could not be converted to data URL')
  }

  // Validate and add platform logo
  if (
    platformLogoDataUrl &&
    typeof platformLogoDataUrl === 'string' &&
    platformLogoDataUrl.startsWith('data:image/')
  ) {
    try {
      const base64Match = platformLogoDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
      if (base64Match && base64Match[1] && base64Match[1].length > 0) {
        images.platformLogo = platformLogoDataUrl
      } else {
        console.warn('⚠️ Platform logo data URL missing base64 data, skipping')
      }
    } catch (err) {
      console.warn('⚠️ Error validating platform logo data URL, skipping:', err)
    }
  }

  // -------------------
  // Charges
  // -------------------
  const subtotal = invoice.products.reduce((acc, p) => {
    const lineAmount = toAmount(p.price) * toAmount(p.qty ?? 1) - toAmount(p.discount ?? 0)
    return acc + Math.max(0, lineAmount)
  }, 0)
  const shipping = toAmount(invoice.shippingCharges)
  const giftWrap = toAmount(invoice.giftWrap)
  const txnFee = toAmount(invoice.transactionFee)
  const discount = Math.abs(toAmount(invoice.discount))
  const prepaid = Math.abs(toAmount(invoice.prepaidAmount))
  const grandTotal = subtotal + shipping + giftWrap + txnFee - (discount + prepaid)

  // Optional support line (avoid showing "null")
  const supportLine =
    invoice.supportEmail && invoice.supportEmail.trim().length > 0
      ? `• For support contact: ${invoice.supportEmail}`
      : null

  const productRowsThermal = [
    ['Item', 'Qty', 'Price', 'Total'],
    ...invoice.products.map((p) => {
      const qty = toAmount(p.qty ?? 1)
      const price = toAmount(p.price)
      const discount = toAmount(p.discount)
      const total = Math.max(0, price * qty - discount)
      return [
        p.name ?? p.box_name ?? 'N/A',
        qty.toString(),
        formatCurrency(price),
        formatCurrency(total),
      ]
    }),
  ]

  const borderLayout = {
    hLineColor: () => '#d1d5db',
    vLineColor: () => '#d1d5db',
    hLineWidth: () => 0.8,
    vLineWidth: () => 0.8,
  }

  const toSafeString = (value?: string | null) => (value ? value.trim() : '')
  const sellerDisplayName =
    toSafeString(invoice.brandName) || toSafeString(invoice.sellerName) || toSafeString(invoice.companyName)
  const sellerAddressLines = (invoice.sellerAddress || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const buyerAddressLines = [
    invoice.buyerAddress,
    [invoice.buyerCity, invoice.buyerState].filter(Boolean).join(', '),
    invoice.buyerPincode,
  ].filter(Boolean)
  const sellerStateCode = toSafeString(invoice.sellerStateCode)
  const buyerStateName = toSafeString(invoice.buyerState)
  const isInterState =
    sellerStateCode &&
    buyerStateName &&
    sellerStateCode.toLowerCase() !== buyerStateName.toLowerCase()
  const rtoCharges = toAmount(invoice.rtoCharges ?? 0)
  const badgeIsCOD = invoice.orderType === 'cod'
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0
  invoice.products.forEach((p) => {
    const qty = toAmount(p.qty ?? 1)
    const price = toAmount(p.price)
    const discount = toAmount(p.discount ?? 0)
    const taxRate = Math.max(0, toAmount(p.tax_rate))
    const lineTaxable = Math.max(0, price * qty - discount)
    const taxAmount = (lineTaxable * taxRate) / 100
    const lineIgst = isInterState ? taxAmount : 0
    const lineCgst = isInterState ? 0 : taxAmount / 2
    const lineSgst = isInterState ? 0 : taxAmount / 2
    cgstTotal += lineCgst
    sgstTotal += lineSgst
    igstTotal += lineIgst
  })
  const taxTotal = cgstTotal + sgstTotal + igstTotal
  const chargesBreakdown = [
    { label: 'Subtotal', value: subtotal },
    { label: 'Shipping Charges', value: shipping },
    { label: 'Gift Wrap', value: giftWrap },
    { label: 'Transaction Fee', value: txnFee },
    { label: 'RTO Charges', value: rtoCharges },
    { label: 'Discount', value: -discount },
    { label: 'Prepaid Amount', value: -prepaid },
  ]
  const breakdownSum = chargesBreakdown.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const grandTotalModern = breakdownSum + taxTotal
  const notesText = toSafeString(invoice.invoiceNotes)
  const termsText = toSafeString(invoice.termsAndConditions)
  const supportContact = [invoice.supportEmail, invoice.supportPhone].filter(Boolean).join(' | ')


  const buildHeaderBand = () => {
    const headerBlue = '#0a6fa5'
    return {
      table: {
        widths: ['*', 175],
        body: [[
          {
            text: 'INVOICE',
            color: '#ffffff',
            bold: true,
            fontSize: 24,
            alignment: 'center',
            margin: [0, 7, 0, 5],
            fillColor: headerBlue,
          },
          {
            stack: [
              { text: `Invoice Number: ${invoiceNumber || '-'}`, color: '#ffffff', bold: true, fontSize: 9 },
              { text: `Invoice Date: ${invoice.invoiceDate || '-'}`, color: '#ffffff', bold: true, fontSize: 9, margin: [0, 2, 0, 0] },
            ],
            alignment: 'left',
            margin: [8, 8, 8, 5],
            fillColor: headerBlue,
          },
        ]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 0],
    }
  }

  const buildClassicLayout = () => {
    const headerBlue = '#0a6fa5'
    const lightBlue = '#9fcae8'
    const softBlue = '#d9edf8'
    const gridColor = '#7f8c8d'
    const fieldFontSize = 9
    const valueFontSize = 9
    const sellerName = sellerDisplayName || invoice.companyName || 'Company'
    const sellerAddress = sellerAddressLines.length ? sellerAddressLines.join('\n') : '-'
    const buyerAddress = buyerAddressLines.length ? buyerAddressLines.join('\n') : '-'
    const supportEmail = toSafeString(invoice.supportEmail) || toSafeString(invoice.buyerEmail) || '-'
    const gstin = toSafeString(invoice.gstNumber) || toSafeString(invoice.companyGST) || '-'
    const pan = toSafeString(invoice.panNumber) || '-'
    const taxableSubtotal = subtotal + shipping + giftWrap + txnFee + rtoCharges - discount
    const balanceReceived = prepaid
    const balanceDue = Math.max(0, grandTotalModern)
    const termsValue =
      termsText ||
      notesText ||
      (supportContact ? `For support contact: ${supportContact}` : 'Goods once sold will not be taken back.')

    const formLayout = {
      hLineColor: () => gridColor,
      vLineColor: () => gridColor,
      hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    }

    const labelCell = (text: string, extra: Record<string, unknown> = {}) => ({
      text,
      bold: true,
      fontSize: fieldFontSize,
      color: '#111827',
      ...extra,
    })
    const valueCell = (text: string, extra: Record<string, unknown> = {}) => ({
      text: text || '-',
      fontSize: valueFontSize,
      color: '#111827',
      ...extra,
    })
    const blueHeaderCell = (text: string, extra: Record<string, unknown> = {}) => ({
      text,
      bold: true,
      color: '#ffffff',
      fillColor: headerBlue,
      fontSize: 10,
      ...extra,
    })
    const amountCell = (value: number, extra: Record<string, unknown> = {}) => ({
      text: formatCurrency(value),
      alignment: 'right',
      fontSize: 9,
      color: '#111827',
      ...extra,
    })

    const companyLogoCell = {
      rowSpan: 5,
      stack: images.logo
        ? [
            { image: 'logo', width: 105, alignment: 'center', margin: [0, 4, 0, 6] },
            { text: sellerName, bold: true, alignment: 'center', fontSize: 9, color: '#111827' },
          ]
        : images.platformLogo
        ? [
            { image: 'platformLogo', width: 105, alignment: 'center', margin: [0, 4, 0, 6] },
            { text: platformBrandName, bold: true, alignment: 'center', fontSize: 9, color: '#111827' },
          ]
        : [
            { text: platformBrandName, bold: true, alignment: 'center', fontSize: 14, color: headerBlue, margin: [0, 14, 0, 4] },
            { text: 'Platform Logo', alignment: 'center', fontSize: 8, color: mutedTextColor },
          ],
      margin: [6, 4, 6, 4],
    }

    const companySection = {
      table: {
        widths: [88, '*', 140],
        body: [
          [labelCell('Company Name:'), valueCell(sellerName), companyLogoCell],
          [labelCell('Address:'), valueCell(sellerAddress), {}],
          [labelCell('Email ID:'), valueCell(supportEmail), {}],
          [labelCell('GSTIN:'), valueCell(gstin), {}],
          [labelCell('PAN Number:'), valueCell(pan), {}],
        ],
      },
      layout: formLayout,
      margin: [0, 0, 0, 0],
    }

    const partySection = {
      table: {
        widths: ['50%', '50%'],
        body: [
          [
            blueHeaderCell('Billing To:'),
            blueHeaderCell('Shipping To:'),
          ],
          [
            labelCell('Name:'),
            labelCell('Name:'),
          ],
          [
            valueCell(invoice.buyerName),
            valueCell(invoice.buyerName),
          ],
          [
            labelCell('Address:'),
            labelCell('Address:'),
          ],
          [
            valueCell(buyerAddress, { minHeight: 28 }),
            valueCell(buyerAddress, { minHeight: 28 }),
          ],
          [
            labelCell('Phone Number:'),
            labelCell('Phone Number:'),
          ],
          [
            valueCell(invoice.buyerPhone),
            valueCell(invoice.buyerPhone),
          ],
          [
            labelCell('GSTIN:'),
            labelCell('GSTIN:'),
          ],
          [
            valueCell('-'),
            valueCell('-'),
          ],
        ],
      },
      layout: formLayout,
      margin: [0, 0, 0, 0],
    }

    const itemRows = invoice.products.map((p, index) => {
      const qty = toAmount(p.qty ?? 1)
      const price = toAmount(p.price)
      const itemDiscount = toAmount(p.discount ?? 0)
      const taxRate = Math.max(0, toAmount(p.tax_rate))
      const lineTaxable = Math.max(0, price * qty - itemDiscount)
      const lineTax = (lineTaxable * taxRate) / 100
      const lineTotal = lineTaxable + lineTax
      return [
        valueCell(String(index + 1), { alignment: 'center' }),
        valueCell(p.name ?? p.box_name ?? 'N/A'),
        valueCell(p.hsn || 'NA', { alignment: 'center' }),
        valueCell(qty.toString(), { alignment: 'center' }),
        amountCell(price),
        amountCell(lineTotal, { bold: true }),
      ] as TableCell[]
    })

    const emptyItemRows = Array.from({ length: Math.max(0, 5 - itemRows.length) }, () => [
      valueCell(' '),
      valueCell(' '),
      valueCell(' '),
      valueCell(' '),
      valueCell(' '),
      valueCell(' '),
    ] as TableCell[])

    const itemsTable = {
      table: {
        headerRows: 1,
        widths: [38, '*', 64, 50, 70, 82],
        body: [
          [
            { text: 'S.No.', bold: true, alignment: 'center', fillColor: lightBlue, color: '#ffffff', fontSize: 9 },
            { text: 'Description', bold: true, alignment: 'center', fillColor: lightBlue, color: '#ffffff', fontSize: 9 },
            { text: 'HSN\nCode', bold: true, alignment: 'center', fillColor: lightBlue, color: '#ffffff', fontSize: 9 },
            { text: 'QTY', bold: true, alignment: 'center', fillColor: lightBlue, color: '#ffffff', fontSize: 9 },
            { text: 'MRP', bold: true, alignment: 'center', fillColor: lightBlue, color: '#ffffff', fontSize: 9 },
            { text: 'Amount', bold: true, alignment: 'center', fillColor: lightBlue, color: '#ffffff', fontSize: 9 },
          ],
          ...itemRows,
          ...emptyItemRows,
        ],
      },
      layout: formLayout,
      margin: [0, 0, 0, 0],
    }

    const totalsRows: TableCell[][] = [
      [
        {
          rowSpan: 7,
          stack: [
            { text: 'Terms & Conditions', bold: true, fontSize: 9, margin: [0, 0, 0, 5] },
            { text: termsValue, fontSize: 8, color: '#111827' },
            supportContact ? { text: `Support: ${supportContact}`, fontSize: 8, color: mutedTextColor, margin: [0, 5, 0, 0] } : null,
            invoice.orderId ? { text: `Order ID: ${invoice.orderId}`, fontSize: 8, color: mutedTextColor, margin: [0, 5, 0, 0] } : null,
            invoice.awbNumber ? { text: `AWB: ${invoice.awbNumber}`, fontSize: 8, color: mutedTextColor } : null,
            { text: `Payment Type: ${badgeIsCOD ? 'COD' : 'PREPAID'}`, fontSize: 8, color: mutedTextColor },
          ].filter(Boolean),
          margin: [5, 5, 5, 5],
        },
        labelCell('Subtotal'),
        amountCell(taxableSubtotal),
      ],
      [{}, labelCell('CGST @'), amountCell(cgstTotal)],
      [{}, labelCell('SGST @'), amountCell(sgstTotal)],
      [{}, labelCell('IGST @'), amountCell(igstTotal)],
      [{}, labelCell('Balance\nReceived:'), amountCell(balanceReceived)],
      [{}, labelCell('Balance Due:'), amountCell(balanceDue)],
      [
        {},
        labelCell('Total', { fillColor: softBlue }),
        amountCell(grandTotalModern, { bold: true, fillColor: softBlue }),
      ],
    ]

    const termsAndTotals = {
      table: {
        widths: ['52%', '27%', '21%'],
        body: totalsRows,
      },
      layout: formLayout,
      margin: [0, 0, 0, 0],
    }

    const finalPanel = {
      table: {
        widths: ['50%', '50%'],
        body: [[
          {
            stack: [
              { text: 'Total Amount in Word', bold: true, alignment: 'center', color: '#ffffff', fontSize: 10, margin: [0, 0, 0, 10] },
              { text: amountInWords(grandTotalModern), alignment: 'center', color: '#111827', fontSize: 10, bold: true },
            ],
            fillColor: lightBlue,
            margin: [6, 7, 6, 20],
          },
          {
            stack: [
              { text: 'Seal & Signature', bold: true, alignment: 'center', color: '#ffffff', fontSize: 10, margin: [0, 0, 0, 8] },
              images.signature
                ? { image: 'signature', width: 120, alignment: 'center', margin: [0, 0, 0, 4] }
                : { text: 'Authorized Signatory', alignment: 'center', italics: true, color: '#111827', fontSize: 9, margin: [0, 14, 0, 4] },
              { text: sellerName, alignment: 'center', bold: true, color: '#111827', fontSize: 9 },
            ],
            fillColor: lightBlue,
            margin: [6, 7, 6, 16],
          },
        ]],
      },
      layout: formLayout,
      margin: [0, 0, 0, 0],
    }

    return [companySection, partySection, itemsTable, termsAndTotals, finalPanel]
  }

  const contentClassic: any[] = [buildHeaderBand(), ...buildClassicLayout()]

  // -------------------
  // Thermal Layout
  // -------------------
  const contentThermal: any[] = [
    { text: invoice.companyName ?? platformBrandName, alignment: 'center', bold: true },
    { text: 'TAX INVOICE', alignment: 'center', bold: true, margin: [0, 2, 0, 2] },
    {
      text: 'ORIGINAL FOR RECIPIENT',
      alignment: 'center',
      fontSize: fontSize - 1,
      color: '#4b5563',
      margin: [0, 0, 0, 2],
    },
    {
      table: {
        widths: ['*', '*'],
        body: [
          [
            { text: `Invoice: ${invoiceNumber}`, margin: [4, 4, 4, 4] },
            { text: `Date: ${invoice.invoiceDate}`, alignment: 'right', margin: [4, 4, 4, 4] },
          ],
        ],
      },
      layout: borderLayout,
      margin: [0, 0, 0, 4],
    },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: invoice.buyerName, bold: true },
                { text: invoice.buyerAddress },
                { text: `${invoice.buyerCity}, ${invoice.buyerState} - ${invoice.buyerPincode}` },
                { text: `Ph: ${invoice.buyerPhone}` },
              ],
              margin: [4, 4, 4, 4],
            },
          ],
        ],
      },
      layout: borderLayout,
      margin: [0, 0, 0, 4],
    },
    {
      table: { widths: ['*', 'auto', 'auto', 'auto'], body: productRowsThermal },
      layout: borderLayout,
      margin: [0, 0, 0, 4],
      fontSize,
    },
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          ['Subtotal', formatCurrency(subtotal)],
          ['Shipping', formatCurrency(shipping)],
          ['Gift Wrap', formatCurrency(giftWrap)],
          ['Txn Fee', formatCurrency(txnFee)],
          ['Discount', formatCurrency(-discount)],
          ['Prepaid', formatCurrency(-prepaid)],
          [
            { text: 'Grand Total', bold: true },
            { text: formatCurrency(grandTotal), bold: true },
          ],
        ],
      },
      layout: borderLayout,
      margin: [0, 0, 0, 4],
      fontSize,
    },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: 'Notes', bold: true, margin: [0, 0, 0, 2] },
                ...(supportLine ? [{ text: supportLine }] : []),
                { text: 'Transit delays are beyond our control.' },
              ],
              margin: [4, 4, 4, 4],
              color: '#4b5563',
            },
          ],
        ],
      },
      layout: borderLayout,
      margin: [0, 0, 0, 4],
    },
    images.signature
      ? { image: 'signature', width: 56, alignment: 'right', margin: [0, 4, 0, 0] }
      : { text: 'Authorized Signatory', alignment: 'right', italics: true, fontSize, color: '#6b7280' },
    platformLogoDataUrl
      ? { image: 'platformLogo', width: 40, alignment: 'center', margin: [0, 4, 0, 0] }
      : null,
    {
      text: `Powered by ${platformBrandName}`,
      alignment: 'center',
      italics: true,
      margin: [0, 4, 0, 0],
      fontSize,
      color: '#6b7280',
    },
  ].filter(Boolean)

  // -------------------
  // Final Definition
  // -------------------
  // Images object is already created above, before content arrays

  const docDefinition: any = {
    content: isThermal ? contentThermal : contentClassic,
    ...(Object.keys(images).length > 0 && { images }),
    styles: {
      sectionHeader: { bold: true, fontSize: fontSize + 2, color: accentColor, font: classicBaseFont },
      sectionTitle: { bold: true, fontSize: fontSize + 1, color: sectionTitleColor, font: classicBaseFont },
      sectionTag: { bold: true, fontSize: 8, color: sectionTitleColor, characterSpacing: 1 },
    },
    defaultStyle: { font: isThermal ? 'Helvetica' : classicBaseFont, fontSize, color: '#000' },
    pageMargins: isThermal ? [5, 5, 5, 5] : [40, 40, 40, 60],
    pageSize: isThermal ? { width: 220, height: 'auto' } : 'A4',
    footer: (currentPage: number, pageCount: number) => {
      const footerStack: any[] = [
        {
          text: 'This is a system generated invoice and does not require a physical signature.',
          fontSize: 8,
          color: mutedTextColor,
        },
        supportContact
          ? { text: `Support: ${supportContact}`, fontSize: 8, color: mutedTextColor }
          : null,
        termsText
          ? {
              text: `Terms & Conditions: ${termsText}`,
              fontSize: 7,
              color: mutedTextColor,
              margin: [0, 3, 0, 0],
            }
          : null,
        {
          text: 'Logistics services are subject to courier partner terms and applicable laws.',
          fontSize: 7,
          color: mutedTextColor,
          margin: [0, 3, 0, 0],
        },
        images.platformLogo
          ? { image: 'platformLogo', width: 60, alignment: 'center', margin: [0, 6, 0, 0] }
          : null,
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 7,
          color: mutedTextColor,
          alignment: 'right',
          margin: [0, 5, 0, 0],
        },
      ].filter(Boolean)
      return { stack: footerStack, margin: isThermal ? [5, 0, 5, 0] : [40, 0, 40, 0] }
    },
  }

  // Final safety: Helvetica can render ₹ incorrectly in some environments.
  // Normalize any remaining rupee glyphs in all PDF text nodes.
  const normalizeRupeeGlyphs = (node: any): any => {
    if (typeof node === 'string') return node.replace(/₹/g, 'Rs.')
    if (Array.isArray(node)) return node.map(normalizeRupeeGlyphs)
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) {
        node[key] = normalizeRupeeGlyphs(node[key])
      }
      return node
    }
    return node
  }
  normalizeRupeeGlyphs(docDefinition)

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition)
      const chunks: Buffer[] = []
      pdfDoc.on('data', (chunk) => chunks.push(chunk))
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
      pdfDoc.on('error', (err) => {
        console.error('❌ PDF generation error:', err)
        // Provide more helpful error message
        if (err && typeof err === 'object' && 'message' in err) {
          const errorMsg = (err as any).message || String(err)
          if (errorMsg.includes('Unknown image format') || errorMsg.includes('Invalid image')) {
            reject(
              new Error(
                `Invoice PDF generation failed: Invalid image format. Please check logo/signature files are valid images (PNG, JPEG, GIF, or WebP). Original error: ${errorMsg}`,
              ),
            )
          } else {
            reject(new Error(`Invoice PDF generation failed: ${errorMsg}`))
          }
        } else {
          reject(err)
        }
      })
      pdfDoc.end()
    } catch (err: any) {
      console.error('❌ Error creating PDF document:', err)
      reject(new Error(`Failed to create invoice PDF: ${err?.message || String(err)}`))
    }
  })
}

type Filters = {
  status?: string
  userId?: string
  invoiceNumber?: string
  dateFrom?: string
  dateTo?: string
  awb?: string
}

export const getInvoicesService = async ({
  page,
  limit,
  filters,
}: {
  page: number
  limit: number
  filters: Filters
}) => {
  const offset = (page - 1) * limit

  const whereClauses = []

  if (filters.status) {
    whereClauses.push(eq(invoices.status, filters.status as any))
  }
  if (filters.userId) {
    whereClauses.push(eq(invoices.userId, filters.userId))
  }
  if (filters.invoiceNumber) {
    whereClauses.push(ilike(invoices.invoiceNumber, `%${filters.invoiceNumber}%`))
  }
  if (filters.dateFrom) {
    whereClauses.push(gte(invoices.invoiceDate, filters.dateFrom))
  }
  if (filters.dateTo) {
    whereClauses.push(lte(invoices.invoiceDate, filters.dateTo))
  }
  console.log('filters', filters)
  if (filters.awb) {
    // Look into items JSONB for orderId matching AWB
    whereClauses.push(
      sql`EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(${invoices.items}) AS item
        WHERE item->>'awb' ILIKE ${'%' + filters.awb + '%'}
      )`,
    )
  }

  const whereCondition = whereClauses.length > 0 ? and(...whereClauses) : undefined

  // Fetch paginated invoices
  const data = await db
    .select()
    .from(invoices)
    .where(whereCondition!)
    .orderBy(desc(invoices.invoiceDate))
    .limit(limit)
    .offset(offset)

  // Count total
  const total = (
    await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(whereCondition!)
  )[0].count as number

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    data,
  }
}
