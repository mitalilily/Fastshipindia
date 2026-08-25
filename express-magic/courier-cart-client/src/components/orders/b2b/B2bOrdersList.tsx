import { Alert, Box, Button, Chip, Link, Stack, Tooltip, Typography, alpha } from '@mui/material'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import moment from 'moment'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { MdInfoOutline } from 'react-icons/md'
import { useB2BOrdersByUser, useGenerateManifest } from '../../../hooks/Orders/useOrders'
import { useFastLoading } from '../../../hooks/useFastLoading'
import type { B2BOrder } from '../../../types/generic.types'
import { getCourierDisplayName } from '../../../utils/courierDisplay'
import StatusChip from '../../UI/chip/StatusChip'
import DataTable, { type Column } from '../../UI/table/DataTable'
import TableSkeleton from '../../UI/table/TableSkeleton'
import ManifestScheduleDialog, {
  type ManifestSchedulePayload,
} from '../ManifestScheduleDialog'
import { OrderExpandedRow } from '../OrderExpandedRow'

export const statusColorMap: Record<string, 'success' | 'pending' | 'error' | 'info'> = {
  pending: 'pending',
  booked: 'pending',
  shipment_booked: 'pending',
  shipment_created: 'pending',
  pickup_initiated: 'pending',
  manifest_generated: 'pending',
  in_transit: 'pending',
  out_for_delivery: 'pending',
  rto_in_transit: 'pending',
  delivered: 'success',
  rto_delivered: 'success',
  processing: 'pending',
  cancelled: 'error',
  canceled: 'error',
  cancellation_requested: 'error',
  manifest_failed: 'error',
  failed: 'error',
  ndr: 'error',
  undelivered: 'error',
  rto_initiated: 'error',
  rto: 'error',
  lost: 'error',
}

const shippingStatusMap: Record<string, string> = {
  pending: 'Pending',
  booked: 'Booked',
  shipment_booked: 'Shipment Booked',
  shipment_created: 'Shipment Created',
  pickup_initiated: 'Scheduled for Pickup',
  manifest_generated: 'Manifest Generated',
  in_transit: 'In Transit',
  out_for_delivery: 'Out For Delivery',
  delivered: 'Delivered',
  undelivered: 'Undelivered',
  ndr: 'NDR',
  rto_initiated: 'RTO Initiated',
  rto: 'RTO Initiated',
  rto_in_transit: 'RTO In Transit',
  rto_delivered: 'RTO Delivered',
  cancellation_requested: 'Cancellation Requested',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  manifest_failed: 'Manifest Failed',
  failed: 'Failed',
  lost: 'Lost',
  processing: 'Processing',
}

interface B2BOrdersListProps {
  page: number
  rowsPerPage: number
  setPage: (page: number) => void
  setRowsPerPage: (rows: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: any
}

const B2BOrdersList = ({
  page,
  rowsPerPage,
  setPage,
  setRowsPerPage,
  filters,
}: B2BOrdersListProps) => {
  const location = useLocation()
  const { data, isLoading, isError } = useB2BOrdersByUser(page, rowsPerPage, filters)
  const showTableLoading = useFastLoading(isLoading)
  const { mutate: triggerManifest, isPending: isGeneratingManifest } = useGenerateManifest()
  const [manifestingAwb, setManifestingAwb] = useState<string | null>(null)
  const [manifestScheduleOrder, setManifestScheduleOrder] = useState<B2BOrder | null>(null)

  useEffect(() => {
    setManifestScheduleOrder(null)
    setManifestingAwb(null)
  }, [location.pathname, location.search, location.hash])

  const handleGenerateManifest = (order: B2BOrder, schedule: ManifestSchedulePayload) => {
    if (!order.awb_number) return
    setManifestingAwb(order.awb_number)
    triggerManifest(
      { awbs: [order.awb_number], type: 'b2b', ...schedule },
      {
        onSettled: () => {
          setManifestingAwb((current) => (current === order.awb_number ? null : current))
        },
      },
    )
  }

  const handleManifestScheduleConfirm = async (schedule: ManifestSchedulePayload) => {
    if (!manifestScheduleOrder) return
    handleGenerateManifest(manifestScheduleOrder, schedule)
    setManifestScheduleOrder(null)
  }

  const hasLabelGenerated = (row: B2BOrder) =>
    Boolean(String(row.label_url || row.label_key || row.label || '').trim())

  const hasInvoiceGenerated = (row: B2BOrder) =>
    Boolean(String(row.invoice_url || row.invoice_key || row.invoice_link || '').trim())

  const getB2BTrackingReference = (row: B2BOrder) =>
    String(
      (row as B2BOrder & { provider_reference?: string | null }).provider_reference ||
        row.shipment_id ||
        row.awb_number ||
        '',
    ).trim()

  const renderTrackingLink = (value?: string | null) => {
    const reference = String(value || '').trim()
    if (!reference) return '-'

    return (
      <Link
        component={RouterLink}
        to={`/tools/order_tracking?awb=${encodeURIComponent(reference)}`}
        underline="hover"
        onClick={(event) => event.stopPropagation()}
        sx={{ fontWeight: 800 }}
      >
        {reference}
      </Link>
    )
  }

  const formatCurrency = (value?: number | string | null, decimals = 2) =>
    `Rs ${Number(value ?? 0).toFixed(decimals)}`

  const normalizeKgValue = (value?: number | string | null) => {
    const numericValue = Number(value ?? 0)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return 0
    return numericValue > 50 ? numericValue / 1000 : numericValue
  }

  const formatKg = (value?: number | string | null) => `${normalizeKgValue(value).toFixed(1)} Kg`

  const formatOrderDateTime = (value?: string | null) => {
    if (!value) return '-'
    const date = moment(value)
    return date.isValid() ? date.format('DD MMM YYYY | hh:mm A') : '-'
  }

  const normalizeOrderStatus = (status: unknown) =>
    String(status || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')

  const getDisplayStatusLabel = (status?: string | null) => {
    const normalizedStatus = normalizeOrderStatus(status)
    return shippingStatusMap[normalizedStatus] || status || 'Unknown'
  }

  const parseMaybeJsonObject = (value: unknown): Record<string, unknown> => {
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

  const parseMaybeJsonArray = (value: unknown): Array<Record<string, unknown>> => {
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

  const getOrderProducts = (row: B2BOrder) => parseMaybeJsonArray(row.products)

  const getProductName = (row: B2BOrder) => {
    const products = getOrderProducts(row)
    const firstProduct = products[0]
    const rawName = String(firstProduct?.productName ?? firstProduct?.name ?? firstProduct?.box_name ?? '').trim()
    if (!rawName) return '-'
    return products.length > 1 ? `${rawName} +${products.length - 1}` : rawName
  }

  const getPickupDetails = (row: B2BOrder) =>
    parseMaybeJsonObject((row as B2BOrder & { pickup_details?: unknown }).pickup_details)

  const getSenderName = (row: B2BOrder) => {
    const pickup = getPickupDetails(row)
    return String(
      pickup.warehouse_name ||
        pickup.name ||
        pickup.company_name ||
        (row as B2BOrder & { merchantName?: string; seller_name?: string }).merchantName ||
        row.pickup_location_id ||
        '-',
    ).trim() || '-'
  }

  const getSenderPhone = (row: B2BOrder) => {
    const pickup = getPickupDetails(row)
    return String(
      pickup.phone ||
        pickup.mobile ||
        pickup.contact_number ||
        (row as B2BOrder & { merchantPhone?: string; seller_phone?: string }).merchantPhone ||
        '',
    ).trim()
  }

  const joinAddressParts = (...parts: unknown[]) =>
    parts
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(', ')

  const getSenderAddress = (row: B2BOrder) => {
    const pickup = getPickupDetails(row)
    return joinAddressParts(
      pickup.address,
      pickup.addressLine1,
      pickup.address_line_1,
      pickup.addressLine2,
      pickup.address_line_2,
      pickup.city,
      pickup.state,
      pickup.country,
      pickup.pincode,
    )
  }

  const getReceiverAddress = (row: B2BOrder) =>
    joinAddressParts(row.address, row.city, row.state, row.country, row.pincode)

  const renderPartyDetails = ({
    name,
    phone,
    address,
  }: {
    name?: string
    phone?: string
    address?: string
  }) => {
    const displayName = String(name || '-').trim() || '-'
    const displayPhone = String(phone || '-').trim() || '-'
    const displayAddress = String(address || '-').trim() || '-'

    return (
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.45} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              maxWidth: '100%',
              minWidth: 0,
              fontSize: 12.1,
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.28,
            }}
            noWrap
          >
            {displayName}
          </Typography>
          <Tooltip
            arrow
            placement="top"
            title={
              <Box sx={{ p: 0.8, maxWidth: 360 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 13.5, mb: 0.5 }}>
                  {displayName}
                </Typography>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <Box component="span" sx={{ fontWeight: 800 }}>
                    Mobile Number:
                  </Box>{' '}
                  {displayPhone}
                </Typography>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.45 }}>
                  <Box component="span" sx={{ fontWeight: 800 }}>
                    Address:
                  </Box>{' '}
                  {displayAddress}
                </Typography>
              </Box>
            }
          >
            <Box
              component="span"
              onClick={(event) => event.stopPropagation()}
              sx={{
                width: 17,
                height: 17,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                cursor: 'help',
                flexShrink: 0,
                '& svg': { fontSize: 15 },
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: alpha('#0D3B8E', 0.08),
                },
              }}
            >
              <MdInfoOutline />
            </Box>
          </Tooltip>
        </Stack>
        <Typography sx={{ maxWidth: '100%', fontSize: 10.8, color: 'text.secondary', lineHeight: 1.28 }} noWrap>
          {displayPhone}
        </Typography>
      </Stack>
    )
  }

  const getInvoiceDetails = (row: B2BOrder) => {
    const extendedRow = row as B2BOrder & { invoices?: unknown; invoice_details?: unknown; invoice_number?: string; invoice_no?: string }
    const rawInvoices: unknown = extendedRow.invoices || extendedRow.invoice_details
    const firstInvoice = parseMaybeJsonArray(rawInvoices)[0] || parseMaybeJsonObject(rawInvoices)
    const invoiceNumber = String(
      firstInvoice.invoiceNumber ||
        firstInvoice.invoice_number ||
        firstInvoice.invoiceNo ||
        extendedRow.invoice_number ||
        extendedRow.invoice_no ||
        '-',
    ).trim() || '-'
    const amount = (firstInvoice.invoiceValue ??
      firstInvoice.invoice_amount ??
      firstInvoice.amount ??
      row.order_amount) as number | string | null | undefined
    return { invoiceNumber, amount }
  }

  const getPickedUpAt = (row: B2BOrder) => {
    const extendedRow = row as B2BOrder & {
      picked_up_at?: string
      pickup_date?: string
      pickup_time?: string
      provider_picked_up_at?: string
    }
    const pickup = getPickupDetails(row)
    return extendedRow.picked_up_at || extendedRow.pickup_date || extendedRow.pickup_time || extendedRow.provider_picked_up_at || pickup.picked_up_at
  }

  const getChargedWeight = (row: B2BOrder) => {
    const extendedRow = row as B2BOrder & {
      charged_weight?: number | string
      selected_max_slab_weight?: number | string
      chargeable_weight?: number | string
      volumetric_weight?: number | string
      weight?: number | string
    }
    return extendedRow.charged_weight ??
      extendedRow.selected_max_slab_weight ??
      extendedRow.chargeable_weight ??
      extendedRow.volumetric_weight ??
      extendedRow.weight
  }

  const columns: Column<B2BOrder>[] = [
    {
      label: 'LRN / AWB',
      id: 'shipment_id',
      minWidth: 230,
      truncate: false,
      render: (_v, row) => (
        <Stack spacing={0.3} sx={{ minWidth: 0, maxWidth: 218, pr: 1 }}>
          <Typography sx={{ maxWidth: '100%', fontSize: 12.2, fontWeight: 700, lineHeight: 1.25 }} noWrap>
            {renderTrackingLink(getB2BTrackingReference(row))}
          </Typography>
          <Typography sx={{ maxWidth: '100%', fontSize: 10.7, color: 'text.secondary', lineHeight: 1.25 }} noWrap>
            Created: {formatOrderDateTime(row.created_at || row.order_date)}
          </Typography>
          <Typography sx={{ maxWidth: '100%', fontSize: 10.7, color: 'text.primary', lineHeight: 1.25 }} noWrap>
            Picked Up: {formatOrderDateTime(getPickedUpAt(row) as string | null)}
          </Typography>
        </Stack>
      ),
    },
    {
      label: 'Order Type',
      id: 'order_number',
      minWidth: 144,
      truncate: false,
      render: () => (
        <Chip
          label="Domestic - B2B"
          size="small"
          sx={{
            height: 24,
            borderRadius: '7px',
            color: '#7C2D8E',
            bgcolor: alpha('#D946EF', 0.14),
            border: `1px solid ${alpha('#A21CAF', 0.2)}`,
            '& .MuiChip-label': { px: 0.8, fontSize: 10.5, fontWeight: 700 },
          }}
        />
      ),
    },
    {
      label: 'Product Details',
      id: 'products',
      minWidth: 132,
      truncate: false,
      render: (_v, row) => {
        const isCod = String(row.order_type || '').toLowerCase() === 'cod'
        return (
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.1, fontWeight: 500, color: 'text.primary', maxWidth: '100%' }} noWrap>
              {getProductName(row)}
            </Typography>
            <Chip
              label={isCod ? 'COD' : 'Prepaid'}
              size="small"
              sx={{
                width: 'fit-content',
                height: 21,
                mt: 0.2,
                borderRadius: '6px',
                color: isCod ? '#B45309' : '#047857',
                bgcolor: isCod ? alpha('#F59E0B', 0.12) : alpha('#10B981', 0.13),
                border: `1px solid ${isCod ? alpha('#B45309', 0.18) : alpha('#047857', 0.18)}`,
                '& .MuiChip-label': { px: 0.65, fontSize: 10, fontWeight: 700 },
              }}
            />
          </Stack>
        )
      },
    },
    {
      label: 'Invoice Details',
      id: 'order_amount',
      minWidth: 156,
      truncate: false,
      render: (_value, row) => {
        const invoice = getInvoiceDetails(row)
        return (
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.1, color: 'text.primary', fontWeight: 700 }} noWrap>
              {formatCurrency(invoice.amount, 2)}
            </Typography>
            <Typography sx={{ maxWidth: '100%', fontSize: 10.8, color: 'text.secondary', lineHeight: 1.3 }} noWrap>
              Invoice No: {invoice.invoiceNumber}
            </Typography>
          </Stack>
        )
      },
    },
    {
      label: 'Sender Details',
      id: 'pickup_location_id',
      minWidth: 150,
      truncate: false,
      render: (_value, row) => (
        renderPartyDetails({
          name: getSenderName(row),
          phone: getSenderPhone(row),
          address: getSenderAddress(row),
        })
      ),
    },
    {
      label: 'Receiver Details',
      id: 'buyer_name',
      minWidth: 150,
      truncate: false,
      render: (_value, row) => (
        renderPartyDetails({
          name: row.buyer_name,
          phone: row.buyer_phone,
          address: getReceiverAddress(row),
        })
      ),
    },
    {
      label: 'Charged Weight',
      id: 'packages',
      minWidth: 110,
      truncate: false,
      render: (_value, row) => (
        <Typography sx={{ fontSize: 12.1, color: 'text.primary', fontWeight: 700 }} noWrap>
          {formatKg(getChargedWeight(row))}
        </Typography>
      ),
    },
    {
      label: 'Updated At',
      id: 'updated_at',
      minWidth: 118,
      truncate: false,
      render: (value) => (
        <Typography sx={{ maxWidth: '100%', fontSize: 11.2, color: 'text.secondary', lineHeight: 1.3 }} noWrap>
          {formatOrderDateTime(value)}
        </Typography>
      ),
    },
    {
      label: 'Courier',
      id: 'courier_partner',
      minWidth: 140,
      render: (value, row) =>
        getCourierDisplayName({
          displayName:
            String((row as B2BOrder & { integration_type?: string }).integration_type || '')
              .trim()
              .toLowerCase() === 'shipmozo'
              ? 'Shipmozo B2B'
              : String((row as B2BOrder & { integration_type?: string }).integration_type || '')
                    .trim()
                    .toLowerCase() === 'bigship'
                ? 'Bigship B2B'
                : undefined,
          name: value,
          courier_id: row.courier_id,
          integration_type: (row as B2BOrder & { integration_type?: string }).integration_type,
        }),
    },
    {
      label: 'Status',
      id: 'order_status',
      minWidth: 150,
      render: (v) => {
        const normalizedStatus = normalizeOrderStatus(v)
        return (
          <StatusChip
            label={getDisplayStatusLabel(v)}
            status={statusColorMap[normalizedStatus] || 'info'}
          />
        )
      },
    },
    {
      label: 'Docs',
      id: 'id',
      minWidth: 178,
      truncate: false,
      render: (_v, row) => (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <StatusChip
            label={hasLabelGenerated(row) ? 'Label Ready' : 'Label Pending'}
            status={hasLabelGenerated(row) ? 'success' : 'pending'}
          />
          <StatusChip
            label={hasInvoiceGenerated(row) ? 'Invoice Ready' : 'Invoice Pending'}
            status={hasInvoiceGenerated(row) ? 'success' : 'pending'}
          />
        </Stack>
      ),
    },
    {
      label: 'Actions',
      id: 'awb_number',
      minWidth: 140,
      render: (_, row) => {
        const courierText = (row.courier_partner || '').toLowerCase()
        const integrationText = String((row as B2BOrder & { integration_type?: string }).integration_type || '').toLowerCase()
        const isXpressbees =
          integrationText === 'xpressbees' || courierText.includes('xpressbees')
        const isEkart = integrationText === 'ekart' || courierText.includes('ekart')

        const canManifest = !!row.awb_number && !row.manifest && (isXpressbees || isEkart)

        const actions: ReactNode[] = []

        if (canManifest) {
          const isThisManifesting = isGeneratingManifest && manifestingAwb === row.awb_number
          actions.push(
            <Button
              key="manifest"
              size="small"
              variant="contained"
              disabled={isThisManifesting}
              onClick={(e) => {
                e.stopPropagation()
                setManifestScheduleOrder(row)
              }}
            >
              {isThisManifesting ? 'Manifesting…' : 'Manifest'}
            </Button>,
          )
        }

        if (row.manifest) {
          actions.push(
            <Link
              key="view-manifest"
              href={row.manifest}
              target="_blank"
              rel="noopener"
              underline="hover"
              onClick={(e) => e.stopPropagation()}
            >
              View
            </Link>,
          )
        }

        if (!actions.length) return null

        return <Stack direction="row" spacing={1}>{actions}</Stack>
      },
    },
  ]

  return (
    <Stack spacing={2}>
      {isError && (
        <Alert severity="warning">
          Live B2B orders are temporarily unavailable. The table remains open and will update on refresh.
        </Alert>
      )}
      {showTableLoading ? (
        <TableSkeleton />
      ) : (
        <DataTable<B2BOrder>
          rows={data?.orders || []}
          columns={columns}
          title="My B2B Orders"
          pagination
          currentPage={page}
          density="compact"
          tableVariant="shipment"
          maxHeight={640}
          expandable
          renderExpandedRow={(row) => <OrderExpandedRow type="b2b" row={row} />}
          defaultRowsPerPage={rowsPerPage}
          totalCount={data?.totalCount || 0}
          onPageChange={setPage}
          onRowsPerPageChange={(newLimit) => {
            setRowsPerPage(newLimit)
            setPage(1)
          }}
        />
      )}
      <ManifestScheduleDialog
        open={Boolean(manifestScheduleOrder)}
        loading={isGeneratingManifest}
        description="Choose the pickup date and time before sending this manifest to the courier."
        onClose={() => {
          if (!isGeneratingManifest) setManifestScheduleOrder(null)
        }}
        onConfirm={handleManifestScheduleConfirm}
      />
    </Stack>
  )
}

export default B2BOrdersList
