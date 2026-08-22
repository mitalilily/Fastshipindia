import { Box, Button, HStack, Text } from '@chakra-ui/react'
import {
  IconBook,
  IconClipboardList,
  IconCoinRupee,
  IconFileInvoice,
  IconReceipt,
  IconTruckDelivery,
} from '@tabler/icons-react'
import {
  AdminStack,
  DataTable,
  Metric,
  PageIntro,
  SearchInput,
  SoftBadge,
  ToolbarCard,
} from 'components/AdminUI/AdminPage'
import { useAdminBillingInvoices } from 'hooks/useBillingInvoices'
import { useAdminWallets } from 'hooks/useWallet'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

const sellerName = (row) =>
  row?.userName ||
  row?.companyInfo?.contactPerson ||
  row?.companyInfo?.brandName ||
  row?.companyInfo?.businessName ||
  row?.userEmail ||
  row?.userPhone ||
  'Seller'

const businessName = (row) =>
  row?.businessName ||
  row?.companyName ||
  row?.companyInfo?.businessName ||
  row?.companyInfo?.brandName ||
  '-'

const pageCopy = {
  passbook: {
    icon: IconBook,
    title: 'Passbook',
    subtitle: 'Seller wallet balances, deductions, and finance activity in one place',
    dataSource: 'wallets',
    search: 'Search seller, email, or phone...',
  },
  shippingCharges: {
    icon: IconTruckDelivery,
    title: 'Shipping Charges',
    subtitle: 'Review shipment deductions generated through billing invoices',
    dataSource: 'invoices',
    search: 'Search invoice, seller, or business...',
  },
  allRecharges: {
    icon: IconCoinRupee,
    title: 'All Recharges',
    subtitle: 'Track recharge-ready wallets and seller wallet funding status',
    dataSource: 'wallets',
    search: 'Search recharge by seller, email, or phone...',
  },
  creditNotes: {
    icon: IconReceipt,
    title: 'Credit Notes',
    subtitle: 'Seller credits, refunds, COD offsets, and invoice adjustments',
    dataSource: 'invoices',
    search: 'Search credit note, invoice, or seller...',
  },
  debitNotes: {
    icon: IconClipboardList,
    title: 'Debit Notes',
    subtitle: 'Additional deductions, invoice adjustments, and wallet debits',
    dataSource: 'invoices',
    search: 'Search debit note, invoice, or seller...',
  },
  ledgers: {
    icon: IconFileInvoice,
    title: 'Ledgers',
    subtitle: 'Consolidated seller finance ledger for invoices and wallet balances',
    dataSource: 'wallets',
    search: 'Search ledger by seller, email, or phone...',
  },
}

function invoiceNumber(row) {
  return row.invoiceNo || row.invoice_number || row.invoiceId || row.id || '-'
}

function invoiceTotal(row) {
  return Number(row.totalAmount || row.netPayable || row.amount || row.shippingCharges || 0)
}

export default function AdminFinanceLedgerPage({ type = 'passbook' }) {
  const history = useHistory()
  const config = pageCopy[type] || pageCopy.passbook
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 20
  const walletsQuery = useAdminWallets(
    config.dataSource === 'wallets'
      ? {
          page,
          limit,
          search,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        }
      : null,
  )
  const invoicesQuery = useAdminBillingInvoices(
    config.dataSource === 'invoices'
      ? {
          page,
          limit,
          search,
        }
      : null,
  )

  const wallets = walletsQuery.data?.data || []
  const invoices = invoicesQuery.data?.invoices || invoicesQuery.data?.data || []
  const rows = config.dataSource === 'wallets' ? wallets : invoices
  const totalCount =
    config.dataSource === 'wallets'
      ? walletsQuery.data?.totalCount || wallets.length
      : invoicesQuery.data?.totalCount || invoices.length
  const isLoading = config.dataSource === 'wallets' ? walletsQuery.isLoading : invoicesQuery.isLoading
  const walletSummary = walletsQuery.data?.summary || {}
  const invoiceTotalAmount = invoices.reduce((sum, row) => sum + invoiceTotal(row), 0)

  const walletColumns = [
    {
      key: 'seller',
      label: 'Seller',
      render: (_value, row) => (
        <Box>
          <Text fontWeight="800">{sellerName(row)}</Text>
          <Text color="#607397" fontSize="13px" noOfLines={1}>
            {row.userEmail || row.userPhone || '-'}
          </Text>
        </Box>
      ),
    },
    {
      key: 'business',
      label: 'Business',
      render: (_value, row) => businessName(row),
    },
    {
      key: 'balance',
      label: type === 'allRecharges' ? 'Recharge Balance' : 'Current Balance',
      align: 'right',
      render: (value) => (
        <Text fontWeight="800" color={Number(value || 0) > 0 ? '#047857' : '#607397'}>
          {money(value)}
        </Text>
      ),
    },
    {
      key: 'approved',
      label: 'Status',
      render: (value) => (
        <SoftBadge colorScheme={value ? 'green' : 'orange'}>
          {value ? 'Active' : 'Pending'}
        </SoftBadge>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Activity',
      render: (value, row) => formatDate(value || row.updated_at || row.createdAt),
    },
  ]

  const invoiceColumns = [
    {
      key: 'invoiceNo',
      label: type === 'shippingCharges' ? 'Charge Ref' : 'Document #',
      render: (_value, row) => (
        <Box>
          <Text fontWeight="800">{invoiceNumber(row)}</Text>
          <Text color="#607397" fontSize="13px">
            {formatDate(row.createdAt || row.created_at)}
          </Text>
        </Box>
      ),
    },
    {
      key: 'user',
      label: 'Seller',
      render: (_value, row) => (
        <Box>
          <Text noOfLines={1}>{row.userEmail || row.email || '-'}</Text>
          <Text color="#607397" fontSize="13px">
            {businessName(row)}
          </Text>
        </Box>
      ),
    },
    {
      key: 'period',
      label: 'Period',
      render: (_value, row) => `${formatDate(row.periodFrom || row.startDate)} - ${formatDate(row.periodTo || row.endDate)}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <SoftBadge colorScheme="blue">{String(value || 'Generated')}</SoftBadge>,
    },
    {
      key: 'totalAmount',
      label:
        type === 'creditNotes'
          ? 'Credit Amount'
          : type === 'debitNotes'
            ? 'Debit Amount'
            : 'Amount',
      align: 'right',
      render: (_value, row) => <Text fontWeight="800">{money(invoiceTotal(row))}</Text>,
    },
  ]

  return (
    <AdminStack>
      <PageIntro
        icon={config.icon}
        title={config.title}
        subtitle={config.subtitle}
        right={
          <HStack spacing="28px" wrap="wrap">
            <Metric icon={config.icon} value={totalCount} label="records" color="#0D3B8E" />
            <Metric
              icon={IconCoinRupee}
              value={
                config.dataSource === 'wallets'
                  ? money(walletSummary.totalBalance || 0)
                  : money(invoiceTotalAmount)
              }
              label={config.dataSource === 'wallets' ? 'wallet balance' : 'visible amount'}
              color="#C81E2B"
            />
            <Metric
              icon={IconReceipt}
              value={config.dataSource === 'wallets' ? walletSummary.withBalance || 0 : invoices.length}
              label={config.dataSource === 'wallets' ? 'with balance' : 'loaded docs'}
              color="#047857"
            />
          </HStack>
        }
      />

      <ToolbarCard>
        <HStack spacing="14px" align="end" wrap="wrap">
          <Box>
            <Text color="#41557A" fontSize="14px" mb="7px">
              Search
            </Text>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder={config.search}
              maxW="360px"
            />
          </Box>
          <HStack ml="auto" mt="27px" spacing="10px">
            <Button variant="outline" onClick={() => history.push('/admin/wallet')}>
              Open Wallets
            </Button>
            <Button variant="outline" onClick={() => history.push('/admin/billing-invoices')}>
              Open Invoices
            </Button>
          </HStack>
        </HStack>
      </ToolbarCard>

      <DataTable
        loading={isLoading}
        rows={rows}
        emptyText={`No ${config.title.toLowerCase()} records found`}
        columns={config.dataSource === 'wallets' ? walletColumns : invoiceColumns}
        footer={
          <Text color="#607397">
            {Math.min(page * limit, totalCount)} of {totalCount}
          </Text>
        }
        minW={config.dataSource === 'wallets' ? '1040px' : '1120px'}
      />
    </AdminStack>
  )
}
