import { Badge, Button, Flex, Icon, Stack, Text, Tooltip } from '@chakra-ui/react'
import { FiCopy, FiXCircle } from 'react-icons/fi'
import { GenericTable } from 'views/Dashboard/Tables/components/GenericTable'

const statusColors = {
  pending: 'orange',
  booked: 'cyan',
  shipment_created: 'blue',
  pickup_initiated: 'blue',
  in_transit: 'purple',
  out_for_delivery: 'cyan',
  delivered: 'green',
  cancelled: 'gray',
  cancellation_requested: 'yellow',
  rto: 'orange',
  rto_in_transit: 'purple',
  rto_delivered: 'red',
}

const formatStatus = (value) => {
  if (!value) return 'N/A'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const formatCurrency = (value, decimals = 2) => `Rs ${Number(value || 0).toFixed(decimals)}`

const normalizeKgValue = (value) => {
  const numericValue = Number(value || 0)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0
  return numericValue > 50 ? numericValue / 1000 : numericValue
}

const formatKg = (value) => `${normalizeKgValue(value).toFixed(1)} Kg`

const parseMaybeJsonObject = (value) => {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

const parseMaybeJsonArray = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const getTrackingReference = (order) => {
  const isB2B = String(order?.type || order?.source_type || order?.shipping_mode || '').toLowerCase() === 'b2b'
  const references = isB2B
    ? [order?.provider_reference, order?.shipment_id, order?.awb_number, order?.provider_request_id]
    : [order?.awb_number, order?.shipment_id, order?.provider_reference, order?.provider_request_id]

  return references.map((value) => String(value || '').trim()).find(Boolean) || ''
}

const getOrderProducts = (row) => parseMaybeJsonArray(row?.products)

const getProductName = (row) => {
  const products = getOrderProducts(row)
  const firstProduct = products[0] || {}
  const rawName = String(firstProduct.productName || firstProduct.name || firstProduct.box_name || '').trim()
  if (!rawName) return '-'
  return products.length > 1 ? `${rawName} +${products.length - 1}` : rawName
}

const getPickupDetails = (row) => parseMaybeJsonObject(row?.pickup_details)

const getSenderName = (row) => {
  const pickup = getPickupDetails(row)
  return String(
    pickup.warehouse_name ||
      pickup.name ||
      pickup.company_name ||
      row?.seller_name ||
      row?.merchantName ||
      row?.merchant_name ||
      row?.pickup_location_name ||
      row?.pickup_location_id ||
      '-',
  ).trim() || '-'
}

const getSenderPhone = (row) => {
  const pickup = getPickupDetails(row)
  return String(pickup.phone || pickup.mobile || pickup.contact_number || row?.seller_phone || row?.merchantPhone || '').trim()
}

const getReceiverName = (row) => String(row?.buyer_name || row?.company_name || row?.receiver_name || '-').trim() || '-'

const getReceiverPhone = (row) => String(row?.buyer_phone || row?.receiver_phone || '').trim()

const getInvoiceDetails = (row) => {
  const rawInvoices = row?.invoices || row?.invoice_details
  const firstInvoice = parseMaybeJsonArray(rawInvoices)[0] || parseMaybeJsonObject(rawInvoices)
  const invoiceNumber = String(
    firstInvoice.invoiceNumber ||
      firstInvoice.invoice_number ||
      firstInvoice.invoiceNo ||
      row?.invoice_number ||
      row?.invoice_no ||
      '-',
  ).trim() || '-'
  const amount = firstInvoice.invoiceValue || firstInvoice.invoice_amount || firstInvoice.amount || row?.order_amount
  return { invoiceNumber, amount }
}

const getOrderTypeLabel = (row) =>
  `Domestic - ${String(row?.type || row?.source_type || row?.shipping_mode || 'B2C').toUpperCase()}`

const getPickedUpAt = (row) => {
  const pickup = getPickupDetails(row)
  return row?.picked_up_at || row?.pickup_date || row?.pickup_time || row?.provider_picked_up_at || pickup.picked_up_at
}

const getChargedWeight = (row) =>
  row?.charged_weight ?? row?.selected_max_slab_weight ?? row?.chargeable_weight ?? row?.volumetric_weight ?? row?.weight

const terminalStatuses = new Set(['cancelled', 'canceled', 'delivered', 'rto_delivered'])

const canCancelOrder = (order) => {
  const status = String(order?.order_status || '').trim().toLowerCase()
  if (!order?.id || terminalStatuses.has(status)) return false
  return Boolean(order?.awb_number || order?.shipment_id || order?.provider_reference || order?.provider_request_id)
}

const OrdersTable = ({
  orders,
  totalCount,
  page,
  setPage,
  perPage,
  setPerPage,
  loading = false,
  onRowClick,
  onCancelOrder,
  cancellingOrderId,
}) => {
  const captions = [
    'LRN / AWB',
    'Order Type',
    'Product Details',
    'Invoice Details',
    'Sender Details',
    'Receiver Details',
    'Charged Weight',
    'Updated At',
    'Status',
    'Action',
  ]
  const columnKeys = [
    'tracking_summary',
    'order_type_summary',
    'product_summary',
    'invoice_summary',
    'sender_summary',
    'receiver_summary',
    'charged_weight_summary',
    'updated_summary',
    'status_summary',
    'actions',
  ]

  const renderers = {
    tracking_summary: (_value, row) => (
      <Stack spacing={1} minW="0">
        <Flex align="center" gap={2}>
          <Text fontWeight="800" fontSize="sm" color="#0D3B8E" noOfLines={1}>
            {getTrackingReference(row) || row.order_number || row.order_id || row.id || 'N/A'}
          </Text>
          {getTrackingReference(row) ? (
            <Icon
              as={FiCopy}
              cursor="pointer"
              color="gray.500"
              _hover={{ color: '#0D3B8E' }}
              onClick={(event) => {
                event.stopPropagation()
                navigator.clipboard.writeText(getTrackingReference(row))
              }}
            />
          ) : null}
        </Flex>
        <Text color="gray.500" fontSize="xs" noOfLines={1}>
          Created: {formatDateTime(row.created_at || row.order_date)}
        </Text>
        <Text color="gray.600" fontSize="xs" noOfLines={1}>
          Picked Up: {formatDateTime(getPickedUpAt(row))}
        </Text>
      </Stack>
    ),
    order_type_summary: (_value, row) => (
      <Badge
        bg="rgba(217, 70, 239, 0.14)"
        color="#7C2D8E"
        px={2.5}
        py={1}
        borderRadius="7px"
        textTransform="none"
        fontSize="xs"
        fontWeight="800"
      >
        {getOrderTypeLabel(row)}
      </Badge>
    ),
    product_summary: (_value, row) => {
      const isCod = String(row.order_type || '').toLowerCase() === 'cod'
      return (
        <Stack spacing={1} align="flex-start" minW="0">
          <Text fontWeight="700" fontSize="sm" noOfLines={1}>
            {getProductName(row)}
          </Text>
          <Badge
            bg={isCod ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.14)'}
            color={isCod ? '#B45309' : '#047857'}
            borderRadius="6px"
            px={2}
            py={0.5}
            textTransform="none"
            fontSize="xs"
          >
            {isCod ? 'COD' : 'Prepaid'}
          </Badge>
        </Stack>
      )
    },
    invoice_summary: (_value, row) => {
      const invoice = getInvoiceDetails(row)
      return (
        <Stack spacing={1} minW="0">
          <Text fontWeight="800" fontSize="sm" noOfLines={1}>
            {formatCurrency(invoice.amount, 2)}
          </Text>
          <Text color="gray.500" fontSize="xs" noOfLines={1}>
            Invoice No: {invoice.invoiceNumber}
          </Text>
        </Stack>
      )
    },
    sender_summary: (_value, row) => (
      <Stack spacing={1} minW="0">
        <Text fontWeight="700" fontSize="sm" noOfLines={1}>
          {getSenderName(row)}
        </Text>
        <Text color="gray.500" fontSize="xs" noOfLines={1}>
          {getSenderPhone(row) || '-'}
        </Text>
      </Stack>
    ),
    receiver_summary: (_value, row) => (
      <Stack spacing={1} minW="0">
        <Text fontWeight="700" fontSize="sm" noOfLines={1}>
          {getReceiverName(row)}
        </Text>
        <Text color="gray.500" fontSize="xs" noOfLines={1}>
          {getReceiverPhone(row) || '-'}
        </Text>
      </Stack>
    ),
    charged_weight_summary: (_value, row) => (
      <Text fontWeight="800" fontSize="sm" whiteSpace="nowrap">
        {formatKg(getChargedWeight(row))}
      </Text>
    ),
    updated_summary: (_value, row) => (
      <Text color="gray.500" fontSize="sm" whiteSpace="nowrap">
        {formatDateTime(row.updated_at || row.order_date)}
      </Text>
    ),
    status_summary: (_value, row) => {
      const value = row.order_status
      return (
        <Badge
          colorScheme={statusColors[value] || 'gray'}
          fontSize="xs"
          px={2.5}
          py={1}
          borderRadius="8px"
          textTransform="none"
        >
          {formatStatus(value)}
        </Badge>
      )
    },
    actions: (_value, row) => {
      const allowed = canCancelOrder(row)
      return (
        <Tooltip
          label={
            allowed
              ? 'Cancel real courier shipment and refund wallet if charged'
              : 'Cancellation is unavailable for this order status'
          }
          hasArrow
        >
          <Button
            size="sm"
            leftIcon={<FiXCircle />}
            colorScheme="red"
            variant={allowed ? 'solid' : 'outline'}
            isDisabled={!allowed || !onCancelOrder}
            isLoading={cancellingOrderId === row.id}
            onClick={(event) => {
              event.stopPropagation()
              onCancelOrder?.(row)
            }}
          >
            Cancel
          </Button>
        </Tooltip>
      )
    },
  }

  return (
    <GenericTable
      title={null}
      data={orders || []}
      captions={captions}
      columnKeys={columnKeys}
      renderers={renderers}
      loading={loading}
      paginated
      page={page}
      setPage={setPage}
      totalCount={totalCount}
      perPage={perPage}
      setPerPage={setPerPage}
      perPageOptions={[10, 20, 50, 100]}
      columnWidths={{
        tracking_summary: '230px',
        order_type_summary: '140px',
        product_summary: '150px',
        invoice_summary: '170px',
        sender_summary: '170px',
        receiver_summary: '170px',
        charged_weight_summary: '130px',
        updated_summary: '150px',
        status_summary: '150px',
        actions: '140px',
      }}
      onRowClick={onRowClick}
    />
  )
}

export default OrdersTable
