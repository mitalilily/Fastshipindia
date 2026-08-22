import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import {
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconCoinRupee,
  IconDownload,
  IconFileInvoice,
  IconReceipt,
  IconRefresh,
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
import { useAdminWalletMisReport, useExportAdminWalletMisReport } from 'hooks/useWallet'
import { useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-IN')
}

const pageCopy = {
  passbook: {
    icon: IconBook,
    title: 'Passbook',
    subtitle: 'Complete seller wallet passbook across credits, debits, shipments, and adjustments',
    search: 'Search seller, email, AWB, reason...',
    params: {},
  },
  shippingCharges: {
    icon: IconTruckDelivery,
    title: 'Shipping Charges',
    subtitle: 'Shipment-related wallet deductions with AWB, courier, weight, and reference details',
    search: 'Search AWB, seller, courier...',
    params: { type: 'debit', shipmentOnly: true },
  },
  allRecharges: {
    icon: IconCoinRupee,
    title: 'All Recharges',
    subtitle: 'Wallet recharge credits collected from sellers',
    search: 'Search recharge by seller, email, reference...',
    params: { type: 'credit', transactionAgainst: 'wallet recharge' },
  },
  creditNotes: {
    icon: IconReceipt,
    title: 'Credit Notes',
    subtitle: 'Credit note and waiver wallet credits issued to sellers',
    search: 'Search credit note, seller, reference...',
    params: { type: 'credit', transactionAgainst: 'Credit note' },
  },
  debitNotes: {
    icon: IconClipboardList,
    title: 'Debit Notes',
    subtitle: 'Debit wallet entries such as penalties, chargebacks, weight disputes, and other charges',
    search: 'Search debit note, seller, AWB, reason...',
    params: { type: 'debit' },
  },
  ledgers: {
    icon: IconFileInvoice,
    title: 'Ledgers',
    subtitle: 'Consolidated seller finance ledger with every classified wallet transaction',
    search: 'Search ledger by seller, email, AWB, reason...',
    params: {},
  },
}

const transactionBadgeScheme = (rawType) =>
  String(rawType || '').toLowerCase() === 'credit' ? 'green' : 'red'

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default function AdminFinanceLedgerPage({ type = 'passbook' }) {
  const history = useHistory()
  const toast = useToast()
  const config = pageCopy[type] || pageCopy.passbook
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [transactionType, setTransactionType] = useState(config.params.type || '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const requestParams = useMemo(
    () => ({
      page,
      limit,
      search,
      ...config.params,
      type: transactionType || config.params.type || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [config.params, dateFrom, dateTo, limit, page, search, transactionType],
  )

  const reportQuery = useAdminWalletMisReport(requestParams)
  const exportReport = useExportAdminWalletMisReport()
  const rows = reportQuery.data?.data || []
  const totalCount = reportQuery.data?.totalCount || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))
  const canChangeType = !config.params.type
  const hasFilters = Boolean(search || dateFrom || dateTo || (canChangeType && transactionType))

  const visibleCredit = rows
    .filter((row) => String(row.rawTransactionType).toLowerCase() === 'credit')
    .reduce((sum, row) => sum + Number(row.walletTransactionAmount || 0), 0)
  const visibleDebit = rows
    .filter((row) => String(row.rawTransactionType).toLowerCase() === 'debit')
    .reduce((sum, row) => sum + Number(row.walletTransactionAmount || 0), 0)

  const handleExport = async () => {
    try {
      const blob = await exportReport.mutateAsync({
        ...requestParams,
        page: 1,
        limit: 5000,
      })
      downloadBlob(blob, `${config.title.toLowerCase().replace(/\s+/g, '-')}.csv`)
      toast({ status: 'success', title: `${config.title} exported` })
    } catch (error) {
      toast({
        status: 'error',
        title: 'Export failed',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
      })
    }
  }

  const resetFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setTransactionType(config.params.type || '')
    setPage(1)
  }

  return (
    <AdminStack>
      <PageIntro
        icon={config.icon}
        title={config.title}
        subtitle={config.subtitle}
        right={
          <HStack spacing="24px" wrap="wrap">
            <Metric icon={config.icon} value={totalCount} label="records" color="#0D3B8E" />
            <Metric icon={IconCoinRupee} value={money(visibleCredit)} label="visible credits" color="#047857" />
            <Metric icon={IconReceipt} value={money(visibleDebit)} label="visible debits" color="#C2410C" />
          </HStack>
        }
      />

      <ToolbarCard>
        <Stack direction={{ base: 'column', xl: 'row' }} spacing="14px" align={{ base: 'stretch', xl: 'end' }}>
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
          {canChangeType ? (
            <Box>
              <Text color="#41557A" fontSize="14px" mb="7px">
                Type
              </Text>
              <Select
                value={transactionType}
                onChange={(event) => {
                  setTransactionType(event.target.value)
                  setPage(1)
                }}
                w={{ base: '100%', md: '170px' }}
              >
                <option value="">All types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </Select>
            </Box>
          ) : null}
          <Box>
            <Text color="#41557A" fontSize="14px" mb="7px">
              From
            </Text>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => {
                setDateFrom(event.target.value)
                setPage(1)
              }}
              w={{ base: '100%', md: '170px' }}
            />
          </Box>
          <Box>
            <Text color="#41557A" fontSize="14px" mb="7px">
              To
            </Text>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => {
                setDateTo(event.target.value)
                setPage(1)
              }}
              w={{ base: '100%', md: '170px' }}
            />
          </Box>
          <HStack ml={{ base: 0, xl: 'auto' }} spacing="10px">
            {type === 'allRecharges' ? (
              <Button variant="outline" onClick={() => history.push('/admin/wallet')}>
                Wallet Management
              </Button>
            ) : null}
            <Button
              leftIcon={<IconRefresh size={17} />}
              variant="outline"
              onClick={() => reportQuery.refetch()}
              isLoading={reportQuery.isFetching}
            >
              Refresh
            </Button>
            <Button variant="outline" onClick={resetFilters} isDisabled={!hasFilters}>
              Reset
            </Button>
            <Button
              leftIcon={<IconDownload size={17} />}
              colorScheme="blue"
              onClick={handleExport}
              isLoading={exportReport.isPending}
            >
              Export CSV
            </Button>
          </HStack>
        </Stack>
      </ToolbarCard>

      <DataTable
        loading={reportQuery.isLoading}
        rows={rows}
        emptyText={`No ${config.title.toLowerCase()} records found`}
        rowKey="id"
        columns={[
          {
            key: 'customerName',
            label: 'Seller',
            render: (_value, row) => (
              <Box>
                <Text fontWeight="800" noOfLines={1}>
                  {row.customerName || 'Seller'}
                </Text>
                <Text color="#607397" fontSize="13px" noOfLines={1}>
                  {row.customerEmail || row.customerId || '-'}
                </Text>
              </Box>
            ),
          },
          {
            key: 'transactionDate',
            label: 'Date',
            render: (value) => formatDateTime(value),
          },
          {
            key: 'walletTransactionAmount',
            label: 'Amount',
            align: 'right',
            render: (value, row) => (
              <Text
                fontWeight="800"
                color={String(row.rawTransactionType).toLowerCase() === 'credit' ? '#047857' : '#C2410C'}
              >
                {String(row.rawTransactionType).toLowerCase() === 'credit' ? '+' : '-'}
                {money(value)}
              </Text>
            ),
          },
          {
            key: 'transactionAgainst',
            label: 'Against',
            render: (value) => <SoftBadge colorScheme="purple">{value || 'Ledger entry'}</SoftBadge>,
          },
          {
            key: 'transactionType',
            label: 'Type',
            render: (value, row) => (
              <SoftBadge colorScheme={transactionBadgeScheme(row.rawTransactionType)}>
                {value || '-'}
              </SoftBadge>
            ),
          },
          {
            key: 'awb',
            label: 'AWB',
            render: (value) => value || '-',
          },
          {
            key: 'courierPartnerName',
            label: 'Courier',
            render: (value) => value || '-',
          },
          {
            key: 'weight',
            label: 'Weight',
            align: 'right',
            render: (value) => (value ? `${Number(value).toFixed(2)} kg` : '-'),
          },
          {
            key: 'rawReason',
            label: 'Reason',
            render: (value, row) => (
              <Box>
                <Text noOfLines={1}>{value || row.reference || '-'}</Text>
                {row.reference ? (
                  <Text color="#607397" fontSize="12px" noOfLines={1}>
                    Ref: {row.reference}
                  </Text>
                ) : null}
              </Box>
            ),
          },
        ]}
        actions={(row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              history.push(`/admin/users-management?search=${encodeURIComponent(row.customerEmail || row.customerName || '')}`)
            }
          >
            Seller
          </Button>
        )}
        footer={
          <HStack spacing="12px">
            <Text color="#607397">
              {totalCount
                ? `${Math.min((page - 1) * limit + 1, totalCount)}-${Math.min(page * limit, totalCount)} of ${totalCount}`
                : '0 records'}
            </Text>
            <Select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value))
                setPage(1)
              }}
              w="120px"
              size="sm"
            >
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </Select>
            <IconButton
              aria-label="Previous page"
              icon={<IconChevronLeft size={18} />}
              size="sm"
              variant="outline"
              isDisabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            />
            <Text fontSize="13px" color="#41557A">
              {page} / {totalPages}
            </Text>
            <IconButton
              aria-label="Next page"
              icon={<IconChevronRight size={18} />}
              size="sm"
              variant="outline"
              isDisabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            />
          </HStack>
        }
        minW="1360px"
      />
    </AdminStack>
  )
}
