import { alpha, Box, Button, CircularProgress, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useEffect, useState } from 'react'
import { MdDownload } from 'react-icons/md'
import { useLocation } from 'react-router-dom'
import { fetchOrdersForCsvExport } from '../../api/order.service'
import { FilterBar, type FilterField } from '../../components/FilterBar'
import { toast } from '../../components/UI/Toast'
import CustomDrawer from '../../components/UI/drawer/CustomDrawer'
import B2BOrderForm from '../../components/orders/b2b/B2BOrderForm'
import B2BOrdersList from '../../components/orders/b2b/B2bOrdersList'
import { statusColorMap } from '../../components/orders/b2c/B2COrdersList'
import { downloadClientOrdersCsv } from '../../utils/orderCsvExport'

const b2bStatusQuickFilters = [
  { label: 'All', value: 'all', statuses: undefined, tone: 'primary' },
  { label: 'Pickups & Manifests', value: 'scheduled', statuses: ['pickup_initiated', 'manifest_generated'], tone: 'warning' },
  { label: 'In-Transit', value: 'in_transit', statuses: ['in_transit'], tone: 'warning' },
  { label: 'Out For Delivery', value: 'out_for_delivery', statuses: ['out_for_delivery'], tone: 'warning' },
  { label: 'Delivered', value: 'delivered', statuses: ['delivered'], tone: 'success' },
  { label: 'RTO Intransit', value: 'rto_in_transit', statuses: ['rto_in_transit'], tone: 'warning' },
  { label: 'RTO Delivered', value: 'rto_delivered', statuses: ['rto_delivered'], tone: 'success' },
  { label: 'Undelivered', value: 'undelivered', statuses: ['ndr', 'undelivered', 'failed', 'manifest_failed'], tone: 'error' },
  { label: 'Cancelled', value: 'cancelled', statuses: ['cancelled', 'canceled', 'cancellation_requested'], tone: 'error' },
] as const

const quickFilterTonePalette = {
  primary: { main: '#1D2842', hover: '#152038' },
  success: { main: '#05BD7E', hover: '#049B67' },
  warning: { main: '#F59E0B', hover: '#D97706' },
  error: { main: '#EF4444', hover: '#DC2626' },
} as const

const normalizeStatusFilterValue = (status: unknown) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const normalizeStatusFilter = (status?: string | string[]) =>
  (Array.isArray(status) ? status : status ? [status] : [])
    .map(normalizeStatusFilterValue)
    .filter(Boolean)

const isSameStatusFilter = (
  currentStatus: string | string[] | undefined,
  quickStatuses: readonly string[] | undefined,
) => {
  const current = normalizeStatusFilter(currentStatus).sort()
  const quick = [...(quickStatuses || [])].map(normalizeStatusFilterValue).sort()

  if (current.length !== quick.length) return false
  return current.every((value, index) => value === quick[index])
}

const B2bOrders = () => {
  const location = useLocation()
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [filters, setFilters] = useState<{
    status?: string | string[]
    fromDate?: string
    toDate?: string
    search?: string
  }>({})

  const filterFields: FilterField[] = [
    {
      name: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search by customer, order # etc.',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: Object.keys(statusColorMap).map((s) => ({ label: s, value: s })),
      isAdvanced: true,
    },
    {
      name: 'fromDate',
      label: 'From Date',
      type: 'date',
      placeholder: 'From',
    },
    {
      name: 'toDate',
      label: 'To Date',
      type: 'date',
      placeholder: 'To',
    },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleApplyFilters = (appliedFilters: any) => {
    setFilters(appliedFilters)
    setPage(1)
  }

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isDark = theme.palette.mode === 'dark'
  const surface = isDark ? '#151b23' : '#FFFFFF'
  const borderColor = isDark ? alpha('#f8fafc', 0.12) : alpha('#1D2842', 0.1)
  const textPrimary = isDark ? '#f8fafc' : '#1D2842'
  const textSecondary = isDark ? '#9badc3' : '#64748B'
  const quietSurface = isDark ? alpha('#ffffff', 0.05) : 'rgba(29, 40, 66, 0.04)'
  const activeQuickStatus =
    b2bStatusQuickFilters.find((tab) => isSameStatusFilter(filters.status, tab.statuses))?.value ||
    'custom'

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname, location.search, location.hash])

  const handleCreateB2BOrder = () => {
    setDrawerOpen(true)
  }

  const applyQuickStatusFilter = (tab: (typeof b2bStatusQuickFilters)[number]) => {
    setFilters((previous) => ({
      ...previous,
      status: tab.statuses ? [...tab.statuses] : undefined,
    }))
    setPage(1)
  }

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true)
      const exportRows = await fetchOrdersForCsvExport('b2b', filters)
      downloadClientOrdersCsv(exportRows, 'b2b')
      toast.open({
        message: `${exportRows.length} B2B order${exportRows.length === 1 ? '' : 's'} exported to CSV.`,
        severity: 'success',
      })
    } catch (error) {
      console.error('B2B order CSV export failed:', error)
      toast.open({ message: 'Failed to export B2B orders CSV. Please try again.', severity: 'error' })
    } finally {
      setExportingCsv(false)
    }
  }

  return (
    <Stack spacing={2}>
      {/* Top row: Create button + Filters */}
      <Stack
        direction={isMobile ? 'column' : 'row'}
        alignItems={isMobile ? 'stretch' : 'center'}
        justifyContent="flex-end"
        spacing={isMobile ? 1 : 2}
      >
        <Button
          variant="outlined"
          startIcon={exportingCsv ? <CircularProgress size={14} /> : <MdDownload />}
          onClick={handleExportCsv}
          disabled={exportingCsv}
          fullWidth={isMobile}
        >
          {exportingCsv ? 'Exporting' : 'Export CSV'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateB2BOrder}
          fullWidth={isMobile}
        >
          Create B2B Order
        </Button>
      </Stack>

      <Box
        sx={{
          px: { xs: 0.8, md: 1 },
          py: 0.9,
          border: `1px solid ${borderColor}`,
          borderRadius: 1,
          bgcolor: surface,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            backgroundColor: isDark ? alpha('#ffffff', 0.18) : alpha('#1D2842', 0.18),
          },
        }}
      >
        <Stack direction="row" gap={0.75} sx={{ width: 'max-content', minWidth: '100%' }}>
          {b2bStatusQuickFilters.map((tab) => {
            const selected = activeQuickStatus === tab.value
            const tabTone = quickFilterTonePalette[tab.tone]

            return (
              <Button
                key={tab.value}
                type="button"
                onClick={() => applyQuickStatusFilter(tab)}
                sx={{
                  minHeight: 30,
                  px: 1.15,
                  borderRadius: 1,
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  color: selected ? '#FFFFFF' : textSecondary,
                  bgcolor: selected ? tabTone.main : 'transparent',
                  border: `1px solid ${selected ? tabTone.main : borderColor}`,
                  '&:hover': {
                    bgcolor: selected ? tabTone.hover : quietSurface,
                    borderColor: selected ? tabTone.hover : alpha('#1D2842', 0.2),
                  },
                }}
              >
                <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', color: selected ? '#FFFFFF' : textPrimary }}>
                  {tab.label}
                </Typography>
              </Button>
            )
          })}
        </Stack>
      </Box>

      <FilterBar
        fields={filterFields}
        onApply={handleApplyFilters}
        defaultValues={{
          status: Array.isArray(filters.status) ? filters.status[0] || '' : filters.status || '',
          fromDate: filters.fromDate || '',
          toDate: filters.toDate || '',
          search: filters.search || '',
        }}
        appliedCount={Object.values(filters).filter(Boolean).length}
      />

      <B2BOrdersList
        page={page}
        rowsPerPage={rowsPerPage}
        setPage={setPage}
        setRowsPerPage={setRowsPerPage}
        filters={filters}
      />

      <CustomDrawer
        width={isMobile ? '100%' : 1400}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Create New B2B Order"
      >
        <B2BOrderForm onClose={() => setDrawerOpen(false)} />
      </CustomDrawer>
    </Stack>
  )
}

export default B2bOrders
