import { Box, Chip, Divider, Grid, Paper, Stack, Typography, alpha } from '@mui/material'
import { useFormContext } from 'react-hook-form'
import { b2bBoxWeightInputToKg } from '../../utils/b2bWeight'

const ACCENT = '#0D3B8E'
const TEXT_PRIMARY = '#102A54'
const TEXT_SECONDARY = '#4C6185'
const SURFACE = '#F6F8FC'

type BookingReviewSummaryProps = {
  shipmentType: 'b2b' | 'b2c'
  subtotal: number
  totalOrderValue: number
  totalCollectable: number
}

type BoxLine = {
  quantity?: number
  weightKg?: number
}

const money = (value: number) => `Rs ${Number(value || 0).toFixed(2)}`

const joinParts = (...parts: Array<string | number | undefined | null>) =>
  parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ')

const StatBox = ({ label, value }: { label: string; value: string }) => (
  <Box
    sx={{
      minHeight: 64,
      p: 1.35,
      borderRadius: 2.5,
      bgcolor: SURFACE,
      border: `1px solid ${alpha(ACCENT, 0.1)}`,
    }}
  >
    <Typography sx={{ color: TEXT_SECONDARY, fontSize: 12 }}>{label}</Typography>
    <Typography
      sx={{
        mt: 0.35,
        color: TEXT_PRIMARY,
        fontSize: 18,
        fontWeight: 900,
        lineHeight: 1.15,
        wordBreak: 'break-word',
      }}
    >
      {value || '-'}
    </Typography>
  </Box>
)

const DetailBlock = ({ title, primary, secondary }: { title: string; primary: string; secondary: string }) => (
  <Box
    sx={{
      p: 1.35,
      borderRadius: 2.5,
      bgcolor: '#fff',
      border: `1px solid ${alpha(ACCENT, 0.1)}`,
      height: '100%',
    }}
  >
    <Typography sx={{ color: TEXT_SECONDARY, fontSize: 12, fontWeight: 800 }}>{title}</Typography>
    <Typography sx={{ mt: 0.45, color: TEXT_PRIMARY, fontWeight: 900, lineHeight: 1.25 }}>
      {primary || '-'}
    </Typography>
    <Typography sx={{ mt: 0.25, color: TEXT_SECONDARY, fontSize: 13, lineHeight: 1.35 }}>
      {secondary || '-'}
    </Typography>
  </Box>
)

const BookingReviewSummary = ({
  shipmentType,
  subtotal,
  totalOrderValue,
  totalCollectable,
}: BookingReviewSummaryProps) => {
  const { watch } = useFormContext()
  const getValue = (name: string) => watch(name)

  const orderId = String(getValue('orderId') || 'Pending Order ID')
  const orderType = String(getValue('orderType') || 'prepaid')
  const pickupPincode = String(getValue('pickupLocationPincode') || '')
  const deliveryPincode = String(getValue('pincode') || '')
  const pickupName = String(getValue('pickupLocationName') || 'Pickup Location')
  const pickupAddress = joinParts(
    getValue('pickupAddress'),
    getValue('pickupCity'),
    getValue('pickupState'),
    pickupPincode,
  )
  const deliveryName = String(getValue('companyName') || getValue('buyerName') || 'Customer')
  const deliveryAddress = joinParts(
    getValue('address'),
    getValue('city'),
    getValue('state'),
    deliveryPincode,
  )
  const shippingCharges = Number(getValue('shippingCharges') || 0)
  const transactionFee = Number(getValue('transactionFee') || 0)
  const giftWrap = Number(getValue('giftWrap') || 0)
  const discount = Number(getValue('discount') || 0)
  const prepaidAmount = Number(getValue('prepaidAmount') || 0)
  const boxes = (getValue('boxes') || []) as BoxLine[]
  const products = (getValue('products') || []) as unknown[]
  const enteredWeight = Number(getValue('weight') || 0)
  const boxWeight = boxes.reduce(
    (sum, box) =>
      sum + b2bBoxWeightInputToKg(box.weightKg) * Math.max(1, Math.floor(Number(box.quantity || 1))),
    0,
  )
  const displayWeight =
    shipmentType === 'b2b'
      ? `${Number(enteredWeight || boxWeight || 0).toFixed(2)} kg`
      : `${Number(enteredWeight || 0).toFixed(2)} kg`

  const priceRows = [
    ['Products', subtotal],
    ['Shipping', shippingCharges],
    ['Transaction Fee', transactionFee],
    ...(giftWrap > 0 ? ([['Gift Wrap', giftWrap]] as Array<[string, number]>) : []),
    ...(discount > 0 ? ([['Discount', -discount]] as Array<[string, number]>) : []),
    ...(prepaidAmount > 0 ? ([['Prepaid', -prepaidAmount]] as Array<[string, number]>) : []),
  ]

  return (
    <Paper
      sx={{
        overflow: 'hidden',
        borderRadius: 3,
        border: `1px solid ${alpha(ACCENT, 0.14)}`,
        boxShadow: `0 12px 26px ${alpha(ACCENT, 0.08)}`,
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, md: 2 },
          py: 1.4,
          color: '#fff',
          background: 'linear-gradient(135deg, #0D3B8E 0%, #1A5DD1 100%)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          gap={1}
        >
          <Box>
            <Typography sx={{ color: '#fff', fontSize: 11, letterSpacing: '0.08em' }}>
              SHIPMENT SNAPSHOT
            </Typography>
            <Typography sx={{ color: '#fff', fontSize: { xs: 20, md: 24 }, fontWeight: 900 }}>
              {orderId}
            </Typography>
          </Box>
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            <Chip size="small" label={shipmentType.toUpperCase()} sx={{ bgcolor: '#fff', color: ACCENT, fontWeight: 800 }} />
            <Chip size="small" label={orderType.toUpperCase()} sx={{ bgcolor: '#fff', color: ACCENT, fontWeight: 800 }} />
            <Chip size="small" label={displayWeight} sx={{ bgcolor: '#fff', color: ACCENT, fontWeight: 800 }} />
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: '#fff' }}>
        <Grid container spacing={1.2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatBox label="Customer Total" value={money(totalOrderValue)} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatBox label="Collectable" value={money(totalCollectable)} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatBox label="Pickup" value={pickupPincode || '-'} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatBox label="Delivery" value={deliveryPincode || '-'} />
          </Grid>
        </Grid>

        <Grid container spacing={1.2} sx={{ mt: 1.2 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <DetailBlock title="Pickup Summary" primary={pickupName} secondary={pickupAddress} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <DetailBlock
              title="Delivery Summary"
              primary={deliveryName}
              secondary={deliveryAddress}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                p: 1.35,
                borderRadius: 2.5,
                bgcolor: SURFACE,
                border: `1px solid ${alpha(ACCENT, 0.1)}`,
                height: '100%',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography sx={{ color: TEXT_PRIMARY, fontWeight: 900 }}>Price Breakup</Typography>
                <Chip
                  size="small"
                  label={shipmentType === 'b2b' ? `${boxes.length} boxes` : `${products.length} products`}
                  sx={{ bgcolor: alpha(ACCENT, 0.08), color: ACCENT, fontWeight: 800 }}
                />
              </Stack>
              <Divider sx={{ my: 0.8 }} />
              <Stack spacing={0.55}>
                {priceRows.map(([label, value]) => (
                  <Stack key={label} direction="row" justifyContent="space-between" gap={1}>
                    <Typography sx={{ color: TEXT_SECONDARY, fontSize: 13 }}>{label}</Typography>
                    <Typography
                      sx={{
                        color: Number(value) < 0 ? '#B42318' : TEXT_PRIMARY,
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {Number(value) < 0 ? `-${money(Math.abs(Number(value)))}` : money(Number(value))}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  )
}

export default BookingReviewSummary
