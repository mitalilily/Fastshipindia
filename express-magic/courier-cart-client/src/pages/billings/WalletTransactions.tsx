import {
  Alert,
  Avatar,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import React, { useEffect, useMemo, useState } from 'react'
import { FaArrowDown, FaArrowUp } from 'react-icons/fa'
import { useLocation, useSearchParams } from 'react-router-dom'
import AddMoneyDialog from '../../components/AddMoneyDialog'
import { FilterBar, type FilterField } from '../../components/FilterBar'
import PageHeading from '../../components/UI/heading/PageHeading'
import { useWalletTransactions } from '../../hooks/useWalletBalance'
import { useFastLoading } from '../../hooks/useFastLoading'

interface WalletFilter {
  type?: 'credit' | 'debit' | ''
  reason?: string
  dateFrom?: string
  dateTo?: string
}

const WALLET_DEBIT_FILTER_OPTIONS = [
  { label: 'All Debit Types', value: '' },
  { label: 'B2C Prepaid Charges', value: 'B2C Prepaid Order Payment' },
  { label: 'B2C COD Charges', value: 'B2C COD Service Charges' },
  { label: 'Reverse Shipment', value: 'reverse_shipment' },
  { label: 'Invoice Payment', value: 'invoice_payment' },
  { label: 'Invoice Credits/Waivers', value: 'invoice_credits_waivers' },
  { label: 'Weight Discrepancy', value: 'Weight discrepancy accepted by customer' },
  { label: 'Dispute Rejected', value: 'Dispute rejected by admin' },
]

const BILLING_PAGE_CONFIG: Record<
  string,
  {
    title: string
    subtitle: string
    tableTitle: string
    presetFilters: WalletFilter
    lockType?: boolean
  }
> = {
  '/billing/passbook': {
    title: 'Passbook',
    subtitle: 'View every wallet credit, debit, recharge, refund, and shipment charge in one place.',
    tableTitle: 'Passbook Entries',
    presetFilters: {},
  },
  '/billing/wallet_transactions': {
    title: 'Passbook',
    subtitle: 'View every wallet credit, debit, recharge, refund, and shipment charge in one place.',
    tableTitle: 'Passbook Entries',
    presetFilters: {},
  },
  '/billing/shipping-charges': {
    title: 'Shipping Charges',
    subtitle: 'Review wallet debits for courier charges, COD service fees, reverse shipments, and shipment billing.',
    tableTitle: 'Shipping Charge Entries',
    presetFilters: { type: 'debit' },
    lockType: true,
  },
  '/billing/all-recharges': {
    title: 'All Recharges',
    subtitle: 'Track wallet recharge credits and payment top-ups from the client panel.',
    tableTitle: 'Recharge Entries',
    presetFilters: { type: 'credit', reason: 'wallet recharge' },
    lockType: true,
  },
  '/billing/credit-notes': {
    title: 'Credit Notes',
    subtitle: 'See refund, waiver, credit note, and other credit entries applied to your wallet.',
    tableTitle: 'Credit Note Entries',
    presetFilters: { type: 'credit' },
    lockType: true,
  },
  '/billing/debit-notes': {
    title: 'Debit Notes',
    subtitle: 'See debit note entries, penalties, disputes, and other deductions applied to your wallet.',
    tableTitle: 'Debit Note Entries',
    presetFilters: { type: 'debit' },
    lockType: true,
  },
  '/billing/ledgers': {
    title: 'Ledgers',
    subtitle: 'Audit the full wallet ledger with references, reasons, dates, and order links.',
    tableTitle: 'Ledger Entries',
    presetFilters: {},
  },
}

const WalletTransactions = () => {
  const theme = useTheme()
  const location = useLocation()
  const isDark = theme.palette.mode === 'dark'
  const pageConfig = useMemo(
    () => BILLING_PAGE_CONFIG[location.pathname] || BILLING_PAGE_CONFIG['/billing/passbook'],
    [location.pathname],
  )
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<WalletFilter>(() => pageConfig.presetFilters)
  const [searchParams, setSearchParams] = useSearchParams()
  const rechargeDialogOpen = searchParams.get('recharge') === 'true'

  useEffect(() => {
    setFilters(pageConfig.presetFilters)
    setPage(1)
  }, [pageConfig])

  const setRechargeDialogOpen = (open: boolean) => {
    const nextParams = new URLSearchParams(searchParams)

    if (open) {
      nextParams.set('recharge', 'true')
    } else {
      nextParams.delete('recharge')
    }

    setSearchParams(nextParams, { replace: true })
  }

  const { data, isLoading, isError } = useWalletTransactions({
    limit: 10,
    page,
    type: filters.type || undefined,
    reason: filters.reason || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  })
  const showLoading = useFastLoading(isLoading)

  const transactions = data?.transactions ?? []
  const totalCount = data?.totalCount ?? 0
  const hasNextPage = page * 10 < totalCount
  const surface = isDark ? '#151b23' : '#FFFFFF'
  const borderColor = isDark ? alpha('#f8fafc', 0.1) : '#E2E8F0'
  const cardShadow = isDark ? '0 14px 34px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.06)'

  const filterFields: FilterField[] = []

  if (!pageConfig.lockType) {
    filterFields.push({
      name: 'type',
      label: 'Transaction Type',
      type: 'select',
      options: [
        { label: 'All', value: '' },
        { label: 'Credit', value: 'credit' },
        { label: 'Debit', value: 'debit' },
      ],
    })
  }

  if (filters.type === 'debit' && !pageConfig.lockType) {
    filterFields.push({
      name: 'reason',
      label: 'Debit Type',
      type: 'select',
      options: WALLET_DEBIT_FILTER_OPTIONS,
    })
  }

  filterFields.push(
    { name: 'dateFrom', label: 'From Date', type: 'date' },
    { name: 'dateTo', label: 'To Date', type: 'date' },
  )

  return (
    <>
      <Stack gap={3} p={4}>
      <PageHeading
        eyebrow="Billing Panel"
        title={pageConfig.title}
        subtitle={pageConfig.subtitle}
      />
      {isError && (
        <Alert severity="warning">
          Live wallet transactions are temporarily unavailable. This page remains usable and will update on refresh.
        </Alert>
      )}
      {/* Wallet Balance Card (back to your original solid look) */}
      <Card
        sx={{
          mb: 3,
          backgroundColor: surface,
          border: `1px solid ${borderColor}`,
          borderRadius: 2,
          boxShadow: cardShadow,
        }}
      >
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Current Wallet Balance
          </Typography>
          {showLoading ? (
            <Skeleton variant="text" width={120} height={48} />
          ) : (
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              ₹{Number(data?.wallet?.balance)?.toFixed(2)}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Button
        variant="contained"
        onClick={() => setRechargeDialogOpen(true)}
        sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
      >
        Recharge Wallet
      </Button>

      {/* FilterBar */}

      <FilterBar<WalletFilter>
        fields={filterFields}
        defaultValues={filters}
        onApply={(vals) => {
          setFilters(vals)
          setPage(1) // reset page when filters change
        }}
        loading={showLoading}
      />

      {/* Transaction List */}
      <Paper
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: surface,
          border: `1px solid ${borderColor}`,
          boxShadow: cardShadow,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 3, py: 2, borderBottom: `1px solid ${borderColor}` }}
        >
          <Typography fontWeight={800} color="text.primary">
            {pageConfig.tableTitle}
          </Typography>
          <Chip size="small" label={`${totalCount} entries`} />
        </Stack>
        {showLoading ? (
          <Stack gap={1.5} p={3}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} variant="rectangular" height={60} />
            ))}
          </Stack>
        ) : transactions.length > 0 ? (
          <List disablePadding>
            {transactions.map((txn, idx) => (
              <React.Fragment key={txn.id}>
                <ListItem sx={{ px: 3, py: 2 }}>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          txn.type === 'credit'
                            ? 'rgba(61, 213, 152, 0.1)'
                            : 'rgba(231, 76, 60, 0.1)',
                        color: txn.type === 'credit' ? '#3DD598' : '#E74C3C',
                        border: txn.type === 'credit' ? '1px solid #3DD598' : '1px solid #E74C3C',
                      }}
                    >
                      {txn.type === 'credit' ? <FaArrowDown /> : <FaArrowUp />}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight="medium" fontSize={15} color="text.primary">
                          {txn.reason || 'Transaction'}
                        </Typography>
                        <Chip
                          label={`${txn.type === 'credit' ? '+' : '-'}₹${Number(
                            txn?.amount,
                          ).toFixed(2)}`}
                          size="small"
                          sx={{
                            fontWeight: 'bold',
                            backgroundColor:
                              txn.type === 'credit'
                                ? 'rgba(61, 213, 152, 0.1)'
                                : 'rgba(231, 76, 60, 0.1)',
                            color: txn.type === 'credit' ? '#3DD598' : '#E74C3C',
                            border:
                              txn.type === 'credit' ? '1px solid #3DD598' : '1px solid #E74C3C',
                          }}
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack mt={0.5} gap={0.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {txn.meta?.order_number
                              ? `Order: ${txn.meta.order_number}`
                              : txn.ref
                                ? `Ref: ${txn.ref}`
                                : '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(txn.created_at).toLocaleString()}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {txn.meta?.order_number
                            ? `Breakdown: Freight ₹${Number(txn.meta?.freight_charges || 0).toFixed(2)} | Other ₹${Number(txn.meta?.other_charges || 0).toFixed(2)} | COD ₹${Number(txn.meta?.cod_charges || 0).toFixed(2)}`
                            : ' '}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
                {idx !== transactions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography textAlign="center" p={4} color="text.secondary">
            No entries found.
          </Typography>
        )}
      </Paper>

      {/* Pagination */}
      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button
          variant="outlined"
          disabled={page === 1 || isLoading}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outlined"
          disabled={!hasNextPage || isLoading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </Stack>
      </Stack>
      <AddMoneyDialog
        open={rechargeDialogOpen}
        setOpen={setRechargeDialogOpen}
        currentBalance={Number(data?.wallet?.balance ?? 0)}
      />
    </>
  )
}

export default WalletTransactions
