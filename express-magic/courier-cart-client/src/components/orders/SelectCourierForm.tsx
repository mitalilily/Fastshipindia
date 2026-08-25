import { Box, Chip, CircularProgress, Divider, Grid, Paper, Stack, Typography, alpha } from '@mui/material'
import { useFormContext } from 'react-hook-form'
import { BiCalendar, BiCheckCircle, BiMap, BiPackage, BiUser } from 'react-icons/bi'
import { TbPlane, TbTruck } from 'react-icons/tb'
import {
  useAvailableCouriers,
  type UseAvailableCouriersParams,
} from '../../hooks/Integrations/useCouriers'
import { usePaymentOptions } from '../../hooks/usePaymentOptions'
import { b2bBoxWeightInputToKg } from '../../utils/b2bWeight'
import { defaultLogo } from '../../utils/constants'
import { getCourierDisplayName, getCourierLogo } from '../../utils/courierDisplay'
import { normalizeParcelWeightInputToGrams } from '../../utils/weight'
import { toast } from '../UI/Toast'
import type { Box as B2BBox, B2BFormData } from './b2b/B2BOrderForm'
import type { B2CFormData } from './b2c/B2COrderForm'

const ACCENT = '#0D3B8E'
const TEXT_PRIMARY = '#102A54'
const TEXT_SECONDARY = '#4C6185'
const SURFACE = '#F6F8FC'
const DEFAULT_B2B_VOLUMETRIC_DIVISOR = 4500

const roundMoney = (value: number) => Math.round(value * 100) / 100
const calculateB2BVolumetricKg = (
  length: number,
  breadth: number,
  height: number,
  factor = DEFAULT_B2B_VOLUMETRIC_DIVISOR,
) => {
  if (length <= 0 || breadth <= 0 || height <= 0) return 0

  const volumeCm3 = length * breadth * height
  return factor <= 100 ? (volumeCm3 / 28316.846592) * factor : volumeCm3 / factor
}
const getB2BBoxQuantity = (box?: Partial<B2BBox>) =>
  Math.max(1, Math.floor(Number(box?.quantity || 1)))

const computeInsuranceChargePreview = ({
  enabled,
  threshold,
  baseAmount,
  percentage,
  shipmentValue,
}: {
  enabled: boolean
  threshold: number
  baseAmount: number
  percentage: number
  shipmentValue: number
}) => {
  const normalizedValue = roundMoney(Math.max(0, shipmentValue))
  if (!enabled || normalizedValue <= 0) return 0
  if (normalizedValue <= threshold) return roundMoney(baseAmount)

  return roundMoney(baseAmount + (Math.max(0, normalizedValue - threshold) * percentage) / 100)
}

export const SelectCourierForm = ({
  shipment_type,
  showSummary = true,
}: {
  shipment_type: 'b2b' | 'b2c'
  showSummary?: boolean
}) => {
  const { watch, setValue, clearErrors } = useFormContext<B2BFormData | B2CFormData>()
  const { data: paymentOptions } = usePaymentOptions()

  const products = watch('products') ?? []
  const b2bBoxes = watch('boxes') as B2BBox[] | undefined
  const b2bInvoices = (watch('invoices') as Array<{ invoiceValue?: number }> | undefined) ?? []
  const deliveryPincode = watch('pincode') ?? ''
  const pickupPincode = watch('pickupLocationPincode') ?? ''
  const pickupName = watch('pickupLocationName') ?? ''
  const pickupId = watch('pickupLocationId') ?? ''
  const pickupAddressLine = watch('pickupAddress') ?? ''
  const pickupCity = watch('pickupCity') ?? ''
  const pickupState = watch('pickupState') ?? ''
  const pickupDate = watch('pickupDate') ?? ''
  const deliveryAddressLine = watch('address') ?? ''
  const deliveryCity = watch('city') ?? ''
  const deliveryState = watch('state') ?? ''
  const length = Number(watch('length') ?? 0)
  const breadth = Number(watch('breadth') ?? 0)
  const height = Number(watch('height') ?? 0)
  const prepaidAmount = Number(watch('prepaidAmount') ?? 0)
  const orderType = watch('orderType') ?? 'prepaid'
  const selectedCourierId = watch('courierPartnerId') ?? ''
  const selectedCourierOptionKey = watch('courierOptionKey') ?? ''
  const shippingCharges = Number(watch('shippingCharges') || 0)
  const transactionFee = Number(watch('transactionFee') || 0)
  const giftWrap = Number(watch('giftWrap') || 0)
  const discount = Number(watch('discount') || 0)
  const courierCod = Number(watch('courierCod') || 0)
  const forwardCharges = Number(watch('forwardCharges') || 0)
  const otherCharges = Number(watch('otherCharges') || 0)
  const enteredB2BTotalWeightKg = shipment_type === 'b2b' ? Number(watch('weight') || 0) : 0

  // COMPUTE TOTAL WEIGHT AND PRICE
  let totalWeight = 0
  let totalActualWeight = 0
  let totalVolumetricWeight = 0
  let totalProductPrice = 0

  if (shipment_type === 'b2b') {
    // B2B uses flat boxes array, not nested in products
    if (b2bBoxes && Array.isArray(b2bBoxes)) {
      b2bBoxes.forEach((box: B2BBox) => {
        const quantity = getB2BBoxQuantity(box)
        const actualWeightKg = b2bBoxWeightInputToKg(box.weightKg)
        const length = Number(box.lengthCm ?? 0) // in cm
        const breadth = Number(box.breadthCm ?? 0) // in cm
        const height = Number(box.heightCm ?? 0) // in cm

        const volumetricWeightKg = calculateB2BVolumetricKg(length, breadth, height)

        totalActualWeight += actualWeightKg * quantity * 1000
        totalVolumetricWeight += volumetricWeightKg * quantity * 1000
      })
    }
    totalActualWeight =
      enteredB2BTotalWeightKg > 0 ? enteredB2BTotalWeightKg * 1000 : totalActualWeight
    totalWeight = Math.max(totalActualWeight, totalVolumetricWeight)
    totalProductPrice = products?.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum, product: any) =>
        sum +
        Number(product.unitPrice ?? product.price ?? 0) * Number(product.quantity ?? 1),
      0,
    )
  } else if (shipment_type === 'b2c') {
    totalWeight = normalizeParcelWeightInputToGrams(watch('weight') ?? 0)
    totalProductPrice = products?.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum, p: any) => sum + Number(p.price ?? 0) * Number(p.quantity ?? 1),
      0,
    )
  }

  const totalB2BInvoiceValue = b2bInvoices.reduce(
    (sum, invoice) => sum + Number(invoice?.invoiceValue ?? 0),
    0,
  )
  const b2bDeclaredValue =
    totalB2BInvoiceValue > 0 ? totalB2BInvoiceValue : Math.max(totalProductPrice, 0)
  const merchandiseValue = shipment_type === 'b2b' ? b2bDeclaredValue : totalProductPrice

  // Total shown to seller: customer-facing charges only (what customer pays)
  // Includes: products + shipping + COD (for COD orders only) + transaction_fee + gift_wrap - discount - prepaid
  // Does NOT include courier freight/COD/other charges (those are what seller pays to courier)
  const totalOrderValue =
    merchandiseValue + shippingCharges + transactionFee + giftWrap - discount - prepaidAmount
  const declaredOrderValue = Math.max(
    merchandiseValue + shippingCharges + transactionFee + giftWrap - discount,
    0,
  )
  const insuranceChargeBasis =
    shipment_type === 'b2b'
      ? Math.max(b2bDeclaredValue + transactionFee - discount, 0)
      : declaredOrderValue
  const insuranceCharge = computeInsuranceChargePreview({
    enabled: Boolean(paymentOptions?.insuranceChargeEnabled),
    threshold: Number(paymentOptions?.insuranceChargeThreshold ?? 2000),
    baseAmount: Number(paymentOptions?.insuranceChargeBaseAmount ?? 5),
    percentage: Number(paymentOptions?.insuranceChargePercentage ?? 0.5),
    shipmentValue: insuranceChargeBasis,
  })
  const walletDebitPreview =
    forwardCharges + otherCharges + (orderType === 'cod' ? courierCod : 0) + insuranceCharge
  const shouldShowWalletDebitPreview =
    Boolean(selectedCourierOptionKey || selectedCourierId) && walletDebitPreview > 0
  const courierPayloadOrderAmount =
    declaredOrderValue > 0 ? declaredOrderValue : Math.max(merchandiseValue, 0)
  const codChargeBasis = Math.max(totalOrderValue, 0)

  const cod = orderType === 'cod' ? 1 : 0

  // COURIER API payload
  const b2bLength = Math.max(0, ...(b2bBoxes ?? []).map((box) => Number(box.lengthCm || 0)))
  const b2bBreadth = Math.max(0, ...(b2bBoxes ?? []).map((box) => Number(box.breadthCm || 0)))
  const b2bHeight = Math.max(0, ...(b2bBoxes ?? []).map((box) => Number(box.heightCm || 0)))
  const courierRequestWeight = shipment_type === 'b2b' ? totalActualWeight / 1000 : totalWeight
  const totalB2BBoxCount =
    shipment_type === 'b2b'
      ? (b2bBoxes ?? []).reduce((sum, box) => sum + getB2BBoxQuantity(box), 0)
      : 0

  const courierPayload: UseAvailableCouriersParams = {
    pickupPincode,
    deliveryPincode,
    deliveryAddress: deliveryAddressLine,
    pickupName,
    pickupId,
    pickupAddressKey: `${pickupPincode}-${pickupAddressLine}-${pickupCity}-${pickupState}`,
    deliveryAddressKey: `${deliveryPincode}-${deliveryAddressLine}-${deliveryCity}-${deliveryState}`,
    weight: courierRequestWeight,
    cod,
    payment_type: orderType,
    pickupDate,
    orderAmount: courierPayloadOrderAmount,
    codChargeBasis,
    shipmentType: shipment_type,
  }

  if (shipment_type === 'b2c') {
    courierPayload.length = length
    courierPayload.breadth = breadth
    courierPayload.height = height
  } else {
    courierPayload.length = b2bLength
    courierPayload.breadth = b2bBreadth
    courierPayload.height = b2bHeight
  }

  const { data: couriers, error, isLoading, isError, isFetching } =
    useAvailableCouriers(courierPayload)
  const availableCouriers = (couriers ?? []).filter((courier) => {
    if (shipment_type !== 'b2b') return true

    const provider = String(courier?.integration_type ?? courier?.serviceProvider ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    const name = String(courier?.name ?? '').toLowerCase()
    return (
      provider.startsWith('delhivery') ||
      provider.startsWith('bigship') ||
      provider.startsWith('shipmozo') ||
      name.includes('delhivery') ||
      name.includes('bigship') ||
      name.includes('shipmozo')
    )
  })
  if (!pickupPincode || !deliveryPincode || !totalWeight) {
    return <Typography>Fill pickup, delivery, and weight first to fetch couriers</Typography>
  }
  if (isLoading || (isFetching && !availableCouriers.length))
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress color="primary" size={28} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Checking serviceability and rates…
        </Typography>
      </Paper>
    )
  if (isError) {
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to fetch B2B couriers. Please try again.'

    return (
      <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'error.light' }}>
        <Typography color="error" fontWeight={700}>
          {shipment_type === 'b2b' ? 'B2B courier setup required' : 'Failed to fetch couriers'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          {errorMessage}
        </Typography>
      </Paper>
    )
  }
  if (!availableCouriers.length)
    return (
      <Typography color={shipment_type === 'b2b' ? 'warning.main' : 'text.primary'}>
        {shipment_type === 'b2b'
          ? 'No B2B courier is available for this route. Check the pickup and delivery pincodes.'
          : 'No couriers available'}
      </Typography>
    )

  const getModeIcon = (mode?: string) => {
    const normalizedMode = String(mode || '').toLowerCase()
    if (normalizedMode === 'air' || normalizedMode === 'express') return <TbPlane size={16} />
    if (normalizedMode === 'surface') return <TbTruck size={16} />
    return null
  }

  const formatCurrency = (value?: number | string | null) => `₹${Number(value || 0).toFixed(2)}`
  const formatWeightKg = (value?: number | null) =>
    value ? `${(Number(value) / 1000).toFixed(2)} kg` : '—'
  const formatCourierWeightKg = (value?: number | null) => {
    if (!value) return '-'
    if (shipment_type !== 'b2b') return formatWeightKg(value)
    const weightKg = shipment_type === 'b2b' ? Number(value) : Number(value) / 1000
    return `${weightKg.toFixed(2)} kg`
  }
  const toChargeNumber = (value: unknown) => {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const getB2BChargeableWeightKg = (courier: (typeof availableCouriers)[number]) => {
    const factor =
      toChargeNumber(courier?.localRates?.forward?.volumetricFactor) ||
      DEFAULT_B2B_VOLUMETRIC_DIVISOR
    if (!b2bBoxes?.length) return Number(totalWeight || 0) / 1000

    const calculatedActualWeightKg = b2bBoxes.reduce(
      (sum, box) => sum + b2bBoxWeightInputToKg(box.weightKg) * getB2BBoxQuantity(box),
      0,
    )
    const actualWeightKg =
      enteredB2BTotalWeightKg > 0 ? enteredB2BTotalWeightKg : calculatedActualWeightKg
    const volumetricWeightKg = b2bBoxes.reduce((sum, box) => {
      const volumetricWeightKg = calculateB2BVolumetricKg(
        toChargeNumber(box.lengthCm),
        toChargeNumber(box.breadthCm),
        toChargeNumber(box.heightCm),
        factor,
      )

      return sum + volumetricWeightKg * getB2BBoxQuantity(box)
    }, 0)

    return Math.max(actualWeightKg, volumetricWeightKg)
  }
  const getCourierFreightCharge = (courier: (typeof availableCouriers)[number]) => {
    const directRate = toChargeNumber(courier?.rate)
    if (directRate > 0) return directRate

    const forwardRate = toChargeNumber(courier?.localRates?.forward?.rate)
    if (forwardRate > 0) return forwardRate

    const b2bRatePerKg = toChargeNumber(courier?.localRates?.forward?.ratePerKg)
    if (shipment_type === 'b2b' && b2bRatePerKg > 0) {
      return b2bRatePerKg * getB2BChargeableWeightKg(courier)
    }

    return 0
  }
  const sumB2BOverheads = (overheads: unknown) =>
    Array.isArray(overheads)
      ? overheads.reduce((sum, overhead) => sum + toChargeNumber(overhead?.amount), 0)
      : 0
  const getB2BAuthoritativeCharge = (courier: (typeof availableCouriers)[number]) => {
    const directFinal = toChargeNumber(
      courier?.final_courier_charge ??
        courier?.seller_freight_charge ??
        courier?.final_freight_charge ??
        courier?.total_charges,
    )
    if (directFinal > 0) return directFinal

    const forward = courier?.localRates?.forward || {}
    const forwardTotal = toChargeNumber(
      forward?.total ??
        forward?.total_charges ??
        forward?.totalCharges ??
        forward?.totalCharge ??
        forward?.finalAmount,
    )
    if (forwardTotal > 0) return forwardTotal

    const composedTotal =
      toChargeNumber(forward?.baseFreight) +
      toChargeNumber(forward?.demurrage) +
      sumB2BOverheads(forward?.overheads)
    if (composedTotal > 0) return composedTotal

    return getCourierFreightCharge(courier)
  }
  const getCourierProviderCost = (courier: (typeof availableCouriers)[number]) => {
    const providerTotal = toChargeNumber(courier?.provider_rate?.total)
    const providerFreight = toChargeNumber(courier?.provider_rate?.freight)
    const providerCod = toChargeNumber(courier?.provider_rate?.cod)
    const providerParts = providerFreight + providerCod

    return (
      providerTotal ||
      providerParts ||
      toChargeNumber(courier?.courier_cost_estimate ?? courier?.rateEstimate ?? 0)
    )
  }
  const getCourierCodCharge = (courier: (typeof availableCouriers)[number]) =>
    orderType === 'cod' ? toChargeNumber(courier?.localRates?.forward?.cod_charges) : 0
  const getB2BRateBreakdown = (courier: (typeof availableCouriers)[number]) => {
    const forward = courier?.localRates?.forward || {}
    const ratePerKg = toChargeNumber(forward?.ratePerKg)
    const freightBeforeMinimum = toChargeNumber(forward?.freightBeforeMinimum)
    const minimumCharge = toChargeNumber(forward?.minimumCharge)
    const baseFreight = toChargeNumber(forward?.baseFreight)

    return {
      ratePerKg,
      freightBeforeMinimum,
      minimumCharge,
      baseFreight,
      minimumChargeApplied: Boolean(forward?.minimumChargeApplied),
    }
  }
  const getSellerFreightCharge = (courier: (typeof availableCouriers)[number]) => {
    const directFreight = toChargeNumber(courier?.seller_freight_charge ?? courier?.final_freight_charge)
    if (directFreight > 0) return directFreight
    if (shipment_type === 'b2b') return getB2BAuthoritativeCharge(courier)
    return getCourierFreightCharge(courier) + getCourierProviderCost(courier)
  }
  const getFinalCourierCharge = (courier: (typeof availableCouriers)[number]) => {
    const directFinal = toChargeNumber(courier?.final_courier_charge)
    if (directFinal > 0) return directFinal
    if (shipment_type === 'b2b') return getB2BAuthoritativeCharge(courier)
    return (
      getSellerFreightCharge(courier) +
      toChargeNumber(courier?.localRates?.forward?.other_charges) +
      getCourierCodCharge(courier) +
      insuranceCharge
    )
  }

  const selectedCourierSummary = availableCouriers.find((courier) => {
    const courierOptionKey = String(
      courier?.courier_option_key ?? courier?.id ?? courier?.courier_id ?? '',
    )
    return selectedCourierOptionKey
      ? selectedCourierOptionKey === courierOptionKey
      : String(selectedCourierId) === String(courier?.id ?? courier?.courier_id ?? '')
  })
  const selectedFinalCourierCharge = selectedCourierSummary
    ? getFinalCourierCharge(selectedCourierSummary)
    : 0

  return (
    <Grid container spacing={showSummary ? 3 : 0}>
      {showSummary && (
      <Grid size={{ md: 4.5, xs: 12 }}>
        <Stack spacing={2.5} sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
          <Paper
            sx={{
              p: 0,
              overflow: 'hidden',
              borderRadius: 4,
              border: `1px solid ${alpha(ACCENT, 0.14)}`,
              boxShadow: '0 22px 44px rgba(13,59,142,0.08)',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2.25,
                color: '#fff',
                background:
                  'linear-gradient(135deg, #0D3B8E 0%, #1A5DD1 55%, #3D8BFF 100%)',
              }}
            >
              <Typography sx={{ fontSize: 12, letterSpacing: '0.08em', opacity: 0.88, color: '#fff' }}>
                SHIPMENT SNAPSHOT
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 800, color: '#fff' }}>
                {watch('orderId') || 'Pending Order ID'}
              </Typography>
              <Typography sx={{ mt: 0.75, opacity: 0.9, color: '#fff' }}>
                {shipment_type.toUpperCase()} • {orderType.toUpperCase()} •{' '}
                {shipment_type === 'b2b'
                  ? `${(totalActualWeight / 1000).toFixed(2)} kg`
                  : `${(Number(totalWeight) / 1000).toFixed(2)} kg`}
              </Typography>
            </Box>

            <Box sx={{ p: 2.5, bgcolor: '#fff' }}>
              <Grid container spacing={1.5}>
                {[
                  { label: 'Customer Total', value: formatCurrency(totalOrderValue) },
                  { label: 'Courier Options', value: String(availableCouriers.length) },
                  { label: 'Pickup', value: pickupPincode || '-' },
                  { label: 'Delivery', value: deliveryPincode || '-' },
                ].map((item) => (
                  <Grid key={item.label} size={{ xs: 6 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: SURFACE,
                        border: '1px solid rgba(13,59,142,0.08)',
                      }}
                    >
                      <Typography sx={{ fontSize: 11, color: TEXT_SECONDARY }}>{item.label}</Typography>
                      <Typography sx={{ mt: 0.5, fontWeight: 800, color: TEXT_PRIMARY }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.2}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: TEXT_SECONDARY }}>
                  Price Breakup
                </Typography>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: TEXT_SECONDARY }}>Products</Typography>
                  <Typography sx={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                    {formatCurrency(totalProductPrice)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: TEXT_SECONDARY }}>Shipping</Typography>
                  <Typography sx={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                    {formatCurrency(shippingCharges)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: TEXT_SECONDARY }}>Transaction Fee</Typography>
                  <Typography sx={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                    {formatCurrency(transactionFee)}
                  </Typography>
                </Stack>
                {giftWrap > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: TEXT_SECONDARY }}>Gift Wrap</Typography>
                    <Typography sx={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                      {formatCurrency(giftWrap)}
                    </Typography>
                  </Stack>
                )}
                {discount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: '#B42318' }}>Discount</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#B42318' }}>
                      -{formatCurrency(discount)}
                    </Typography>
                  </Stack>
                )}
                {prepaidAmount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ color: '#B42318' }}>Prepaid Amount</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#B42318' }}>
                      -{formatCurrency(prepaidAmount)}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {shouldShowWalletDebitPreview && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1.2}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: TEXT_SECONDARY }}>
                      Wallet Debit Preview
                    </Typography>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ color: TEXT_SECONDARY }}>Courier Charge</Typography>
                      <Typography sx={{ fontWeight: 900, color: TEXT_PRIMARY }}>
                        {formatCurrency(forwardCharges + otherCharges + (orderType === 'cod' ? courierCod : 0))}
                      </Typography>
                    </Stack>
                    {insuranceCharge > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: TEXT_SECONDARY }}>Insurance Charge</Typography>
                        <Typography sx={{ fontWeight: 800, color: TEXT_PRIMARY }}>
                          {formatCurrency(insuranceCharge)}
                        </Typography>
                      </Stack>
                    )}
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ color: TEXT_PRIMARY, fontWeight: 800 }}>Total Wallet Debit</Typography>
                      <Typography sx={{ fontWeight: 900, color: TEXT_PRIMARY }}>
                        {formatCurrency(walletDebitPreview)}
                      </Typography>
                    </Stack>
                  </Stack>
                </>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 2.25, borderRadius: 4, bgcolor: '#fff' }}>
            <Typography sx={{ fontWeight: 800, color: TEXT_PRIMARY }}>Delivery Summary</Typography>
            <Stack spacing={1.2} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <BiUser color={ACCENT} size={18} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                    {watch('buyerName') || 'Customer'}
                  </Typography>
                  <Typography sx={{ color: TEXT_SECONDARY, fontSize: 14 }}>
                    {watch('buyerPhone') || '-'}
                  </Typography>
                  <Typography sx={{ color: TEXT_SECONDARY, fontSize: 14 }}>
                    {watch('buyerEmail') || '-'}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <BiMap color={ACCENT} size={18} />
                <Typography sx={{ color: TEXT_SECONDARY, fontSize: 14 }}>
                  {deliveryAddressLine || '-'}, {deliveryCity || '-'}, {deliveryState || '-'} -{' '}
                  {deliveryPincode || '-'}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <BiPackage color={ACCENT} size={18} />
                <Typography sx={{ color: TEXT_SECONDARY, fontSize: 14 }}>
                  {shipment_type === 'b2b'
                    ? `${totalB2BBoxCount || 0} boxes`
                    : `${products?.length || 0} products`}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.25, borderRadius: 4, bgcolor: '#fff' }}>
            <Typography sx={{ fontWeight: 800, color: TEXT_PRIMARY }}>Pickup Summary</Typography>
            <Stack spacing={1.2} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <BiCalendar color={ACCENT} size={18} />
                <Box>
                  <Typography sx={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                    {pickupName || 'Pickup Location'}
                  </Typography>
                  <Typography sx={{ color: TEXT_SECONDARY, fontSize: 14 }}>
                    {pickupAddressLine || '-'}, {pickupCity || '-'}, {pickupState || '-'} -{' '}
                    {pickupPincode || '-'}
                  </Typography>
                </Box>
              </Stack>
              {selectedCourierSummary && (
                <>
                  <Divider />
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: alpha(ACCENT, 0.05),
                      border: `1px solid ${alpha(ACCENT, 0.12)}`,
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: TEXT_SECONDARY, letterSpacing: '0.08em' }}>
                      SELECTED COURIER
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontWeight: 800, color: TEXT_PRIMARY }}>
                      {getCourierDisplayName(selectedCourierSummary)}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                      <Chip
                        size="small"
                        label={`Courier Charge ${formatCurrency(selectedFinalCourierCharge)}`}
                      />
                      <Chip
                        size="small"
                        label={`Chargeable ${formatCourierWeightKg(selectedCourierSummary.chargeable_weight)}`}
                      />
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Grid>
      )}

      <Grid size={showSummary ? { md: 7.5, xs: 12 } : { xs: 12 }}>
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 4,
            border: `1px solid ${alpha(ACCENT, 0.1)}`,
            boxShadow: '0 18px 40px rgba(16,42,84,0.06)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={1}
            sx={{ mb: 2.5 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: TEXT_PRIMARY }}>
                Select Courier Partner
              </Typography>
              <Typography sx={{ mt: 0.5, color: TEXT_SECONDARY }}>
                {shipment_type === 'b2b'
                  ? 'Select an available B2B courier rate for this route.'
                  : 'Compare freight, speed and chargeable weight before locking the shipment.'}
              </Typography>
            </Box>
            <Chip
              label={`${availableCouriers.length} options`}
              sx={{
                bgcolor: alpha(ACCENT, 0.08),
                color: ACCENT,
                fontWeight: 700,
                borderRadius: '999px',
              }}
            />
          </Stack>

          <Stack spacing={2}>
            {availableCouriers?.map((courier) => {
              const local = courier?.localRates
              const courierOptionKey = String(
                courier?.courier_option_key ?? courier?.id ?? courier?.courier_id ?? '',
              )
              const isSelected = selectedCourierOptionKey
                ? selectedCourierOptionKey === courierOptionKey
                : String(selectedCourierId) === String(courier?.id ?? courier?.courier_id ?? '')

              const providerCost = getCourierProviderCost(courier)
              const freightCharge = getSellerFreightCharge(courier)
              const codCharge = getCourierCodCharge(courier)
              const otherCharge = toChargeNumber(local?.forward?.other_charges)
              const finalCourierCharge = getFinalCourierCharge(courier)
              const isBookable = courier?.is_bookable !== false
              const finalChargeLabel = isBookable ? formatCurrency(finalCourierCharge) : 'Unavailable'
              const b2bRateBreakdown =
                shipment_type === 'b2b' ? getB2BRateBreakdown(courier) : null

              return (
                <Paper
                  key={courierOptionKey}
                  onClick={() => {
                    if (!isBookable) {
                      toast.open({
                        message:
                          courier?.unavailable_reason ||
                          'Live courier quote is unavailable. Please retry serviceability.',
                        severity: 'warning',
                      })
                      return
                    }
                    setValue('courierPartner', courier?.name ?? '')
                    setValue('courierPartnerId', courier?.id ?? '')
                    setValue('courierOptionKey', courierOptionKey)
                    setValue('selectedMaxSlabWeight', courier?.max_slab_weight ?? null)
                    setValue('courierCod', codCharge)
                    setValue('forwardCharges', freightCharge)
                    setValue('otherCharges', otherCharge)
                    setValue(
                      'shippingMode',
                      courier?.shipping_mode ?? courier?.mode ?? local?.forward?.mode ?? '',
                    )
                    setValue(
                      'courierCost',
                      providerCost > 0 ? providerCost : null,
                    ) // Estimated courier cost from serviceability
                    setValue('integrationType', courier?.integration_type)
                    setValue('zone', courier?.approxZone?.code ?? courier?.approxZone?.name ?? '')
                    setValue('zoneId', courier?.approxZone?.id ?? '')
                    setValue('chargeableWeight', courier?.chargeable_weight ?? null)
                    setValue('volumetricWeight', courier?.volumetric_weight ?? null)
                    setValue('slabs', courier?.slabs ?? null)
                    clearErrors('courierPartnerId')
                  }}
                  sx={{
                    p: 2,
                    cursor: isBookable ? 'pointer' : 'not-allowed',
                    opacity: isBookable ? 1 : 0.72,
                    borderRadius: 4,
                    border: isSelected
                      ? `2px solid ${alpha(ACCENT, 0.42)}`
                      : `1px solid ${alpha(isBookable ? '#102A54' : '#8A1F11', isBookable ? 0.12 : 0.2)}`,
                    bgcolor: isSelected ? alpha(ACCENT, 0.045) : '#fff',
                    boxShadow: isSelected
                      ? '0 18px 36px rgba(13,59,142,0.14)'
                      : '0 8px 22px rgba(16,42,84,0.06)',
                    transition: '0.25s ease',
                    '&:hover': {
                      borderColor: alpha(isBookable ? ACCENT : '#8A1F11', isBookable ? 0.38 : 0.2),
                      boxShadow: isBookable
                        ? '0 18px 36px rgba(13,59,142,0.12)'
                        : '0 8px 22px rgba(16,42,84,0.06)',
                      transform: isBookable ? 'translateY(-1px)' : 'none',
                    },
                  }}
                >
                  <Stack spacing={1.75}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      spacing={1.5}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 3,
                            bgcolor: SURFACE,
                            border: `1px solid ${alpha(ACCENT, 0.08)}`,
                            display: 'grid',
                            placeItems: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={getCourierLogo(courier, defaultLogo)}
                            alt={courier?.name}
                            style={{ width: 34, height: 34, objectFit: 'contain' }}
                          />
                        </Box>
                        <Box>
                          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                            {getModeIcon(local?.forward?.mode || local?.mode)}
                            <Typography sx={{ fontWeight: 800, color: TEXT_PRIMARY }}>
                              {getCourierDisplayName(courier)}
                            </Typography>
                            {isBookable && courier?.tag === 'fastest' && (
                              <Chip
                                size="small"
                                label="Fastest"
                                sx={{ bgcolor: '#E8F1FF', color: ACCENT, fontWeight: 700 }}
                              />
                            )}
                            {isBookable && courier?.tag === 'economy' && (
                              <Chip
                                size="small"
                                label="Best Rate"
                                sx={{ bgcolor: '#ECFDF3', color: '#067647', fontWeight: 700 }}
                              />
                            )}
                          </Stack>
                          <Typography sx={{ mt: 0.35, fontSize: 13, color: TEXT_SECONDARY }}>
                            {courier?.edd ? `Estimated delivery: ${courier.edd}` : 'EDD unavailable'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.25}>
                        <Typography sx={{ fontSize: 12, color: TEXT_SECONDARY }}>
                          Courier Charge
                        </Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 900, color: TEXT_PRIMARY }}>
                          {finalChargeLabel}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Grid container spacing={1.1}>
                      {[
                        ['Courier Charge', finalChargeLabel],
                        ['Chargeable', formatCourierWeightKg(courier?.chargeable_weight)],
                        ['Volumetric', formatCourierWeightKg(courier?.volumetric_weight)],
                        ['Mode', local?.forward?.mode || courier?.shipping_mode || courier?.mode || '-'],
                      ].map(([label, value]) => (
                        <Grid key={label} size={{ xs: 6, lg: 3 }}>
                          <Box
                            sx={{
                              p: 1.25,
                              borderRadius: 3,
                              bgcolor: SURFACE,
                              border: '1px solid rgba(13,59,142,0.08)',
                            }}
                          >
                            <Typography sx={{ fontSize: 11, color: TEXT_SECONDARY }}>{label}</Typography>
                            <Typography sx={{ mt: 0.35, fontWeight: 800, color: TEXT_PRIMARY }}>
                              {value}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {b2bRateBreakdown && (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {b2bRateBreakdown.ratePerKg > 0 && (
                          <Chip
                            size="small"
                            label={`Rate/kg ${formatCurrency(b2bRateBreakdown.ratePerKg)}`}
                          />
                        )}
                        {b2bRateBreakdown.freightBeforeMinimum > 0 && (
                          <Chip
                            size="small"
                            label={`Base ${formatCurrency(b2bRateBreakdown.freightBeforeMinimum)}`}
                          />
                        )}
                        {b2bRateBreakdown.minimumChargeApplied && (
                          <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={`Minimum ${formatCurrency(b2bRateBreakdown.minimumCharge)}`}
                          />
                        )}
                      </Stack>
                    )}

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {courier?.prepaid === false && (
                        <Chip size="small" variant="outlined" color="error" label="Prepaid N/A" />
                      )}
                      {courier?.cod === false && (
                        <Chip size="small" variant="outlined" color="error" label="COD N/A" />
                      )}
                      {!isBookable && (
                        <Chip size="small" variant="outlined" color="warning" label="Live rate unavailable" />
                      )}
                    </Stack>

                    {isSelected && isBookable && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BiCheckCircle size={20} color={ACCENT} />
                        <Typography sx={{ fontWeight: 800, color: ACCENT }}>
                          Selected for booking
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  )
}
