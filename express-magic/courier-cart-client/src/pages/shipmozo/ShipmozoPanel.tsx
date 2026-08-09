import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import type { JSX } from 'react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  TbArrowLeft,
  TbCalendar,
  TbChevronDown,
  TbDownload,
  TbFilter,
  TbPackage,
  TbRefresh,
  TbRotateClockwise,
  TbSettings,
  TbSquareRoundedPlusFilled,
  TbTruckDelivery,
  TbUpload,
  TbWallet,
} from 'react-icons/tb'

const teal = '#0789ad'
const navy = '#313456'
const ink = '#071d33'
const border = '#d7e1ec'
const page = '#f4f7fb'

const tabGroups = [
  {
    label: 'Shipment Booking',
    tabs: ['New', 'Courier Assigned', 'Pickups & Manifests'],
    active: 0,
  },
  {
    label: 'Shipment Journey',
    tabs: ['In Transit', 'Out For Delivery', 'Delivered'],
    active: -1,
  },
  {
    label: 'NDR Exceptions',
    tabs: ['NDR', 'RTO In-Transit', 'RTO Delivered'],
    active: -1,
  },
]

const columns = [
  'Order Date',
  'Order Details',
  'Product Details',
  'Package Details',
  'Payment',
  'Shipping Details',
  'Pickup Address',
  'Action',
]

const orderGridColumns = '42px 1.1fr 1.3fr 1.35fr 1.45fr 0.95fr 1.45fr 1.5fr 0.62fr'

const summaryCards = [
  { label: 'New Orders', value: '0', tone: '#4b88ff', icon: 'open', status: 'New', view: 'All' },
  { label: 'Courier Assigned', value: '0', tone: '#ff9800', icon: 'box', status: 'Courier Assigned', view: 'All' },
  { label: 'Scheduled', value: '38', tone: '#00bfa5', icon: 'label', status: 'Scheduled', view: 'All' },
  { label: 'All Orders', value: '44', tone: '#4b88ff', icon: 'stack', status: 'All Orders', view: 'All' },
  { label: 'Customer Returns', value: '0', tone: '#ff765f', icon: 'return', status: 'Customer Returns', view: 'All' },
  { label: 'RTO', value: '0', tone: '#bbd532', icon: 'rto', status: 'RTO', view: 'All' },
]

type OrderScope = 'All' | 'Archive'
type BulkImportStep = 'choice' | 'b2b' | 'b2c'
type CreateOrderType = 'b2b' | 'b2c'

type ShipmozoOrder = {
  orderDate: string
  customer: string
  orderId: string
  refId: string
  product: string
  sku: string
  quantity: string
  packageDetails: string[]
  invoice: string
  paymentMode: string
  courier: string
  awb: string
  shippingStatus: string
  pickupAddress: string
  status: string
  scope: OrderScope
  type: string
}

const shipmozoOrders: ShipmozoOrder[] = [
  {
    orderDate: '8 Aug 2026 | 05:16 PM\nCustom',
    customer: 'ACME MAGADH SOLAR POWER PVT LTD',
    orderId: '21750SM7429822881',
    refId: '--',
    product: 'INSULATION SPRAY',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['31 x 22 x 22 (cm)', 'Entered Wt.: 3kg', 'Volumetric: 3kg'],
    invoice: 'Invoice : Rs 2242',
    paymentMode: 'Prepaid',
    courier: 'Delhivery 2Kg',
    awb: '31293316608840',
    shippingStatus: 'In Transit',
    pickupAddress: 'EXCEL WORLD WIDE PVT LTD\nCHANDIGARH - 160002',
    status: 'Scheduled',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '8 Aug 2026 | 03:33 PM\nCustom',
    customer: 'CLEMENT ENGINEERS PVT LTD',
    orderId: '21750SM3304704156',
    refId: '--',
    product: 'AUTO PATRS',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['37 x 7 x 7 (cm)', 'Entered Wt.: 1.6kg', 'Volumetric: 0.36kg'],
    invoice: 'Invoice : Rs 2000',
    paymentMode: 'Prepaid',
    courier: 'BlueDart 2Kg',
    awb: '77116579665',
    shippingStatus: 'In Transit',
    pickupAddress: 'HEXALOG LOGISTICS INDIA PVT LTD\nNEW DELHI - 110077',
    status: 'In Transit',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '6 Aug 2026 | 06:47 PM\nCustom',
    customer: 'RA GREEN ENERGY',
    orderId: '21750SM3234768765',
    refId: '--',
    product: 'HMS 1000W',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['50 x 28 x 9 (cm)', 'Entered Wt.: 4kg', 'Volumetric: 2.52kg'],
    invoice: 'Invoice : Rs 1000',
    paymentMode: 'Prepaid',
    courier: 'BlueDart 2Kg',
    awb: '77113361356',
    shippingStatus: 'In Transit',
    pickupAddress: 'HETALLS\nJAIPUR - 302022',
    status: 'In Transit',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '4 Aug 2026 | 05:13 PM\nCustom',
    customer: 'BVG INDIA LIMITED OD',
    orderId: '21750SM6879453314',
    refId: '--',
    product: 'EMPV4NF',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['20 x 20 x 10 (cm)', 'Entered Wt.: 1kg', 'Volumetric: 0.8kg'],
    invoice: 'Invoice : Rs 1450',
    paymentMode: 'Prepaid',
    courier: 'Delhivery 1Kg',
    awb: '35692516897914',
    shippingStatus: 'Out For Delivery',
    pickupAddress: 'NIRAKSH VENTURES DS\nGURGAON - 122001',
    status: 'Out For Delivery',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '31 Jul 2026 | 07:15 PM\nCustom',
    customer: 'RE POWER TECH',
    orderId: '21750SM3155875817',
    refId: '--',
    product: 'LUGS',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['18 x 12 x 8 (cm)', 'Entered Wt.: 2kg', 'Volumetric: 0.4kg'],
    invoice: 'Invoice : Rs 5345',
    paymentMode: 'Prepaid',
    courier: 'BlueDart 2Kg',
    awb: '77109909855',
    shippingStatus: 'Delivered',
    pickupAddress: 'IZZHAAR DS\nGURGAON - 122001',
    status: 'Delivered',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '1 Aug 2026 | 03:27 PM\nCustom',
    customer: 'MOHIT MADAAN',
    orderId: '21750SM8577914191',
    refId: '--',
    product: 'LUGS',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['49 x 34 x 18 (cm)', 'Entered Wt.: 7kg', 'Volumetric: 6kg'],
    invoice: 'Invoice : Rs 23732',
    paymentMode: 'Prepaid',
    courier: 'XpressBees 5Kg',
    awb: '153456560805637',
    shippingStatus: 'Undelivered',
    pickupAddress: 'KLYMATE TECHNOLOGIES LLP\nCOIMBATORE - 641041',
    status: 'NDR',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '30 Jul 2026 | 01:12 PM\nCustom',
    customer: 'IMPULSE GREEN ENERGY PVT LTD',
    orderId: '21750SM1979556472',
    refId: '--',
    product: 'SPARE KIT',
    sku: 'SKU:',
    quantity: 'QTY: 2',
    packageDetails: ['28 x 18 x 14 (cm)', 'Entered Wt.: 2.5kg', 'Volumetric: 1.41kg'],
    invoice: 'Invoice : Rs 3890',
    paymentMode: 'Prepaid',
    courier: 'Delhivery Surface 5KG',
    awb: '31293316489980',
    shippingStatus: 'RTO In-Transit',
    pickupAddress: 'SRR ENERGY AND AUTOMATION PVT LTD\nNOIDA - 201301',
    status: 'RTO In-Transit',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '27 Jul 2026 | 10:40 AM\nCustom',
    customer: 'TALETTUTAYI SOLAR PROJECTS NINE PVT LTD',
    orderId: '21750SM7629012456',
    refId: '--',
    product: 'RETURN BOX',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['25 x 20 x 12 (cm)', 'Entered Wt.: 1.5kg', 'Volumetric: 1kg'],
    invoice: 'Invoice : Rs 1280',
    paymentMode: 'Prepaid',
    courier: 'Delhivery Surface 0.5Kg',
    awb: '35692512001987',
    shippingStatus: 'RTO Delivered',
    pickupAddress: 'MOJA KAKWARA\nBANKA - 813118',
    status: 'RTO Delivered',
    scope: 'All',
    type: 'Forward',
  },
  {
    orderDate: '23 Jul 2026 | 11:22 AM\nCustom',
    customer: 'CLEMENT ENGINEERS PVT LTD',
    orderId: '21750SM5375260758',
    refId: '--',
    product: 'AUTO PARTS',
    sku: 'SKU:',
    quantity: 'QTY: 1',
    packageDetails: ['30 x 12 x 10 (cm)', 'Entered Wt.: 1.4kg', 'Volumetric: 0.72kg'],
    invoice: 'Invoice : Rs 2100',
    paymentMode: 'Prepaid',
    courier: 'BlueDart 2Kg',
    awb: '90619238570',
    shippingStatus: 'Cancelled',
    pickupAddress: 'BC89, SECTOR 1\nKOLKATA - 700064',
    status: 'Customer Returns',
    scope: 'Archive',
    type: 'Reverse',
  },
  {
    orderDate: '22 Jul 2026 | 09:50 AM\nCustom',
    customer: 'RA GREEN ENERGY',
    orderId: '21750SM9988123001',
    refId: '--',
    product: 'PICKUP MANIFEST',
    sku: 'SKU:',
    quantity: 'QTY: 3',
    packageDetails: ['42 x 24 x 20 (cm)', 'Entered Wt.: 5kg', 'Volumetric: 4.03kg'],
    invoice: 'Invoice : Rs 6200',
    paymentMode: 'Prepaid',
    courier: 'Delhivery Heavy MPS',
    awb: '153456560804211',
    shippingStatus: 'Pickup Manifested',
    pickupAddress: 'PRINCE KATARIA COMPLEX\nGURGAON - 122001',
    status: 'Pickups & Manifests',
    scope: 'All',
    type: 'Forward',
  },
]

const transactions = [
  ['Order Shipping amount Deducted', '8 Aug 2026, 05:17 PM', '- 187.62 INR', '#ff6b55'],
  ['Order Cancel amount Received', '8 Aug 2026, 03:48 PM', '+ 211.22 INR', '#00a88f'],
  ['Order Shipping amount Deducted', '8 Aug 2026, 03:33 PM', '- 95.58 INR', '#ff6b55'],
  ['Order Shipping amount Deducted', '8 Aug 2026, 03:29 PM', '- 211.22 INR', '#ff6b55'],
  ['Wallet Recharged', '8 Aug 2026, 03:19 PM', '+ 500 INR', '#00a88f'],
  ['Courier Weight shipping amount Deducted', '6 Aug 2026, 07:13 PM', '- 385.86 INR', '#ff6b55'],
]

const recentOrders = [
  ['ACME MAGADH SOLAR POWER PVT LTD', 'INSULATION SPRAY', '21750SM7429822881', 'Forward', 'Scheduled'],
  ['CLEMENT ENGINEERS PVT LTD', 'AUTO PATRS', '21750SM3304704156', 'Forward', 'Scheduled'],
  ['CLEMENT ENGINEERS PVT LTD', 'AUTO PARTS', '21750SM5375260758', 'Forward', 'Cancelled'],
  ['RA GREEN ENERGY', 'HMS 1000W', '21750SM3234768765', 'Forward', 'Scheduled'],
  ['BVG INDIA LIMITED OD', 'EMPV4NF', '21750SM3838094916', 'Forward', 'Scheduled'],
  ['RE POWER TECH', 'LUGS', '21750SM5638549219', 'Forward', 'Scheduled'],
]

function SegmentTabs() {
  return (
    <Stack direction="row" spacing={2.2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
      <Box sx={{ minWidth: 112 }}>
        <Stack direction="row" spacing={3}>
          <Typography sx={{ color: teal, borderBottom: `3px solid ${teal}`, pb: 1.25, fontSize: 16, fontWeight: 800 }}>
            Forward
          </Typography>
          <Typography sx={{ color: ink, borderBottom: '3px solid #dce3ec', pb: 1.25, fontSize: 16, fontWeight: 800 }}>
            Reverse
          </Typography>
        </Stack>
      </Box>
      <Stack
        direction="row"
        sx={{
          border: `1px solid ${border}`,
          bgcolor: '#fff',
          borderRadius: '11px',
          p: 0.35,
          mx: 'auto',
        }}
      >
        {['Domestic', 'International'].map((item, index) => (
          <Button
            key={item}
            sx={{
              minWidth: 96,
              borderRadius: '10px',
              color: index === 0 ? '#fff' : ink,
              bgcolor: index === 0 ? teal : 'transparent',
              textTransform: 'none',
              fontWeight: 800,
              '&:hover': { bgcolor: index === 0 ? teal : '#eef4f8' },
            }}
          >
            {item}
          </Button>
        ))}
      </Stack>
    </Stack>
  )
}

function FilterGroups({
  activeStatus,
  activeScope,
  onStatusChange,
  onScopeChange,
}: {
  activeStatus: string
  activeScope: string
  onStatusChange: (status: string) => void
  onScopeChange: (scope: string) => void
}) {
  return (
    <Stack direction="row" alignItems="flex-end" gap={1.6} flexWrap="wrap" useFlexGap>
      {tabGroups.map((group) => (
        <Box key={group.label}>
          <Typography sx={{ mb: 1, fontSize: 12, letterSpacing: '0.13em', color: ink, fontWeight: 800 }}>
            {group.label}
          </Typography>
          <Stack direction="row">
            {group.tabs.map((tab, index) => (
              <Button
                key={tab}
                onClick={() => onStatusChange(tab)}
                sx={{
                  height: 48,
                  px: 2,
                  minWidth: index === 2 ? 86 : 74,
                  border: `1px solid ${border}`,
                  borderLeftWidth: index === 0 ? 1 : 0,
                  borderRadius:
                    index === 0
                      ? '14px 0 0 14px'
                      : index === group.tabs.length - 1
                        ? '0 14px 14px 0'
                        : 0,
                  color: activeStatus === tab ? '#fff' : ink,
                  bgcolor: activeStatus === tab ? teal : '#fff',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: activeStatus === tab ? teal : '#f7fafc' },
                }}
              >
                {tab}
              </Button>
            ))}
          </Stack>
        </Box>
      ))}
      <Stack direction="row" sx={{ ml: { md: 0.5 } }}>
        {['All', 'Archive'].map((tab, index) => (
          <Button
            key={tab}
            onClick={() => onScopeChange(tab)}
            sx={{
              height: 48,
              minWidth: 86,
              border: `1px solid ${border}`,
              borderLeftWidth: index === 0 ? 1 : 0,
              borderRadius: index === 0 ? '14px 0 0 14px' : '0 14px 14px 0',
              color: activeScope === tab ? '#fff' : ink,
              bgcolor: activeScope === tab ? teal : '#fff',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: activeScope === tab ? teal : '#f7fafc' },
            }}
          >
            {tab}
          </Button>
        ))}
      </Stack>
    </Stack>
  )
}

function OrdersToolbar() {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      flexWrap="wrap"
      sx={{
        p: 1.6,
        borderBottom: `1px solid ${border}`,
        bgcolor: '#fff',
      }}
    >
      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        <DateBox />
        {['Search by reference id', 'Payment type', 'Channels'].map((item, index) => (
          <Box
            key={item}
            sx={{
              height: 52,
              minWidth: index === 0 ? 250 : 250,
              px: 1.7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#718096',
              border: `1px solid ${border}`,
              borderRadius: '12px',
              bgcolor: '#fff',
              fontSize: 14,
            }}
          >
            {item}
            {index > 0 ? <TbChevronDown size={16} /> : null}
          </Box>
        ))}
        <Button
          startIcon={<TbFilter size={22} />}
          sx={{
            height: 52,
            px: 2,
            borderRadius: '12px',
            bgcolor: '#dbe4f1',
            color: ink,
            textTransform: 'none',
            fontWeight: 800,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -5,
              right: -5,
              width: 10,
              height: 10,
              bgcolor: '#ff8b73',
              borderRadius: '50%',
            },
          }}
        >
          More Filters
        </Button>
      </Stack>
      <Stack direction="row" gap={1}>
        {[TbDownload, TbRefresh, TbSettings].map((Icon, index) => (
          <IconButton
            key={index}
            sx={{
              width: 64,
              height: 46,
              borderRadius: '12px',
              bgcolor: index === 2 ? 'transparent' : '#dfe7f2',
              color: ink,
              '&:hover': { bgcolor: '#d5e0ee' },
            }}
          >
            <Icon size={22} />
          </IconButton>
        ))}
      </Stack>
    </Stack>
  )
}

function OrdersTable({ activeStatus, activeScope }: { activeStatus: string; activeScope: string }) {
  const scopedOrders = shipmozoOrders.filter((order) => order.scope === activeScope)
  const filteredOrders = activeStatus === 'All Orders' ? scopedOrders : scopedOrders.filter((order) => order.status === activeStatus)

  return (
    <Box sx={{ border: `1px solid ${border}`, bgcolor: '#fff', borderRadius: '13px', overflow: 'hidden', minHeight: 540 }}>
      <OrdersToolbar />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: orderGridColumns,
          minWidth: 1240,
          bgcolor: '#eaf0f6',
          borderBottom: `1px solid ${border}`,
          color: ink,
          fontWeight: 900,
          fontSize: 16,
        }}
      >
        <Box sx={{ p: 1.5, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ width: 24, height: 24, border: '1.5px solid #a9bdd3', borderRadius: '4px' }} />
        </Box>
        {columns.map((column) => (
          <Box key={column} sx={{ p: 1.7 }}>
            {column}
          </Box>
        ))}
      </Box>
      {filteredOrders.length > 0 ? (
        <Box sx={{ minWidth: 1240 }}>
          {filteredOrders.map((order) => (
            <Box
              key={order.orderId}
              sx={{
                display: 'grid',
                gridTemplateColumns: orderGridColumns,
                alignItems: 'center',
                borderBottom: `1px solid ${border}`,
                color: ink,
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              <Box sx={{ p: 1.5, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ width: 24, height: 24, border: '1.5px solid #a9bdd3', borderRadius: '4px' }} />
              </Box>
              <OrderTextCell text={order.orderDate} strongLast />
              <Box sx={{ p: 1.5 }}>
                <Typography sx={{ color: '#1464ff', fontWeight: 900, fontSize: 14 }}>{order.orderId}</Typography>
                <Typography sx={{ fontSize: 14 }}>Ref. ID: {order.refId}</Typography>
                <StatusPill status={order.status === 'Customer Returns' ? 'Cancelled' : 'Scheduled'}>{order.status === 'Customer Returns' ? 'Cancelled' : 'Scheduled'}</StatusPill>
              </Box>
              <OrderTextCell text={`${order.product}\n${order.sku}\n${order.quantity}`} />
              <OrderTextCell text={order.packageDetails.join('\n')} />
              <Box sx={{ p: 1.5 }}>
                <Typography sx={{ fontSize: 14 }}>{order.invoice}</Typography>
                <StatusPill>{order.paymentMode}</StatusPill>
              </Box>
              <Box sx={{ p: 1.5 }}>
                <Typography sx={{ fontSize: 14 }}>Courier: {order.courier}</Typography>
                <Typography sx={{ color: '#1464ff', fontWeight: 900, fontSize: 14 }}>AWB: {order.awb}</Typography>
                <Typography sx={{ fontSize: 14 }}>Status: {order.shippingStatus}</Typography>
              </Box>
              <OrderTextCell text={order.pickupAddress} strongFirst />
              <Box sx={{ p: 1.5 }}>
                <IconButton sx={{ width: 38, height: 38, bgcolor: teal, color: '#fff', '&:hover': { bgcolor: '#057798' } }}>
                  <TbChevronDown />
                </IconButton>
              </Box>
            </Box>
          ))}
          <Box sx={{ px: 1.5, py: 1.8, borderBottom: `1px solid ${border}` }}>
            Showing 1 to {filteredOrders.length} of {filteredOrders.length}
          </Box>
        </Box>
      ) : (
        <Box sx={{ height: 420, display: 'grid', placeItems: 'center', color: ink, textAlign: 'center' }}>
        <Box>
          <Box sx={{ position: 'relative', width: 128, height: 128, mx: 'auto', mb: 2 }}>
            <Box
              sx={{
                position: 'absolute',
                left: 20,
                top: 10,
                width: 78,
                height: 108,
                border: '5px solid #0b3b91',
                borderRadius: '14px',
                bgcolor: '#fff',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  right: -5,
                  top: -5,
                  width: 28,
                  height: 28,
                  borderTop: '5px solid #0b3b91',
                  borderRight: '5px solid #0b3b91',
                  bgcolor: '#f7fbff',
                  transform: 'skew(-2deg)',
                },
              }}
            />
            <Box sx={{ position: 'absolute', left: 38, top: 36, width: 30, height: 4, bgcolor: '#ff6d58', borderRadius: 1 }} />
            <Box sx={{ position: 'absolute', left: 38, top: 50, width: 36, height: 4, bgcolor: '#ff6d58', borderRadius: 1 }} />
            <Box sx={{ position: 'absolute', left: 38, top: 64, width: 31, height: 4, bgcolor: '#ff6d58', borderRadius: 1 }} />
            <Box sx={{ position: 'absolute', left: 38, top: 82, width: 38, height: 15, bgcolor: '#ffc84b' }} />
            <Box
              sx={{
                position: 'absolute',
                right: 17,
                bottom: 25,
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: '#65cfd4',
                border: '5px solid #0b3b91',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: 34,
                fontWeight: 900,
              }}
            >
              x
            </Box>
            <Box sx={{ position: 'absolute', right: 8, bottom: 12, width: 32, height: 10, bgcolor: '#ff6d58', border: '5px solid #0b3b91', borderRadius: 4, transform: 'rotate(46deg)' }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 500 }}>No data available for the applied filters.</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 18 }}>Please adjust the filter and try again.</Typography>
        </Box>
      </Box>
      )}
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        gap={2}
        sx={{ position: 'sticky', bottom: 0, px: 2, py: 1.2, borderTop: `1px solid ${border}`, bgcolor: '#fff' }}
      >
        <Typography sx={{ color: '#4a5568', fontSize: 14 }}>Data per page:</Typography>
        <FormControl size="small">
          <Select value={25} sx={{ height: 38, minWidth: 82, borderRadius: '8px' }}>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
        </FormControl>
        <Typography sx={{ color: '#a0aec0' }}>I&lt;</Typography>
        <Typography sx={{ color: '#a0aec0' }}>&lt;</Typography>
        <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: teal, color: '#fff', fontWeight: 800 }}>
          1
        </Box>
        <Typography sx={{ color: '#a0aec0' }}>&gt;</Typography>
        <Typography sx={{ color: '#a0aec0' }}>&gt;I</Typography>
      </Stack>
    </Box>
  )
}

function OrderActions({
  onBulkImport,
  onAddOrder,
  onCreateMenu,
}: {
  onBulkImport: () => void
  onAddOrder: () => void
  onCreateMenu: () => void
}) {
  return (
    <Stack direction="row" gap={1} justifyContent="flex-end" flexWrap="wrap">
      <Button startIcon={<TbRotateClockwise size={18} />} sx={{ ...actionButtonSx, bgcolor: navy }}>
        Sync Orders
      </Button>
      <Button onClick={onBulkImport} sx={actionButtonSx}>Bulk Import</Button>
      <Button onClick={onAddOrder} startIcon={<TbSquareRoundedPlusFilled size={20} />} sx={actionButtonSx}>
        Add Order
      </Button>
      <IconButton onClick={onCreateMenu} sx={{ width: 40, height: 40, bgcolor: teal, color: '#fff', '&:hover': { bgcolor: '#057798' } }}>
        <TbChevronDown />
      </IconButton>
    </Stack>
  )
}

const actionButtonSx = {
  height: 40,
  px: 2,
  borderRadius: '999px',
  bgcolor: teal,
  color: '#fff',
  textTransform: 'none',
  fontWeight: 800,
  boxShadow: '0 7px 15px rgba(7, 137, 173, 0.18)',
  '&:hover': { bgcolor: '#057798' },
}

export function ShipmozoOrdersPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [bulkImportStep, setBulkImportStep] = useState<BulkImportStep | null>(null)
  const [createChooserOpen, setCreateChooserOpen] = useState(false)
  const statusParam = searchParams.get('status') ?? 'New'
  const scopeParam = searchParams.get('view') ?? 'All'
  const allStatuses = [...tabGroups.flatMap((group) => group.tabs), ...summaryCards.map((card) => card.status)]
  const activeStatus = allStatuses.includes(statusParam) ? statusParam : 'New'
  const activeScope = ['All', 'Archive'].includes(scopeParam) ? scopeParam : 'All'

  const updateOrderFilter = (key: 'status' | 'view', value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set(key, value)
    setSearchParams(next)
  }

  const goToCreateOrder = (type: CreateOrderType) => {
    setCreateChooserOpen(false)
    navigate(`/orders/create?type=${type}&shipment=domestic`)
  }

  return (
    <Box sx={{ bgcolor: page, minHeight: 'calc(100dvh - 68px)', px: { xs: 1, md: 1.5 }, py: 2 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
        <SegmentTabs />
        <OrderActions
          onBulkImport={() => setBulkImportStep('choice')}
          onAddOrder={() => goToCreateOrder('b2c')}
          onCreateMenu={() => setCreateChooserOpen(true)}
        />
      </Stack>
      <Box sx={{ mb: 2.1 }}>
        <FilterGroups
          activeStatus={activeStatus}
          activeScope={activeScope}
          onStatusChange={(status) => updateOrderFilter('status', status)}
          onScopeChange={(scope) => updateOrderFilter('view', scope)}
        />
      </Box>
      <OrdersTable activeStatus={activeStatus} activeScope={activeScope} />
      <BulkImportDialog step={bulkImportStep} onStepChange={setBulkImportStep} onClose={() => setBulkImportStep(null)} />
      <CreateOrderDialog
        open={createChooserOpen}
        onClose={() => setCreateChooserOpen(false)}
        onSelect={goToCreateOrder}
      />
    </Box>
  )
}

function CreateOrderDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (type: CreateOrderType) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={dialogTitleSx}>
        Add Order
        <IconButton aria-label="Close add order dialog" onClick={onClose} sx={dialogCloseSx}>
          x
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 6, pb: 5, textAlign: 'center' }}>
        <Stack direction="row" justifyContent="center" gap={2} flexWrap="wrap">
          <Button onClick={() => onSelect('b2b')} sx={dialogPrimaryButtonSx}>B2B Order</Button>
          <Button onClick={() => onSelect('b2c')} sx={dialogPrimaryButtonSx}>B2C Order</Button>
        </Stack>
        <Typography sx={{ mt: 3, color: '#44546a', fontSize: 14 }}>
          Select which type of order you want to create.
        </Typography>
      </DialogContent>
    </Dialog>
  )
}

function BulkImportDialog({
  step,
  onStepChange,
  onClose,
}: {
  step: BulkImportStep | null
  onStepChange: (step: BulkImportStep | null) => void
  onClose: () => void
}) {
  const [fileName, setFileName] = useState('')
  const isUploadStep = step === 'b2b' || step === 'b2c'
  const uploadTitle = step === 'b2b' ? 'B2B Bulk order upload by Excel' : 'B2C Bulk order upload by csv'
  const sampleName = step === 'b2b' ? 'b2b-bulk-order-sample.xlsx' : 'b2c-bulk-order-sample.csv'
  const sampleMime = step === 'b2b' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
  const sampleHref = `data:${sampleMime};charset=utf-8,${encodeURIComponent('Download this sample and replace rows with your order data.')}`

  const resetAndClose = () => {
    setFileName('')
    onClose()
  }

  return (
    <Dialog open={Boolean(step)} onClose={resetAndClose} fullWidth maxWidth="sm">
      <DialogTitle sx={dialogTitleSx}>
        {isUploadStep ? uploadTitle : 'Bulk Import'}
        <IconButton aria-label="Close bulk import dialog" onClick={resetAndClose} sx={dialogCloseSx}>
          x
        </IconButton>
      </DialogTitle>
      {isUploadStep ? (
        <>
          <DialogContent sx={{ pt: 2.4, pb: 2.2 }}>
            <Typography sx={{ mb: 1, color: '#344256', fontWeight: 700, fontSize: 14 }}>
              Upload File (Maximum limit 1000)
            </Typography>
            <Button
              component="label"
              fullWidth
              endIcon={<TbUpload size={24} />}
              sx={{
                height: 52,
                justifyContent: 'space-between',
                border: `1.5px solid ${teal}`,
                borderRadius: '11px',
                color: fileName ? ink : '#718096',
                bgcolor: '#fff',
                textTransform: 'none',
                fontWeight: fileName ? 800 : 500,
                px: 1.8,
                '&:hover': { bgcolor: '#f8fbfd', borderColor: teal },
              }}
            >
              {fileName || 'Select file'}
              <Box
                component="input"
                hidden
                type="file"
                accept={step === 'b2b' ? '.xls,.xlsx' : '.csv'}
                onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name || '')}
              />
            </Button>
            <Typography sx={{ mt: 0.7, color: '#344256', fontSize: 13 }}>Max file size: 5MB</Typography>
            <Button
              component="a"
              href={sampleHref}
              download={sampleName}
              sx={{ mt: 1, px: 0, minHeight: 0, color: '#165dff', fontWeight: 800, textTransform: 'none' }}
            >
              Download Sample File
            </Button>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2, borderTop: `1px solid ${border}` }}>
            <Button onClick={() => { setFileName(''); onStepChange('choice') }} sx={backButtonSx}>
              <TbArrowLeft size={20} />
            </Button>
            <Button onClick={resetAndClose} sx={dialogPrimaryButtonSx}>Save</Button>
          </DialogActions>
        </>
      ) : (
        <DialogContent sx={{ pt: 5.4, pb: 4.4, textAlign: 'center' }}>
          <Stack direction="row" justifyContent="center" gap={2} flexWrap="wrap">
            <Button onClick={() => onStepChange('b2b')} sx={dialogPrimaryButtonSx}>B2B Order</Button>
            <Button onClick={() => onStepChange('b2c')} sx={dialogPrimaryButtonSx}>B2C Order</Button>
          </Stack>
          <Typography sx={{ mt: 3, color: '#44546a', fontSize: 14 }}>
            Please select which type of orders you want to upload
          </Typography>
        </DialogContent>
      )}
    </Dialog>
  )
}

const dialogTitleSx = {
  minHeight: 70,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${border}`,
  color: '#2d3748',
  fontWeight: 900,
  fontSize: 20,
}

const dialogCloseSx = {
  color: '#7186a6',
  fontSize: 24,
  fontWeight: 300,
}

const dialogPrimaryButtonSx = {
  minWidth: 108,
  height: 40,
  px: 2,
  borderRadius: '10px',
  bgcolor: teal,
  color: '#fff',
  textTransform: 'none',
  fontWeight: 900,
  '&:hover': { bgcolor: '#057798' },
}

const backButtonSx = {
  minWidth: 48,
  width: 48,
  height: 38,
  borderRadius: '10px',
  bgcolor: '#cceaf3',
  color: teal,
  '&:hover': { bgcolor: '#b9e1ed' },
}

function OrderTextCell({ text, strongFirst = false, strongLast = false }: { text: string; strongFirst?: boolean; strongLast?: boolean }) {
  const parts = text.split('\n')

  return (
    <Box sx={{ p: 1.5 }}>
      {parts.map((part, index) => (
        <Typography
          key={`${part}-${index}`}
          sx={{
            fontSize: 14,
            lineHeight: 1.55,
            fontWeight: (strongFirst && index === 0) || (strongLast && index === parts.length - 1) ? 900 : 500,
            whiteSpace: 'pre-line',
          }}
        >
          {part}
        </Typography>
      ))}
    </Box>
  )
}

function SummaryIcon({ type, color }: { type: string; color: string }) {
  const Icon = type === 'return' || type === 'rto' ? TbRotateClockwise : type === 'stack' ? TbPackage : TbTruckDelivery
  return (
    <Box sx={{ width: 72, height: 72, mx: 'auto', mb: 1, color }}>
      <Icon size={64} strokeWidth={1.5} />
    </Box>
  )
}

function StatusPill({ children, status }: { children: string; status?: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: status ? 80 : 76,
        px: 1.35,
        py: 0.65,
        borderRadius: 999,
        bgcolor: status === 'Cancelled' ? '#ff856a' : status ? '#4d93f8' : '#12c7a4',
        color: '#fff',
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {children}
    </Box>
  )
}

function RecentOrdersTable() {
  return (
    <Box sx={panelCardSx}>
      <Typography sx={{ p: 2, borderBottom: `1px solid ${border}`, fontSize: 18, fontWeight: 800 }}>Recent Orders</Typography>
      <Box sx={{ p: 2, pt: 1.5, overflowX: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1.55fr 0.8fr 0.85fr 0.48fr 0.55fr',
            minWidth: 1180,
            bgcolor: '#e9eef4',
            color: ink,
            fontSize: 17,
            fontWeight: 900,
          }}
        >
          {['Customer', 'Product', 'Order ID', 'Type', 'Status'].map((head) => (
            <Box key={head} sx={{ px: 1.5, py: 1.45 }}>
              {head}
            </Box>
          ))}
        </Box>
        {recentOrders.map(([customer, product, orderId, type, status]) => (
          <Box
            key={orderId}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1.55fr 0.8fr 0.85fr 0.48fr 0.55fr',
              minWidth: 1180,
              alignItems: 'center',
              borderBottom: '1px solid #dce5ee',
              color: ink,
              fontSize: 14.5,
            }}
          >
            <Box sx={{ px: 1.5, py: 1.55 }}>{customer}</Box>
            <Box sx={{ px: 1.5, py: 1.55 }}>{product}</Box>
            <Box sx={{ px: 1.5, py: 1.55, color: '#1464ff', fontWeight: 900 }}>{orderId}</Box>
            <Box sx={{ px: 1.5, py: 1.55 }}>
              <StatusPill>{type}</StatusPill>
            </Box>
            <Box sx={{ px: 1.5, py: 1.55 }}>
              <StatusPill status={status}>{status}</StatusPill>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function ShipmozoFooter() {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'flex-start', md: 'center' }}
      justifyContent="space-between"
      gap={1}
      sx={{ py: 2.1, color: ink }}
    >
      <Typography sx={{ fontSize: 14 }}>Copyright © 2026 Shipmozo, All rights reserved.</Typography>
      <Stack direction="row" flexWrap="wrap" gap={2.5}>
        {['Privacy Policy', 'Refund & Cancellation', 'Terms and Conditions'].map((item) => (
          <Typography key={item} sx={{ color: '#165dff', fontSize: 14, fontWeight: 600 }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Stack>
  )
}

function DashboardTabs({ active }: { active: 'analytics' | 'order-status' }) {
  const tabs = [
    ['Analytics', '/dashboard', 'analytics'],
    ['Order Status', '/dashboard/order-status', 'order-status'],
  ] as const

  return (
    <Stack direction="row" sx={{ border: `1px solid ${border}`, bgcolor: '#fff', borderRadius: '12px', p: 0.5 }}>
      {tabs.map(([label, path, key]) => {
        const selected = active === key
        return (
          <Button
            key={path}
            href={`#${path}`}
            sx={{
              minWidth: 0,
              bgcolor: selected ? teal : 'transparent',
              color: selected ? '#fff' : ink,
              borderRadius: '9px',
              textTransform: 'none',
              fontWeight: 800,
              px: 2.4,
              '&:hover': { bgcolor: selected ? teal : '#f4f8fb' },
            }}
          >
            {label}
          </Button>
        )
      })}
    </Stack>
  )
}

export function ShipmozoDashboardPanel() {
  return (
    <Box sx={{ bgcolor: page, minHeight: 'calc(100dvh - 68px)', px: { xs: 1, md: 1.5 }, py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1.5}>
        <DashboardTabs active="analytics" />
        <DateBox />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, mb: 2 }}>
        {summaryCards.map((card) => (
          <Box
            key={card.label}
            component="a"
            href={`#/orders/new?status=${encodeURIComponent(card.status)}&view=${encodeURIComponent(card.view)}`}
            sx={{
              minHeight: 166,
              p: 2,
              borderRadius: '10px',
              bgcolor: `${card.tone}14`,
              border: `1.5px solid ${card.tone}`,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'transform .16s ease, box-shadow .16s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 14px 30px ${card.tone}24`,
              },
            }}
          >
            <SummaryIcon type={card.icon} color={card.tone} />
            <Typography sx={{ color: card.tone, fontWeight: 900, fontSize: 16 }}>{card.label}</Typography>
            <Typography sx={{ color: card.tone, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{card.value}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <Box sx={panelCardSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderBottom: `1px solid ${border}` }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>Wallet Transactions</Typography>
            <Button sx={{ minWidth: 84, borderRadius: 999, bgcolor: '#cfe7ef', color: '#007197', textTransform: 'none', fontWeight: 800 }}>
              View All
            </Button>
          </Stack>
          <Stack sx={{ p: 2 }} spacing={2}>
            {transactions.map(([title, date, amount, color]) => (
              <Stack key={`${title}-${date}`} direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                <Stack direction="row" alignItems="center" gap={1.2}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '8px', bgcolor: '#eaf5ff', color: '#1084da', display: 'grid', placeItems: 'center' }}>
                    <TbPackage size={28} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: ink, fontSize: 16, fontWeight: 800 }}>{title}</Typography>
                    <Typography sx={{ color: '#3c4c61', fontSize: 14 }}>{date}</Typography>
                  </Box>
                </Stack>
                <Typography sx={{ color, fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap' }}>{amount}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box sx={panelCardSx}>
          <Typography sx={{ p: 2, borderBottom: `1px solid ${border}`, fontSize: 18, fontWeight: 800 }}>Shipment</Typography>
          <Box sx={{ minHeight: 390, display: 'grid', placeItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 252,
                  height: 252,
                  borderRadius: '50%',
                  mx: 'auto',
                  background: 'conic-gradient(#4d93f8 0 92.3%, #cdda2f 92.3% 97.4%, #ffab17 97.4% 100%)',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 50,
                    bgcolor: '#fff',
                    borderRadius: '50%',
                  },
                }}
              />
              <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={1.4} sx={{ mt: 2 }}>
                {[
                  ['Delivered', '#4d93f8'],
                  ['RTO In-Transit', '#ff856a'],
                  ['RTO Delivered', '#cdda2f'],
                  ['NDR', '#ffab17'],
                ].map(([label, color]) => (
                  <Stack key={label} direction="row" alignItems="center" gap={0.6}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: color }} />
                    <Typography>{label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Box>

      <RecentOrdersTable />
      <ShipmozoFooter />
    </Box>
  )
}

const shipmentStatusMetrics = [
  ['38', 'Total\nShipments'],
  ['0', 'Pickup\nPending'],
  ['7', 'In-Transit'],
  ['29', 'Delivered'],
  ['1', 'Undelivered'],
  ['1', 'RTO'],
  ['0', 'Lost'],
]

const revenueStatusMetrics = [
  ['₹52.13L', 'Last 90 Days'],
  ['₹21.49K', 'This Week'],
  ['₹1L', 'This Month'],
  ['₹3.14Cr', 'This Year'],
]

function DashboardStatusMetric({ value, label }: { value: string; label: string }) {
  return (
    <Stack alignItems="center" spacing={1.1} sx={{ minWidth: 86 }}>
      <Box
        sx={{
          width: 66,
          height: 66,
          borderRadius: '14px',
          bgcolor: '#e8f2ff',
          display: 'grid',
          placeItems: 'center',
          color: '#0b7ee8',
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {value}
      </Box>
      <Typography
        sx={{
          color: ink,
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.25,
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {label}
      </Typography>
    </Stack>
  )
}

function DashboardOrderStatusCard({
  title,
  sectionLabel,
  aside,
  metrics,
}: {
  title: string
  sectionLabel: string
  aside?: string
  metrics: string[][]
}) {
  return (
    <Box sx={{ ...panelCardSx, minHeight: 258 }}>
      <Typography sx={{ p: 2, borderBottom: `1px solid ${border}`, fontSize: 19, fontWeight: 900, color: ink }}>
        {title}
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 2.1, pb: 1.5 }}>
        <Typography sx={{ color: ink, fontSize: 16, fontWeight: 600 }}>{sectionLabel}</Typography>
        {aside && <Typography sx={{ color: ink, fontSize: 15, fontWeight: 600 }}>{aside}</Typography>}
      </Stack>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-around"
        gap={2}
        flexWrap="wrap"
        sx={{ px: 2, pt: 0.8, pb: 3 }}
      >
        {metrics.map(([value, label]) => (
          <DashboardStatusMetric key={`${value}-${label}`} value={value} label={label} />
        ))}
      </Stack>
    </Box>
  )
}

export function ShipmozoDashboardOrderStatusPanel() {
  return (
    <Box sx={{ bgcolor: page, minHeight: 'calc(100dvh - 68px)', px: { xs: 1, md: 1.5 }, py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1.5}>
        <DashboardTabs active="order-status" />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <DashboardOrderStatusCard
          title="Today's Orders: 0"
          sectionLabel="Shipment Details"
          aside="Last 30 days"
          metrics={shipmentStatusMetrics}
        />
        <DashboardOrderStatusCard title="Today's Revenue: ₹ 0" sectionLabel="Revenue" metrics={revenueStatusMetrics} />
      </Box>
    </Box>
  )
}

const panelCardSx = {
  border: `1px solid ${border}`,
  bgcolor: '#fff',
  borderRadius: '13px',
  overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
}

const billingTabs = [
  ['Passbook', '/billing/passbook'],
  ['COD Remittance', '/billing/cod-remittance'],
  ['Shipping Charges', '/billing/shipping-charges'],
  ['All Recharges', '/billing/all-recharges'],
  ['Invoices', '/billing/invoices'],
  ['Credit Notes', '/billing/credit-notes'],
  ['Debit Notes', '/billing/debit-notes'],
  ['Ledgers', '/billing/ledgers'],
  ['Notification Credit History', '/billing/notification-credit-history'],
]

const passbookRows = [
  ['8 Aug 2026 | 05:17 PM', 'Order ID: 21750SM7429822881\nAWB: 31293316608840', 'Order Shipping amount Deducted', '--', '-187.62', '269.75'],
  ['8 Aug 2026 | 03:48 PM', 'Order ID: 21750SM5375260758\nAWB: 90619238570', 'Order Cancel amount Received', '21750/ORCL/1786184333', '+211.22', '457.37'],
  ['8 Aug 2026 | 03:33 PM', 'Order ID: 21750SM3304704156\nAWB: 77116579665', 'Order Shipping amount Deducted', '--', '-95.58', '246.15'],
  ['8 Aug 2026 | 03:29 PM', 'Order ID: 21750SM5375260758\nAWB: 90619238570', 'Order Shipping amount Deducted', '--', '-211.22', '341.73'],
  ['8 Aug 2026 | 03:19 PM', 'Order ID: --\nAWB: --', 'Wallet Recharged', 'pay_TNEQbkIPINPhIV', '+500', '552.95'],
]

const rechargeRows = [
  ['8 Aug 2026 | 03:19 PM', 'pay_TNEQbkIPINPhIV', '+500', 'CREDIT', 'Wallet Recharged', '--'],
  ['8 Aug 2026 | 09:15 AM', 'pay_TML7vvUql2wqjq', '+500', 'CREDIT', 'Wallet Recharged', '--'],
  ['7 Aug 2026 | 03:29 PM', 'pay_TKSqx6tKxDaITV', '+1000', 'CREDIT', 'Wallet Recharged', '--'],
  ['7 Aug 2026 | 09:15 AM', 'pay_TK1re85QfddHba', '+1000', 'CREDIT', 'Wallet Recharged', '--'],
  ['6 Aug 2026 | 11:34 AM', 'pay_TIN5vuTjkUjWQV', '+500', 'CREDIT', 'Wallet Recharged', '--'],
  ['5 Aug 2026 | 08:50 PM', 'pay_THmaXjjIWkxBVb', '+500', 'CREDIT', 'Wallet Recharged', '--'],
  ['5 Aug 2026 | 04:15 PM', 'pay_TGApbRPTooXL7p', '+500', 'CREDIT', 'Wallet Recharged', '--'],
]

const shippingRows = [
  ['8 Aug 2026 | 05:16 PM\nCustom', '21750SM7429822881\nRef. ID: --\nScheduled', 'Courier: Delhivery 2Kg\nAWB: 31293316608840\nStatus : In Transit', 'Invoice : ₹ 2242\nPrepaid', '31 x 22 x 22 (cm)\nEntered Wt.: 3kg\nVolumetric: 3kg', '--', '₹ 187.62', '--'],
  ['8 Aug 2026 | 03:33 PM\nCustom', '21750SM3304704156\nRef. ID: --\nScheduled', 'Courier: BlueDart 2Kg\nAWB: 77116579665\nStatus : In Transit', 'Invoice : ₹ 2000\nPrepaid', '37 x 7 x 7 (cm)\nEntered Wt.: 1.6kg\nVolumetric: 0.36kg', '--', '₹ 95.58', '--'],
  ['6 Aug 2026 | 06:47 PM\nCustom', '21750SM3234768765\nRef. ID: --\nScheduled', 'Courier: BlueDart 2Kg\nAWB: 77113361356\nStatus : In Transit', 'Invoice : ₹ 1000\nPrepaid', '50 x 28 x 9 (cm)\nEntered Wt.: 4kg\nVolumetric: 2.52kg', '--', '₹ 191.16', '--'],
  ['6 Aug 2026 | 08:35 AM\nCustom', '21750SM3838094916\nRef. ID: --\nScheduled', 'Courier: XpressBees 5Kg\nAWB: 153456560808180\nStatus : In Transit', 'Invoice : ₹ 10500\nPrepaid', '40 x 30 x 30 (cm)\nEntered Wt.: 5kg\nVolumetric: 7.2kg', '--', '₹ 283.20', '--'],
]

const ledgerRows = [
  ['Wallet Recharged', 'pay_TNEQbkIPINPhIV', '--', '500'],
  ['Invoice Generated', 'TEN/26-27/20351', '29317.94', '--'],
  ['Wallet Recharged', 'pay_TML7vvUql2wqjq', '--', '500'],
  ['Wallet Recharged', 'pay_TKSqx6tKxDaITV', '--', '1000'],
  ['Wallet Recharged', 'pay_TK1re85QfddHba', '--', '1000'],
  ['Wallet Recharged', 'pay_TIN5vuTjkUjWQV', '--', '500'],
  ['Wallet Recharged', 'pay_THmaXjjIWkxBVb', '--', '500'],
  ['Wallet Recharged', 'pay_TGApbRPTooXL7p', '--', '500'],
]

function BillingTabs({ active }: { active: string }) {
  return (
    <Stack direction="row" sx={{ bgcolor: '#eaf0f6', borderRadius: '10px', overflowX: 'auto', mb: 2 }}>
      {billingTabs.map(([label, path]) => {
        const tabActive = path.endsWith(active)
        return (
          <Button
            key={path}
            href={`#${path}`}
            sx={{
              height: 62,
              minWidth: label === 'Notification Credit History' ? 235 : 155,
              px: 2,
              borderRadius: 0,
              color: tabActive ? teal : ink,
              borderBottom: tabActive ? `3px solid ${teal}` : '3px solid transparent',
              textTransform: 'none',
              fontWeight: tabActive ? 900 : 700,
              gap: 1,
              '&:hover': { bgcolor: '#eef5fa' },
            }}
          >
            <TbWallet size={22} />
            {label}
          </Button>
        )
      })}
    </Stack>
  )
}

function BillingToolbar({ filters = 'full', print = false }: { filters?: 'full' | 'date' | 'date-only'; print?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" sx={{ p: 1.6, bgcolor: '#fff', borderBottom: `1px solid ${border}` }}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <DateBox />
        {filters === 'full' && (
          <>
            <InputBox label="Search by order id" />
            <InputBox label="Search by awb" />
            <Button startIcon={<TbFilter size={22} />} sx={moreFilterSx}>More Filters</Button>
          </>
        )}
      </Stack>
      <Stack direction="row" gap={1}>
        {!print && <ToolButton icon={<TbDownload size={22} />} />}
        <ToolButton icon={<TbRefresh size={22} />} />
        {print && <Button sx={{ height: 46, px: 3, borderRadius: '12px', bgcolor: '#dfe7f2', color: ink, textTransform: 'none', fontWeight: 900 }}>Print</Button>}
      </Stack>
    </Stack>
  )
}

function DateBox() {
  const [from, setFrom] = useState('2026-07-10')
  const [to, setTo] = useState('2026-08-10')
  const [editing, setEditing] = useState(false)
  const format = (value: string) => {
    const [year, month, day] = value.split('-')
    return `${day}-${month}-${year}`
  }

  return (
    <Box sx={{ display: 'flex', minHeight: 52, border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', bgcolor: '#fff' }}>
      <Box sx={{ width: 56, display: 'grid', placeItems: 'center', bgcolor: '#edf2f7', color: '#4a5568' }}><TbCalendar size={22} /></Box>
      {editing ? (
        <Stack direction="row" alignItems="center" gap={0.8} sx={{ px: 1, flexWrap: 'wrap' }}>
          <Box component="input" type="date" value={from} onChange={(event) => setFrom(event.currentTarget.value)} sx={dateInputSx} />
          <Box component="input" type="date" value={to} onChange={(event) => setTo(event.currentTarget.value)} sx={dateInputSx} />
          <Button onClick={() => setEditing(false)} sx={{ minWidth: 58, height: 34, borderRadius: '8px', bgcolor: teal, color: '#fff', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: '#057798' } }}>
            Apply
          </Button>
        </Stack>
      ) : (
        <Button onClick={() => setEditing(true)} sx={{ px: 1.4, minWidth: 230, justifyContent: 'flex-start', color: ink, fontSize: 14, textTransform: 'none', fontWeight: 500 }}>
          {format(from)} to {format(to)}
        </Button>
      )}
    </Box>
  )
}

const dateInputSx = {
  width: 142,
  height: 34,
  border: `1px solid ${border}`,
  borderRadius: '8px',
  px: 1,
  color: ink,
  fontSize: 13,
  outline: 0,
}

function InputBox({ label }: { label: string }) {
  const [value, setValue] = useState('')
  return (
    <Box
      component="input"
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
      placeholder={label}
      sx={{
        height: 52,
        minWidth: 250,
        px: 1.7,
        color: ink,
        border: `1px solid ${border}`,
        borderRadius: '12px',
        bgcolor: '#fff',
        fontSize: 14,
        outline: 0,
        '&::placeholder': { color: '#718096', opacity: 1 },
        '&:focus': { borderColor: teal, boxShadow: '0 0 0 3px rgba(7, 137, 173, 0.12)' },
      }}
    />
  )
}

const moreFilterSx = {
  height: 52,
  px: 2,
  borderRadius: '12px',
  bgcolor: '#dbe4f1',
  color: ink,
  textTransform: 'none',
  fontWeight: 800,
  position: 'relative',
  '&::after': { content: '""', position: 'absolute', top: -5, right: -5, width: 10, height: 10, bgcolor: '#ff8b73', borderRadius: '50%' },
}

function ToolButton({ icon }: { icon: JSX.Element }) {
  return <IconButton sx={{ width: 64, height: 46, borderRadius: '12px', bgcolor: '#dfe7f2', color: ink, '&:hover': { bgcolor: '#d5e0ee' } }}>{icon}</IconButton>
}

function DataGrid({ heads, rows, widths }: { heads: string[]; rows: string[][]; widths: string }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: widths, minWidth: 1180, bgcolor: '#e9eef4', color: ink, fontSize: 17, fontWeight: 900 }}>
        {heads.map((head) => <Box key={head} sx={{ px: 1.5, py: 1.45 }}>{head}</Box>)}
      </Box>
      {rows.map((row, rowIndex) => (
        <Box key={`${row[1]}-${rowIndex}`} sx={{ display: 'grid', gridTemplateColumns: widths, minWidth: 1180, alignItems: 'center', borderBottom: `1px solid ${border}`, fontSize: 14.5, color: ink }}>
          {row.map((cell, index) => (
            <Box key={`${cell}-${index}`} sx={{ px: 1.5, py: 1.55, whiteSpace: 'pre-line', lineHeight: 1.65 }}>
              {cell === 'CREDIT' ? <StatusPill>CREDIT</StatusPill> : cell === 'Scheduled' || cell.endsWith('\nScheduled') ? <MixedCell text={cell} /> : colorAmount(cell)}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}

function MixedCell({ text }: { text: string }) {
  const parts = text.split('\n')
  return (
    <>
      {parts.slice(0, -1).map((part) => <Typography key={part} sx={{ fontSize: 14.5, lineHeight: 1.65, color: part.startsWith('21750') || part.startsWith('AWB') ? '#1464ff' : ink, fontWeight: part.startsWith('21750') ? 900 : 500 }}>{part}</Typography>)}
      <StatusPill status="Scheduled">Scheduled</StatusPill>
    </>
  )
}

function colorAmount(cell: string) {
  if (cell.startsWith('+')) return <Typography sx={{ color: '#00a85a', fontWeight: 900 }}>{cell}</Typography>
  if (cell.startsWith('-')) return <Typography sx={{ color: '#ff1f1f', fontWeight: 900 }}>{cell}</Typography>
  return cell
}

function EmptyState({ text = 'No data available for the applied filters.' }: { text?: string }) {
  return (
    <Box sx={{ minHeight: 430, display: 'grid', placeItems: 'center', textAlign: 'center', color: ink }}>
      <Box>
        <Box sx={{ width: 118, height: 118, mx: 'auto', mb: 1.2, position: 'relative' }}>
          <Box sx={{ position: 'absolute', left: 16, top: 6, width: 76, height: 106, border: '5px solid #0b3b91', borderRadius: '12px', bgcolor: '#fff' }} />
          <Box sx={{ position: 'absolute', left: 34, top: 32, width: 38, height: 4, bgcolor: '#ff6d58', borderRadius: 1 }} />
          <Box sx={{ position: 'absolute', left: 34, top: 47, width: 44, height: 4, bgcolor: '#ff6d58', borderRadius: 1 }} />
          <Box sx={{ position: 'absolute', left: 34, top: 64, width: 42, height: 17, bgcolor: '#ffc84b' }} />
          <Box sx={{ position: 'absolute', right: 13, bottom: 22, width: 54, height: 54, borderRadius: '50%', bgcolor: '#65cfd4', border: '5px solid #0b3b91', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 31, fontWeight: 900 }}>x</Box>
          <Box sx={{ position: 'absolute', right: 3, bottom: 8, width: 31, height: 10, bgcolor: '#ff6d58', border: '5px solid #0b3b91', borderRadius: 4, transform: 'rotate(46deg)' }} />
        </Box>
        <Typography sx={{ fontSize: 19 }}>{text}</Typography>
        {text.includes('available') && <Typography sx={{ fontSize: 19, mt: 0.4 }}>Please adjust the filter and try again.</Typography>}
      </Box>
    </Box>
  )
}

function BillingShell({ active, children }: { active: string; children: JSX.Element }) {
  return (
    <Box sx={{ bgcolor: page, minHeight: 'calc(100dvh - 68px)', px: { xs: 1, md: 1.5 }, py: 2 }}>
      <BillingTabs active={active} />
      <Box sx={{ border: `1px solid ${border}`, bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>{children}</Box>
    </Box>
  )
}

export function ShipmozoBillingPassbookPanel() {
  return (
    <BillingShell active="passbook">
      <>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 2, p: 2 }}>
          {[
            ['Wallet Balance', '₹269.75'],
            ['Total Credit', '₹3175034.67'],
            ['Total Debit', '₹3174764.92'],
          ].map(([label, value]) => (
            <Box key={label} sx={{ minHeight: 94, borderRadius: '8px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(15,23,42,.08)', display: 'grid', placeItems: 'center' }}>
              <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{label}</Typography>
              <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 900 }}>{value}</Typography>
            </Box>
          ))}
        </Box>
        <BillingToolbar />
        <DataGrid heads={['Order Details', 'Narration', 'Transaction ID', 'Amount(₹)', 'Balance(₹)']} rows={passbookRows.map((r) => r.slice(1))} widths="1.1fr 1.2fr 1.2fr .65fr .65fr" />
      </>
    </BillingShell>
  )
}

export function ShipmozoBillingCodPanel() {
  return (
    <BillingShell active="cod-remittance">
      <>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: 2, p: 2 }}>
          {['Total Remittance Generated\n₹8084', 'Total remittance Paid\n₹8084', 'Next Remittance (2026-08-11)\n₹0', 'Total Remittance Due\n₹0'].map((item) => {
            const [label, value] = item.split('\n')
            return <Box key={label} sx={{ minHeight: 94, borderRadius: '8px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(15,23,42,.08)', display: 'grid', placeItems: 'center' }}><Typography sx={{ fontWeight: 800 }}>{label}</Typography><Typography sx={{ fontSize: 20, fontWeight: 900 }}>{value}</Typography></Box>
          })}
        </Box>
        <BillingToolbar />
        <DataGrid heads={['Remittance Date', 'Ref ID', 'Generated COD', 'ECOD Charge', 'Wallet Used', 'Net Cod Amount', 'Amount Paid', 'Bank Transaction ID', 'Orders', 'Status']} rows={[]} widths=".9fr .8fr .85fr .75fr .75fr .9fr .8fr 1.1fr .65fr .65fr" />
        <EmptyState />
      </>
    </BillingShell>
  )
}

export function ShipmozoBillingShippingChargesPanel() {
  return (
    <BillingShell active="shipping-charges">
      <>
        <BillingToolbar />
        <DataGrid heads={['Order Date', 'ID & Type', 'Tracking Info', 'Payment', 'Entered Weight & Dims.', 'Courier Weight & Dims.', 'Entered Weight Charges', 'Courier Weight Charges']} rows={shippingRows} widths=".9fr 1.1fr 1.25fr .85fr 1.25fr 1.05fr 1fr 1fr" />
      </>
    </BillingShell>
  )
}

export function ShipmozoBillingAllRechargesPanel() {
  return (
    <BillingShell active="all-recharges">
      <>
        <BillingToolbar filters="date" />
        <DataGrid heads={['Transaction ID', 'Amount(₹)', 'Transaction Type', 'Narration', 'Promo Code']} rows={rechargeRows.map((r) => r.slice(1))} widths="1.25fr .75fr .9fr 1.1fr .8fr" />
      </>
    </BillingShell>
  )
}

export function ShipmozoBillingInvoicesPanel() {
  return (
    <BillingShell active="invoices">
      <>
        <BillingToolbar filters="date" />
        <Typography sx={{ px: 2, py: 1.4, fontWeight: 800 }}>Invoices include only shipments with final weight confirmed by the courier. Remaining shipments will be billed next month after weight confirmation</Typography>
        <DataGrid heads={['Invoice No.', 'Amount', 'Invoice Cycle', 'Invoice Date', 'Payment Status', 'Download']} rows={[['TEN/26-27/20351', '₹29317.94', '31 Jul 2026', '31 Jul 2026', 'Paid', 'PDF     CSV']]} widths="1fr .75fr .9fr .9fr .9fr .7fr" />
      </>
    </BillingShell>
  )
}

function CreditDebitPanel({ type }: { type: 'credit-notes' | 'debit-notes' }) {
  const isCredit = type === 'credit-notes'
  return (
    <BillingShell active={type}>
      <>
        <BillingToolbar filters="date" />
        <DataGrid heads={['Order Details', 'Narration', 'Amount', 'Download']} rows={[]} widths="1.1fr 1.3fr .7fr .7fr" />
        <EmptyState text={isCredit ? 'No credit receipts found!' : 'No debit receipts found!'} />
      </>
    </BillingShell>
  )
}

export function ShipmozoBillingCreditNotesPanel() {
  return <CreditDebitPanel type="credit-notes" />
}

export function ShipmozoBillingDebitNotesPanel() {
  return <CreditDebitPanel type="debit-notes" />
}

export function ShipmozoBillingLedgersPanel() {
  return (
    <BillingShell active="ledgers">
      <>
        <BillingToolbar filters="date-only" print />
        <Stack direction="row" spacing={3} sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 900 }}>Total Debit: ₹ 235,798.32</Typography>
          <Typography sx={{ fontWeight: 900 }}>Total Credit: ₹ 147,700.00</Typography>
        </Stack>
        <DataGrid heads={['Particulars', 'VCH No.', 'Debit (₹)', 'Credit (₹)']} rows={ledgerRows} widths="1.2fr 1.4fr .8fr .8fr" />
      </>
    </BillingShell>
  )
}

export function ShipmozoBillingNotificationCreditPanel() {
  return (
    <BillingShell active="notification-credit-history">
      <>
        <BillingToolbar filters="date" />
        <DataGrid heads={['Date', 'Transaction ID', 'Credits', 'Narration']} rows={[]} widths=".9fr 1.1fr .7fr 1.3fr" />
        <EmptyState />
      </>
    </BillingShell>
  )
}

const ndrRows = [
  ['1 Aug 2026 | 03:27 PM\nCustom', '21750SM8577914191\nRef. ID: --\nScheduled', 'LUGS\nSKU:\nQTY: 1', 'Invoice : ₹ 23732\nPrepaid', 'XpressBees 5Kg\nAWB: 153456560805637\nStatus: Undelivered', 'Wrong Pincode\n5 Aug 2026', '2', '⌄'],
]

export function ShipmozoNdrPanel() {
  return (
    <Box sx={{ bgcolor: page, minHeight: 'calc(100dvh - 68px)', px: { xs: 1, md: 1.5 }, py: 2 }}>
      <Stack direction="row" sx={{ mb: 2, overflowX: 'auto' }}>
        {['NDR', 'NDR (Wrong Address/Phone)', 'NDR Delivered', 'RTO', 'RTO Delivered'].map((tab, index) => (
          <Button key={tab} sx={{ height: 48, minWidth: index === 1 ? 215 : 88, border: `1px solid ${border}`, borderLeftWidth: index === 0 ? 1 : 0, borderRadius: index === 0 ? '14px 0 0 14px' : index === 4 ? '0 14px 14px 0' : 0, bgcolor: index === 0 ? teal : '#fff', color: index === 0 ? '#fff' : ink, textTransform: 'none', fontWeight: 800 }}>{tab}</Button>
        ))}
      </Stack>
      <Box sx={{ border: `1px solid ${border}`, bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
        <BillingToolbar />
        <DataGrid heads={['Order Date', 'Order Details', 'Product Details', 'Payment', 'Tracking Info', 'NDR Details', 'Delivery Attempts', 'Action']} rows={ndrRows} widths=".9fr 1.15fr 1fr .9fr 1.25fr 1fr .8fr .55fr" />
        <Box sx={{ px: 1.5, py: 1.8, borderTop: `1px solid ${border}` }}>Showing 1 to 1 of 1</Box>
      </Box>
    </Box>
  )
}
