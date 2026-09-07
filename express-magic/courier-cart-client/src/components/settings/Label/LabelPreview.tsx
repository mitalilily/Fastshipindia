/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, Paper, Stack, Typography } from '@mui/material'
import Barcode from 'react-barcode'
import type { LabelPreferences } from '../../../api/labelPreference.api'
import { getCourierDisplayName } from '../../../utils/courierDisplay'

const normalize = (value: unknown) => {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value.trim() : `${value}`
}

const clampText = (value: unknown, max = 25) => {
  const text = normalize(value)
  if (!text) return '-'
  return text.length > max ? `${text.slice(0, max)}...` : text
}

const pickFirst = (...values: unknown[]) => values.map(normalize).find(Boolean) || ''

const isEnabled = (value: unknown) => (value === undefined ? true : value === true)
const PLATFORM_LABEL_BRAND = 'FastShip'

const buildWeight = (order: any) => {
  if (order.deadWeight) return normalize(order.deadWeight)
  if (order.weightKg) return `${order.weightKg} kgs`
  if (order.weight) {
    const raw = Number(order.weight)
    const kg = Number.isFinite(raw) && raw > 20 ? raw / 1000 : raw
    return `${kg} kgs`
  }
  return ''
}

type LabelPreviewProps = {
  values: any
  order: any
  preferences?: LabelPreferences
}

export function LabelPreview({ values, order }: LabelPreviewProps) {
  const charsLimit = Math.max(5, Number(values?.charLimit ?? 36))
  const maxItems = Math.max(1, Number(values?.maxItems ?? 4))

  const awbNumber = pickFirst(order.awb, order.awbNumber, order.awb_number)
  const courierName = getCourierDisplayName(
    {
      name: order.courier || order.courier_partner,
      courier_id: order.courierId ?? order.courier_id,
      integration_type: order.integration_type,
      mode: order.shipping_mode,
    },
    'Courier',
  )
  const paymentType = (normalize(order.paymentType) || normalize(order.payment_type) || 'prepaid').toLowerCase()
  const paymentLabel = paymentType === 'cod' ? 'COD' : 'Prepaid'

  const productEntries = Array.isArray(order.products) ? order.products.slice(0, maxItems) : []
  const orderId = pickFirst(order.orderId, order.order_id, order.order_number)
  const referenceOrder = pickFirst(order.referenceOrder, order.order_number, order.orderId)
  const invoiceNumber = pickFirst(order.invoiceNumber, order.invoice_number)
  const orderValue = pickFirst(order.totalAmount, order.orderValue, order.order_amount, order.declaredValue)
  const customerPhone = pickFirst(order.phone, order.buyer_phone, order.customerPhone)
  const sortCode = pickFirst(order.sortCode, order.sort_code, order.routing_code)
  const weightValue = buildWeight(order)

  const showLogo = isEnabled(values.shipperInfo?.brandLogo)
  const showSellerName = isEnabled(values.shipperInfo?.sellerBrandName)
  const showShipperAddress = isEnabled(values.shipperInfo?.shipperAddress)
  const showShipperPhone = isEnabled(values.shipperInfo?.shipperPhone)
  const showShipperGst = isEnabled(values.shipperInfo?.gstin)
  const showReturnAddress = isEnabled(values.shipperInfo?.rtoAddress)
  const showCustomerPhone = isEnabled(values.orderInfo?.customerPhone) && Boolean(customerPhone)
  const showOrderId = isEnabled(values.orderInfo?.orderId) && Boolean(orderId)
  const showInvoiceNumber = isEnabled(values.orderInfo?.invoiceNumber) && Boolean(invoiceNumber)
  const showDeclaredValue = isEnabled(values.orderInfo?.declaredValue) && Boolean(orderValue)
  const showAwb = isEnabled(values.orderInfo?.awb) && Boolean(awbNumber)
  const showWeight = isEnabled(values.productInfo?.deadWeight) && Boolean(weightValue)
  const showSortCode = isEnabled(values.orderInfo?.rtoRoutingCode) && Boolean(sortCode)
  const showCodBanner = isEnabled(values.orderInfo?.cod)

  const productColumns = [
    { key: 'name', label: 'Product Name', enabled: isEnabled(values.productInfo?.itemName), width: '48%' },
    { key: 'sku', label: 'SKU', enabled: isEnabled(values.productInfo?.skuCode), width: '26%' },
    { key: 'qty', label: 'Quantity', enabled: isEnabled(values.productInfo?.productQuantity), width: '26%' },
    { key: 'amount', label: 'Amount', enabled: isEnabled(values.productInfo?.productCost), width: '26%' },
  ].filter((column) => column.enabled)

  const productValue = (product: any, key: string) => {
    if (key === 'sku') return normalize(product.sku ?? product.skuCode) || '-'
    if (key === 'qty') return normalize(product.qty ?? product.quantity ?? 1)
    if (key === 'amount') return normalize(product.price) || '-'
    return clampText(product.name ?? product.productName, charsLimit)
  }

  const shipperName = pickFirst(order.shipper?.name, 'Client Store')
  const labelBrandName = PLATFORM_LABEL_BRAND
  const shipperAddress = pickFirst(order.shipper?.rtoAddress, order.shipper?.address)
  const returnAddress = pickFirst(order.shipper?.rtoAddress, order.shipper?.address)
  const serviceMode = pickFirst(order.shipping_mode, 'Surface')
  const showShipperBlock =
    showSellerName ||
    showShipperAddress ||
    (showShipperPhone && Boolean(order.shipper?.phone)) ||
    (showShipperGst && Boolean(order.shipper?.gst))

  return (
    <Paper
      sx={{
        p: 1.25,
        border: '1.5px solid #111',
        borderRadius: 0,
        width: values.printer === 'thermal' ? '100mm' : '210mm',
        minHeight: values.printer === 'thermal' ? '150mm' : '297mm',
        bgcolor: '#fff',
        color: '#111',
        mx: 'auto',
        fontFamily: 'Arial, sans-serif',
      }}
      elevation={0}
    >
      <Stack spacing={1.05}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.08fr',
            mx: -1.25,
            mt: -1.25,
            borderBottom: '1.5px solid #cbd5e1',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1.05, bgcolor: '#fff' }}>
            {showLogo ? (
              <Box
                sx={{
                  width: 33,
                  height: 33,
                  bgcolor: '#0f2e4d',
                  borderRadius: 1,
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 8,
                  fontWeight: 900,
                }}
              >
                  FS
              </Box>
            ) : null}
            <Box>
              {showSellerName && (
                <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1.05, color: '#0f172a' }}>
                  {clampText(labelBrandName, 18).toUpperCase()}
                </Typography>
              )}
              <Typography sx={{ fontSize: 9, fontWeight: 900, color: '#f15a24', letterSpacing: 3 }}>
                {serviceMode.toUpperCase()}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ px: 1, py: 1.15, bgcolor: '#0f2e4d', textAlign: 'center' }}>
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>
              SHIPPING LABEL
            </Typography>
            <Typography sx={{ fontSize: 8, fontWeight: 800, color: '#dbeafe' }}>
              Safe Delivery | On Time | Every Time
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box sx={{ border: '1.5px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
            <Typography sx={{ display: 'inline-block', px: 1.2, py: 0.65, bgcolor: '#0f2e4d', color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>
              DELIVER TO
            </Typography>
            <Box sx={{ px: 1, py: 0.9 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{order.name?.toUpperCase()}</Typography>
              {showCustomerPhone && <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#0f2e4d' }}>{customerPhone}</Typography>}
              <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.16, mt: 0.4 }}>{order.address}</Typography>
            </Box>
          </Box>
          <Box sx={{ border: '1.5px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
            {[
              showOrderId && ['Order Id', orderId],
              ['Ref No.', referenceOrder],
              showInvoiceNumber && ['Invoice #', invoiceNumber],
              ['Date', order.orderDate],
              showCodBanner && ['Payment Type', paymentLabel],
              showWeight && ['Weight', weightValue],
              showDeclaredValue && ['Invoice Value', orderValue],
            ]
              .filter(Boolean)
              .map((row) => {
                const [label, value] = row as string[]
                return (
                  <Box
                    key={label}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      borderBottom: '1px solid #cbd5e1',
                      '&:last-of-type': { borderBottom: 0 },
                    }}
                  >
                    <Typography sx={{ px: 0.8, py: 0.45, fontSize: 10, fontWeight: 900, color: '#475569' }}>
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        px: 0.8,
                        py: 0.45,
                        fontSize: 10,
                        fontWeight: 900,
                        borderLeft: '1px solid #cbd5e1',
                        color: label === 'Invoice Value' ? '#f15a24' : '#111827',
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                )
              })}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '0.85fr 1.7fr', border: '1.5px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ borderRight: '1.5px dashed #cbd5e1', textAlign: 'center' }}>
            <Typography sx={{ bgcolor: '#0f2e4d', color: '#fff', py: 0.65, fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>
              COURIER
            </Typography>
            <Typography sx={{ px: 1, pt: 2, pb: 0.5, fontSize: 12, fontWeight: 900, color: '#475569' }}>
              {courierName}
            </Typography>
            <Typography sx={{ px: 1, pb: 1.4, fontSize: 11, fontWeight: 800, color: '#475569' }}>
              ({serviceMode})
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', px: 1, py: 1 }}>
            {showAwb && (
              <>
                <Typography sx={{ display: 'inline-block', px: 1.2, py: 0.45, bgcolor: '#f8fafc', borderRadius: 1, fontSize: 10, fontWeight: 900 }}>
                  AWB / TRACKING NO
                </Typography>
                <Typography sx={{ mt: 0.7, fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>
                  {awbNumber}
                </Typography>
                <Box sx={{ mx: 'auto', mt: 0.4, width: 170, overflow: 'hidden' }}>
                  <Barcode value={awbNumber} height={44} width={1.25} fontSize={0} margin={0} displayValue={false} />
                </Box>
              </>
            )}
            {showSortCode && <Typography sx={{ fontSize: 9, fontWeight: 900 }}>Sort Code: {sortCode}</Typography>}
          </Box>
        </Box>

        {showShipperBlock && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1.15fr', border: '1.5px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 1, p: 1, borderRight: '1.5px dashed #cbd5e1' }}>
              <Box sx={{ width: 28, height: 28, bgcolor: '#f15a24', borderRadius: 1, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                R
              </Box>
              <Box>
                {showShipperAddress && (
                  <>
                    <Typography sx={{ fontSize: 8.5, fontWeight: 900 }}>
                      {showReturnAddress ? 'If not delivered, return to:' : 'Pickup address:'}
                    </Typography>
                    <Typography sx={{ fontSize: 9, fontWeight: 800, lineHeight: 1.18 }}>{returnAddress || shipperAddress}</Typography>
                  </>
                )}
              </Box>
            </Box>
            <Box sx={{ p: 1 }}>
              <Typography sx={{ fontSize: 9, fontWeight: 900 }}>Contact name : {shipperName}</Typography>
              {showSellerName && <Typography sx={{ fontSize: 9, fontWeight: 900 }}>Company name : {shipperName}</Typography>}
              {showShipperPhone && order.shipper?.phone && (
                <Typography sx={{ fontSize: 9, fontWeight: 900 }}>Phone : {order.shipper.phone}</Typography>
              )}
              {showShipperGst && order.shipper?.gst && (
                <Typography sx={{ fontSize: 9, fontWeight: 900 }}>GSTIN : {order.shipper.gst}</Typography>
              )}
            </Box>
          </Box>
        )}

        {productColumns.length > 0 && (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mt: 0.5 }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderTop: '1px solid #111', borderBottom: '2px solid #111' }}>
                {productColumns.map((column) => (
                  <Box
                    component="th"
                    key={column.key}
                    align={column.key === 'name' ? 'left' : 'center'}
                    sx={{ width: column.width, py: 0.7, fontSize: 10 }}
                  >
                    {column.label}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {(productEntries.length ? productEntries : [{}]).map((product: any, index: number) => (
                <Box
                  component="tr"
                  key={`${product.name || 'product'}-${index}`}
                  sx={{ borderBottom: '1px solid #111' }}
                >
                  {productColumns.map((column) => (
                    <Box
                      component="td"
                      key={column.key}
                      align={column.key === 'name' ? 'left' : 'center'}
                      sx={{ py: 0.35, fontSize: 9 }}
                    >
                      {productValue(product, column.key)}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: 0.8, px: 1, py: 0.75 }}>
          <Typography sx={{ fontSize: 9, fontWeight: 900, color: '#64748b' }}>Thank you for choosing us!</Typography>
          <Typography sx={{ fontSize: 9, fontWeight: 900, color: '#475569' }}>POWERED BY FASTSHIP</Typography>
        </Box>
      </Stack>
    </Paper>
  )
}
