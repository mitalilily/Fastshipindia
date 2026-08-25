import { useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  AlertTitle,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import moment from 'moment'
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import {
  MdAssignment,
  MdDelete,
  MdFileDownload,
  MdEdit,
  MdLocalOffer,
  MdMoreHoriz,
  MdReceipt,
  MdInfoOutline,
  MdSync,
  MdTrackChanges,
  MdVisibility,
} from 'react-icons/md'
import { TbDownload, TbFilter, TbPlus, TbRefresh } from 'react-icons/tb'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchOrdersForCsvExport, generateManifestService } from '../../api/order.service'
import {
  useAllOrders,
  useB2BOrdersByUser,
  useB2COrdersByUser,
  useCancelShipment,
  useDeleteB2COrder,
  useRegenerateOrderDocuments,
  useSyncB2CTracking,
} from '../../hooks/Orders/useOrders'
import { usePresignedDownloadMutation } from '../../hooks/Uploads/usePresignedDownloadUrls'
import { downloadClientOrdersCsv } from '../../utils/orderCsvExport'
import type { B2COrder } from '../../types/generic.types'
import { FilterBar, type FilterField } from '../FilterBar'
import { toast } from '../UI/Toast'
import CustomDrawer from '../UI/drawer/CustomDrawer'
import DataTable, { type Column } from '../UI/table/DataTable'
import { statusColorMap } from './b2c/B2COrdersList'
import B2COrderFormSteps, { type B2CFormData } from './b2c/B2COrderForm'
import {
  BULK_MANIFEST_LIMIT,
  downloadFile,
  type DocumentEntry,
  type DocumentType,
  getActionableErrorMessage,
  getB2CManifestIdentifier,
  getB2CManifestProvider,
  getDocumentReference,
  getDownloadFileName,
  isB2CCancelledStatus,
  isB2CManifestEligible,
  summarizeMessages,
  summarizeOrderNumbers,
} from './bulkActionUtils'
import ManifestScheduleDialog, {
  type ManifestSchedulePayload,
} from './ManifestScheduleDialog'
import OrderDetailsDialog from './OrderDetailsDialog'
import B2CSelectCourierDialog from './b2c/B2CSelectCourierDialog'
import { isB2CCancelEligible, isB2CPreShipmentDraft } from './b2c/orderActionRules'
import { getB2COrderFormDefaults } from './b2c/orderFormDefaults'

interface Order {
  id: string | number
  type?: 'b2c' | 'b2b'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

type OrdersFilters = {
  status?: string | string[]
  businessType?: 'b2c' | 'b2b' | string
  paymentType?: string
  courier?: string
  warehouse?: string
  productQuery?: string
  fromDate?: string
  toDate?: string
  search?: string
}

type BulkFeedback = {
  severity: 'info' | 'success' | 'error' | 'warning'
  title: string
  message: string
}

const documentButtonMeta: Record<DocumentType, { label: string; icon: ReactNode }> = {
  label: { label: 'Label', icon: <MdLocalOffer /> },
  invoice: { label: 'Invoice', icon: <MdReceipt /> },
  manifest: { label: 'Manifest', icon: <MdAssignment /> },
}

const getTrackingReference = (order: Order) => {
  const isB2B = String(order.type || order.source_type || '').toLowerCase() === 'b2b'
  const references = isB2B
    ? [order.provider_reference, order.shipment_id, order.awb_number, order.provider_request_id]
    : [order.awb_number, order.shipment_id, order.provider_reference, order.provider_request_id]

  return references.map((value) => String(value || '').trim()).find(Boolean) || ''
}

const B2B_NON_CANCELLABLE_STATUSES = new Set([
  'delivered',
  'rto_delivered',
])

const isB2BProviderCancellationVerified = (order: Order) => {
  const cancellation = order.provider_meta?.cancellation
  return Boolean(
    cancellation &&
      typeof cancellation === 'object' &&
      String(cancellation.provider_verified_at || '').trim(),
  )
}

const isB2BOrder = (order: Order) =>
  String(order.type || order.source_type || order.shipping_mode || '').toLowerCase() === 'b2b'

const isB2BCourierCancelEligible = (order: Order) => {
  if (!isB2BOrder(order)) return false

  const status = String(order.order_status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (B2B_NON_CANCELLABLE_STATUSES.has(status)) return false
  if ((status === 'cancelled' || status === 'canceled') && isB2BProviderCancellationVerified(order)) {
    return false
  }

  return Boolean(
    order.id &&
      (getTrackingReference(order) ||
        order.courier_partner ||
        order.integration_type ||
        order.provider_meta?.shipment ||
        order.provider_meta?.bigship),
  )
}

const actionMenuItemSx = {
  minHeight: 38,
  px: 1.25,
  py: 0.75,
  gap: 0.75,
  color: 'text.primary',
  fontWeight: 400,
  '&:hover': {
    bgcolor: 'rgba(51, 51, 105, 0.06)',
  },
  '&.Mui-disabled': {
    opacity: 0.48,
  },
}

const actionMenuDangerItemSx = {
  ...actionMenuItemSx,
  color: 'error.main',
  '& .MuiListItemIcon-root': {
    color: 'error.main',
  },
}

const actionMenuIconSx = {
  minWidth: 28,
  color: 'text.secondary',
  '& svg': {
    fontSize: 18,
  },
}

const shipNowButtonSx = {
  minWidth: 78,
  minHeight: 31,
  px: 0.9,
  borderRadius: '8px',
  border: '1px solid #C9D6E6',
  background: '#FFFFFF',
  color: '#0B3A78',
  fontSize: 11.4,
  fontWeight: 700,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  boxShadow: '0 8px 18px rgba(11, 58, 120, 0.08)',
  '&:hover': {
    background: '#F6FAFF',
    borderColor: '#9EB4D0',
    boxShadow: '0 10px 22px rgba(11, 58, 120, 0.11)',
  },
  '&.Mui-disabled': {
    borderColor: '#E1E8F0',
    background: '#F8FAFC',
    color: '#8A9AAF',
    boxShadow: 'none',
    opacity: 1,
  },
}

const documentGenerationStatuses = new Set([
  'booked',
  'shipment_created',
  'pickup_initiated',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'ndr',
  'undelivered',
  'rto',
  'rto_in_transit',
  'rto_delivered',
])

const shippingStatusMap: Record<string, string> = {
  pending: 'NEW',
  booked: 'Booked',
  manifest_failed: 'Manifest Failed',
  pickup_initiated: 'Scheduled for Pickup',
  shipment_created: 'Shipment Created',
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
  failed: 'Failed',
  lost: 'Lost',
  processing: 'Processing',
  shipment_booked: 'Shipment Booked',
}

const orderStatusQuickFilters = [
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

type OrderStatusQuickFilter = (typeof orderStatusQuickFilters)[number]

const normalizeOrderStatus = (status: unknown) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const statusChipPalette = {
  success: { color: '#047857', background: '#10B981', border: '#047857' },
  pending: { color: '#B45309', background: '#F59E0B', border: '#B45309' },
  error: { color: '#B91C1C', background: '#EF4444', border: '#B91C1C' },
  info: { color: '#1D4ED8', background: '#3B82F6', border: '#1D4ED8' },
} as const

const quickFilterTonePalette = {
  primary: { main: '#1D2842', hover: '#152038' },
  success: { main: '#05BD7E', hover: '#049B67' },
  warning: { main: '#F59E0B', hover: '#D97706' },
  error: { main: '#EF4444', hover: '#DC2626' },
} as const

const normalizeStatusFilter = (status?: string | string[]) =>
  (Array.isArray(status) ? status : status ? [status] : []).map(normalizeOrderStatus).filter(Boolean)

const isSameStatusFilter = (
  currentStatus: string | string[] | undefined,
  quickStatuses: readonly string[] | undefined,
) => {
  const current = normalizeStatusFilter(currentStatus).sort()
  const quick = [...(quickStatuses || [])].map(normalizeOrderStatus).sort()

  if (current.length !== quick.length) return false
  return current.every((value, index) => value === quick[index])
}

const isManifestEligible = (order: Order) => {
  return order.type === 'b2c' ? isB2CManifestEligible(order) : false
}

const AllOrders = () => {
  const theme = useTheme()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isDark = theme.palette.mode === 'dark'
  const surface = isDark ? '#151b23' : '#FFFFFF'
  const borderColor = isDark ? alpha('#f8fafc', 0.12) : alpha('#1D2842', 0.1)
  const textPrimary = isDark ? '#f8fafc' : '#1D2842'
  const textSecondary = isDark ? '#9badc3' : '#6B7280'
  const quietSurface = isDark ? alpha('#ffffff', 0.05) : 'rgba(29, 40, 66, 0.04)'
  const panelShadow = isDark ? 'none' : '0 6px 18px rgba(29, 40, 66, 0.06)'
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Array<Order['id']>>([])
  const [selectionResetToken, setSelectionResetToken] = useState(0)
  const [downloadingDocumentType, setDownloadingDocumentType] = useState<DocumentType | null>(
    null,
  )
  const [downloadingRowDocument, setDownloadingRowDocument] = useState<string | null>(null)
  const [bulkManifesting, setBulkManifesting] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [manifestScheduleOpen, setManifestScheduleOpen] = useState(false)
  const [selectCourierOrder, setSelectCourierOrder] = useState<Order | null>(null)
  const [orderDetailsOrder, setOrderDetailsOrder] = useState<Order | null>(null)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [orderFormDefaults, setOrderFormDefaults] = useState<Partial<B2CFormData> | null>(null)
  const [orderFormKey, setOrderFormKey] = useState(0)
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(null)
  const [activeActionOrderId, setActiveActionOrderId] = useState<Order['id'] | null>(null)
  const [documentGenerationRef, setDocumentGenerationRef] = useState<string | null>(null)
  const [syncingTrackingOrderId, setSyncingTrackingOrderId] = useState<Order['id'] | null>(null)
  const [bulkFeedback, setBulkFeedback] = useState<BulkFeedback | null>(null)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [filters, setFilters] = useState<OrdersFilters>({
    status: undefined,
    fromDate: undefined,
    toDate: undefined,
    search: undefined,
  })
  const queryClient = useQueryClient()
  const { mutateAsync: presignDownloads } = usePresignedDownloadMutation()
  const { mutateAsync: regenerateDocuments, isPending: regeneratingDocuments } =
    useRegenerateOrderDocuments()
  const { mutate: cancelShipment, isPending: cancellingShipment } = useCancelShipment()
  const { mutateAsync: deleteB2COrder, isPending: deletingB2COrder } = useDeleteB2COrder()
  const { mutate: syncB2CTracking, isPending: syncingTracking } = useSyncB2CTracking()
  const isB2CView = location.pathname.startsWith('/orders/b2c')
  const isB2BView = location.pathname.startsWith('/orders/b2b')
  const currentOrderView: 'all' | 'b2c' | 'b2b' = isB2CView ? 'b2c' : isB2BView ? 'b2b' : 'all'

  const clearSelection = () => {
    setSelectedOrderIds([])
    setSelectionResetToken((current) => current + 1)
  }

  const handleActionMenuOpen = (
    event: MouseEvent<HTMLElement>,
    orderId: Order['id'],
  ) => {
    event.stopPropagation()
    setActionMenuAnchor(event.currentTarget)
    setActiveActionOrderId(orderId)
  }

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null)
    setActiveActionOrderId(null)
  }

  const runActionFromMenu = (
    event: MouseEvent<HTMLElement>,
    action: () => void | Promise<void>,
  ) => {
    event.stopPropagation()
    handleActionMenuClose()
    void action()
  }

  useEffect(() => {
    setManifestScheduleOpen(false)
    setBulkFeedback(null)
    setIsFilterPanelOpen(false)
    setSelectCourierOrder(null)
    setOrderDetailsOrder(null)
    setEditingOrder(null)
    setOrderFormDefaults(null)
    setActionMenuAnchor(null)
    setActiveActionOrderId(null)
    setDocumentGenerationRef(null)
    setSyncingTrackingOrderId(null)
    setSelectedOrderIds([])
    setSelectionResetToken((current) => current + 1)
  }, [location.pathname, location.search, location.hash])

  const urlStatusFilter = searchParams.get('status') || undefined

  useEffect(() => {
    setFilters((prev) => {
      const currentStatus = Array.isArray(prev.status) ? prev.status[0] || undefined : prev.status
      if (currentStatus === urlStatusFilter || (!currentStatus && !urlStatusFilter)) return prev
      return {
        ...prev,
        status: urlStatusFilter,
      }
    })
    setPage(1)
    setSelectedOrderIds([])
    setSelectionResetToken((current) => current + 1)
    setBulkFeedback(null)
  }, [urlStatusFilter])

  const allOrdersQuery = useAllOrders(
    {
      page,
      limit: rowsPerPage,
      ...filters,
    },
    currentOrderView === 'all',
  )

  const b2cOrdersQuery = useB2COrdersByUser(page, rowsPerPage, filters, currentOrderView === 'b2c')
  const b2bOrdersQuery = useB2BOrdersByUser(page, rowsPerPage, filters, currentOrderView === 'b2b')

  const activeQuery =
    currentOrderView === 'b2c'
      ? b2cOrdersQuery
      : currentOrderView === 'b2b'
        ? b2bOrdersQuery
        : allOrdersQuery
  const normalizedOrders: Order[] = (activeQuery.data?.orders ?? []).map((order: Order) => ({
    ...order,
    type: order.type || (currentOrderView === 'b2c' ? 'b2c' : currentOrderView === 'b2b' ? 'b2b' : order.type),
  }))
  const orders: Order[] = normalizedOrders
  const totalCount = activeQuery.data?.totalCount ?? 0
  const activeQuickStatus =
    orderStatusQuickFilters.find((tab) => isSameStatusFilter(filters.status, tab.statuses))?.value ||
    'custom'
  const statusCounts = useMemo(() => {
    return orders.reduce<Record<string, number>>((counts, order) => {
      const status = normalizeOrderStatus(order.order_status)
      if (!status) return counts
      counts[status] = (counts[status] || 0) + 1
      return counts
    }, {})
  }, [orders])
  const selectedOrders: Order[] = orders.filter((order) => selectedOrderIds.includes(order.id))
  const manifestValidationMessage =
    selectedOrders.length === 0
      ? 'Select orders to start a bulk action.'
      : selectedOrders.length > BULK_MANIFEST_LIMIT
        ? `You can manifest a maximum of ${BULK_MANIFEST_LIMIT} orders at a time.`
        : selectedOrders.some((order) => !isManifestEligible(order))
          ? 'Some selected orders are not ready for manifest yet.'
          : ''

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true)
      const exportRows = await fetchOrdersForCsvExport(currentOrderView, filters)
      downloadClientOrdersCsv(exportRows, currentOrderView)
      toast.open({
        message: `${exportRows.length} order${exportRows.length === 1 ? '' : 's'} exported to CSV.`,
        severity: 'success',
      })
    } catch (error) {
      console.error('Order CSV export failed:', error)
      toast.open({ message: 'Failed to export orders CSV. Please try again.', severity: 'error' })
    } finally {
      setExportingCsv(false)
    }
  }

  const openBulkManifestSchedule = () => {
    if (!selectedOrders.length) {
      const message = 'Select up to 5 eligible orders to manifest.'
      setBulkFeedback({
        severity: 'error',
        title: 'No orders selected',
        message,
      })
      toast.open({ message, severity: 'error' })
      return
    }

    if (manifestValidationMessage) {
      setBulkFeedback({
        severity: 'error',
        title: 'Manifest unavailable',
        message: manifestValidationMessage,
      })
      toast.open({ message: manifestValidationMessage, severity: 'error' })
      return
    }

    setManifestScheduleOpen(true)
  }

  const handleBulkManifest = async (schedule: ManifestSchedulePayload) => {
    if (!selectedOrders.length) {
      const message = 'Select up to 5 eligible orders to manifest.'
      setBulkFeedback({
        severity: 'error',
        title: 'No orders selected',
        message,
      })
      toast.open({ message, severity: 'error' })
      return
    }

    if (manifestValidationMessage) {
      setBulkFeedback({
        severity: 'error',
        title: 'Manifest unavailable',
        message: manifestValidationMessage,
      })
      toast.open({ message: manifestValidationMessage, severity: 'error' })
      return
    }

    setBulkManifesting(true)
    setBulkFeedback({
      severity: 'info',
      title: 'Manifest in progress',
      message: `Processing ${selectedOrders.length} selected order(s).`,
    })

    try {
      const b2cManifestGroups = selectedOrders.reduce<Record<string, Order[]>>((groups, order) => {
        if (order.type !== 'b2c') return groups

        const manifestIdentifier = getB2CManifestIdentifier(order)
        if (!manifestIdentifier) return groups

        const providerKey = getB2CManifestProvider(order)
        if (!groups[providerKey]) groups[providerKey] = []
        groups[providerKey].push(order)
        return groups
      }, {})

      const failedOrders: Order[] = []
      const failureReasons: string[] = []
      const warningMessages: string[] = []
      let successCount = 0

      for (const [providerKey, providerOrders] of Object.entries(b2cManifestGroups)) {
        const identifiers = providerOrders
          .map((order) => getB2CManifestIdentifier(order))
          .filter((value): value is string => Boolean(value))

        if (!identifiers.length) continue

        try {
          const response = await generateManifestService({
            awbs: identifiers,
            type: 'b2c',
            ...schedule,
          })
          successCount += providerOrders.length
          if (response.warnings?.length) {
            warningMessages.push(...response.warnings)
          }
        } catch (error) {
          console.error('Bulk manifest provider batch failed:', error)
          failedOrders.push(...providerOrders)
          failureReasons.push(
            `${providerKey}: ${getActionableErrorMessage(
              error,
              'Manifest could not be completed for this batch.',
            )}`,
          )
        }
      }

      if (successCount > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['b2cOrdersByUser'] }),
          queryClient.invalidateQueries({ queryKey: ['orders'] }),
        ])
      }

      if (failedOrders.length > 0) {
        const failedOrderIds = failedOrders.map((order) => order.id)
        const failedOrderNumbers = summarizeOrderNumbers(
          failedOrders.map((order) => order.order_number || order.id),
        )
        const message =
          successCount > 0
            ? `Completed ${successCount} order(s). Failed for ${failedOrders.length}: ${failedOrderNumbers}. ${failureReasons.join(' ')}`
            : `Failed for ${failedOrders.length} order(s): ${failedOrderNumbers}. ${failureReasons.join(' ')}`
        const warningSummary = summarizeMessages(warningMessages)
        const finalMessage = warningSummary ? `${message} ${warningSummary}` : message

        setSelectedOrderIds(failedOrderIds)
        setBulkFeedback({
          severity: successCount > 0 ? 'warning' : 'error',
          title: successCount > 0 ? 'Manifest partially completed' : 'Manifest failed',
          message: finalMessage,
        })
        toast.open({ message: finalMessage, severity: 'error' })
        return
      }

      const successMessage = `Manifest completed for ${successCount} order(s).`
      const warningSummary = summarizeMessages(warningMessages)
      if (warningSummary) {
        const warningMessage = `${successMessage} ${warningSummary}`
        setBulkFeedback({
          severity: 'warning',
          title: 'Manifest completed with warnings',
          message: warningMessage,
        })
        toast.open({ message: warningMessage, severity: 'info' })
        clearSelection()
        return
      }
      setBulkFeedback({
        severity: 'success',
        title: 'Manifest completed',
        message: successMessage,
      })
      toast.open({ message: successMessage, severity: 'success' })
      clearSelection()
    } finally {
      setBulkManifesting(false)
    }
  }

  const handleManifestScheduleConfirm = async (schedule: ManifestSchedulePayload) => {
    await handleBulkManifest(schedule)
    setManifestScheduleOpen(false)
  }

  const selectedDelhiveryOrders = selectedOrders.filter(
    (order) => order.type === 'b2c' && getB2CManifestProvider(order) === 'deliveryone',
  )
  const showManifestShipmentCount = selectedDelhiveryOrders.length > 0
  const defaultManifestShipmentCount = Math.max(
    1,
    selectedDelhiveryOrders.length || selectedOrders.length,
  )

  const getDocumentEntriesForOrders = (targetOrders: Order[], type: DocumentType) =>
    targetOrders.reduce<DocumentEntry[]>((entries, order) => {
      const { key, url } = getDocumentReference(order, type)
      if (!key && !url) return entries

      const source = key || url
      entries.push({
        key,
        url,
        fileName: getDownloadFileName(order, type, source),
      })
      return entries
    }, [])

  const downloadDocumentEntries = async (documentEntries: DocumentEntry[]) => {
    const uniqueEntries = Array.from(
      new Map<string, DocumentEntry>(
        documentEntries.map((entry) => [entry.key || entry.url || entry.fileName, entry]),
      ).values(),
    )

    const keyEntries = uniqueEntries.filter(
      (entry): entry is DocumentEntry & { key: string } => Boolean(entry.key),
    )
    const directEntries = uniqueEntries.filter(
      (entry): entry is DocumentEntry & { url: string } => !entry.key && Boolean(entry.url),
    )
    const presignedUrls = keyEntries.length
      ? await presignDownloads({ keys: keyEntries.map((entry) => String(entry.key)) })
      : []

    let downloadedCount = 0
    let skippedCount = documentEntries.length - uniqueEntries.length

    for (const entry of directEntries) {
      await downloadFile(String(entry.url), entry.fileName)
      downloadedCount += 1
    }

    for (const [index, entry] of keyEntries.entries()) {
      const resolvedUrl = Array.isArray(presignedUrls) ? presignedUrls[index] : null
      if (!resolvedUrl) {
        skippedCount += 1
        continue
      }

      await downloadFile(resolvedUrl, entry.fileName)
      downloadedCount += 1
    }

    return { downloadedCount, skippedCount }
  }

  const handleBulkDownload = async (type: DocumentType) => {
    const typeLabel = documentButtonMeta[type].label
    const typePlural = `${typeLabel.toLowerCase()}s`

    if (!selectedOrders.length) {
      const message = 'Select at least one order to download documents.'
      setBulkFeedback({
        severity: 'error',
        title: 'No orders selected',
        message,
      })
      toast.open({ message, severity: 'error' })
      return
    }

    setDownloadingDocumentType(type)
    setBulkFeedback({
      severity: 'info',
      title: `Downloading ${typePlural}`,
      message: `Preparing ${selectedOrders.length} selected order(s) for ${typeLabel.toLowerCase()} download.`,
    })

    try {
      const documentEntries = getDocumentEntriesForOrders(selectedOrders, type)

      if (!documentEntries.length) {
        const message = `No ${typeLabel.toLowerCase()} files are available for the selected orders.`
        setBulkFeedback({
          severity: 'error',
          title: `No ${typeLabel.toLowerCase()} files found`,
          message,
        })
        toast.open({ message, severity: 'error' })
        return
      }

      const { downloadedCount, skippedCount } = await downloadDocumentEntries(documentEntries)

      if (!downloadedCount) {
        const message = `No ${typeLabel.toLowerCase()} files could be downloaded for the selected orders.`
        setBulkFeedback({
          severity: 'error',
          title: `${typeLabel} download failed`,
          message,
        })
        toast.open({ message, severity: 'error' })
        return
      }

      const summaryMessage =
        skippedCount > 0
          ? `Downloaded ${downloadedCount} ${typeLabel.toLowerCase()} file(s). Skipped ${skippedCount} missing or duplicate file(s).`
          : `Downloaded ${downloadedCount} ${typeLabel.toLowerCase()} file(s).`

      setBulkFeedback({
        severity: skippedCount > 0 ? 'warning' : 'success',
        title:
          skippedCount > 0
            ? `${typeLabel} download completed with skips`
            : `${typeLabel} download completed`,
        message: summaryMessage,
      })
      toast.open({ message: summaryMessage, severity: skippedCount > 0 ? 'info' : 'success' })
    } catch (error) {
      console.error(`Bulk ${type} download failed:`, error)
      const message = getActionableErrorMessage(
        error,
        `Failed to download selected ${typeLabel.toLowerCase()} files. Please try again.`,
      )
      setBulkFeedback({
        severity: 'error',
        title: `${typeLabel} download failed`,
        message,
      })
      toast.open({ message, severity: 'error' })
    } finally {
      setDownloadingDocumentType(null)
    }
  }

  const handleSingleDocumentDownload = async (order: Order, type: DocumentType) => {
    const typeLabel = documentButtonMeta[type].label
    const rowDownloadKey = `${order.id}-${type}`

    try {
      setDownloadingRowDocument(rowDownloadKey)
      const documentEntries = getDocumentEntriesForOrders([order], type)

      if (!documentEntries.length) {
        toast.open({
          message: `${typeLabel} is not available for ${order.order_number || 'this order'} yet.`,
          severity: 'error',
        })
        return
      }

      const { downloadedCount } = await downloadDocumentEntries(documentEntries)

      if (!downloadedCount) {
        toast.open({
          message: `${typeLabel} could not be downloaded for ${order.order_number || 'this order'}.`,
          severity: 'error',
        })
        return
      }

      toast.open({
        message: `${typeLabel} downloaded for ${order.order_number || 'this order'}.`,
        severity: 'success',
      })
    } catch (error) {
      console.error(`${typeLabel} download failed:`, error)
      const message = getActionableErrorMessage(
        error,
        `Failed to download ${typeLabel.toLowerCase()} for ${order.order_number || 'this order'}. Please try again.`,
      )
      toast.open({ message, severity: 'error' })
    } finally {
      setDownloadingRowDocument(null)
    }
  }

  const formatCurrency = (value?: number | string | null, decimals = 0) =>
    `Rs ${Number(value ?? 0).toFixed(decimals)}`

  const hasDocument = (order: Order, type: DocumentType) => {
    const { key, url } = getDocumentReference(order, type)
    return Boolean(key || url)
  }

  const isCourierSelectionPending = (order: Order) => {
    return order.type === 'b2c' && isB2CPreShipmentDraft(order)
  }

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

  const getOrderProducts = (row: Order): Array<Record<string, unknown>> => {
    const rawProducts: unknown = row.products
    if (Array.isArray(rawProducts)) return rawProducts as Array<Record<string, unknown>>
    if (typeof rawProducts === 'string') {
      try {
        const parsedProducts: unknown = JSON.parse(rawProducts)
        return Array.isArray(parsedProducts) ? (parsedProducts as Array<Record<string, unknown>>) : []
      } catch {
        return []
      }
    }
    return []
  }

  const getProductName = (row: Order) => {
    const products = getOrderProducts(row)
    const firstProduct = products[0]
    const rawName = String(firstProduct?.productName ?? firstProduct?.name ?? firstProduct?.box_name ?? '').trim()
    if (!rawName) return '-'
    return products.length > 1 ? `${rawName} +${products.length - 1}` : rawName
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

  const getPickupDetails = (row: Order) => parseMaybeJsonObject(row.pickup_details)

  const getPickupAddressName = (row: Order) => {
    const pickup = getPickupDetails(row)
    return String(pickup.warehouse_name || pickup.name || row.pickup_location_name || row.pickup_location_id || '-').trim() || '-'
  }

  const getSenderName = (row: Order) => {
    const pickup = getPickupDetails(row)
    return String(
      pickup.warehouse_name ||
        pickup.name ||
        pickup.company_name ||
        row.seller_name ||
        row.merchantName ||
        row.merchant_name ||
        getPickupAddressName(row),
    ).trim() || '-'
  }

  const getSenderPhone = (row: Order) => {
    const pickup = getPickupDetails(row)
    return String(pickup.phone || pickup.mobile || pickup.contact_number || row.seller_phone || row.merchantPhone || '').trim()
  }

  const getReceiverName = (row: Order) => String(row.buyer_name || row.company_name || row.receiver_name || '-').trim() || '-'

  const getReceiverPhone = (row: Order) => String(row.buyer_phone || row.receiver_phone || '').trim()

  const joinPartyAddress = (...parts: unknown[]) =>
    parts
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(', ')

  const getSenderAddress = (row: Order) => {
    const pickup = getPickupDetails(row)
    return (
      joinPartyAddress(
        pickup.address || row.pickup_address,
        pickup.city || row.pickup_city,
        pickup.state || row.pickup_state,
        pickup.pincode || row.pickup_pincode,
      ) || '-'
    )
  }

  const getReceiverAddress = (row: Order) =>
    joinPartyAddress(row.address || row.receiver_address, row.city, row.state, row.country, row.pincode) || '-'

  const renderPartyDetails = ({
    name,
    phone,
    address,
  }: {
    name?: string | null
    phone?: string | null
    address?: string | null
  }) => {
    const displayName = String(name || '-').trim() || '-'
    const displayPhone = String(phone || '-').trim() || '-'
    const displayAddress = String(address || '-').trim() || '-'

    return (
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.45} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography sx={{ maxWidth: '100%', minWidth: 0, fontSize: 12.1, fontWeight: 600, color: 'text.primary', lineHeight: 1.28 }} noWrap>
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

  const getInvoiceDetails = (row: Order) => {
    const rawInvoices: unknown = row.invoices || row.invoice_details
    let firstInvoice: Record<string, unknown> = {}
    if (Array.isArray(rawInvoices)) {
      firstInvoice = (rawInvoices[0] || {}) as Record<string, unknown>
    } else if (typeof rawInvoices === 'string') {
      try {
        const parsed: unknown = JSON.parse(rawInvoices)
        firstInvoice = Array.isArray(parsed)
          ? ((parsed[0] || {}) as Record<string, unknown>)
          : parsed && typeof parsed === 'object'
            ? (parsed as Record<string, unknown>)
            : {}
      } catch {
        firstInvoice = {}
      }
    } else if (rawInvoices && typeof rawInvoices === 'object') {
      firstInvoice = rawInvoices as Record<string, unknown>
    }

    const invoiceNumber = String(
      firstInvoice.invoiceNumber ||
        firstInvoice.invoice_number ||
        firstInvoice.invoiceNo ||
        row.invoice_number ||
        row.invoice_no ||
        '-',
    ).trim() || '-'
    const amount = (firstInvoice.invoiceValue ??
      firstInvoice.invoice_amount ??
      firstInvoice.amount ??
      row.order_amount) as number | string | null | undefined
    return { invoiceNumber, amount }
  }

  const getOrderTypeLabel = (row: Order) =>
    `Domestic - ${String(row.type || row.source_type || row.shipping_mode || 'B2C').toUpperCase()}`

  const getPickedUpAt = (row: Order) =>
    row.picked_up_at || row.pickup_date || row.pickup_time || row.provider_picked_up_at || row.pickup_details?.picked_up_at

  const getChargedWeight = (row: Order) =>
    row.charged_weight ?? row.selected_max_slab_weight ?? row.chargeable_weight ?? row.volumetric_weight ?? row.weight

  const getDisplayStatusLabel = (status?: string | null) => {
    const normalizedStatus = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    return shippingStatusMap[normalizedStatus] || status || 'Unknown'
  }

  const getStatusChipSx = (status?: string | null) => {
    const normalizedStatus = normalizeOrderStatus(status)
    const tone = statusColorMap[normalizedStatus] || 'info'
    const palette = statusChipPalette[tone]

    return {
      color: palette.color,
      bgcolor: alpha(palette.background, 0.12),
      border: `1px solid ${alpha(palette.border, 0.36)}`,
    }
  }

  const isDocumentGenerationReady = (row: Order) => {
    const normalizedStatus = String(row.order_status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    return (
      Boolean(String(row.manifest_key || row.manifest || row.awb_number || '').trim()) ||
      documentGenerationStatuses.has(normalizedStatus)
    )
  }

  const openSingleManifestSchedule = (order: Order) => {
    if (!isManifestEligible(order)) {
      toast.open({ message: 'Generate manifest is not available for this order yet.', severity: 'info' })
      return
    }

    setSelectedOrderIds([order.id])
    setBulkFeedback(null)
    setManifestScheduleOpen(true)
  }

  const handleGenerateOrderDocument = async (order: Order, type: 'label' | 'invoice') => {
    const orderId = String(order.id || '').trim()
    if (!orderId) {
      toast.open({ message: 'Order identifier is not available.', severity: 'error' })
      return
    }

    if (!isDocumentGenerationReady(order)) {
      toast.open({
        message: 'Generate the manifest before creating label or invoice documents.',
        severity: 'info',
      })
      return
    }

    const documentRef = `${order.id}-${type}`
    try {
      setDocumentGenerationRef(documentRef)
      await regenerateDocuments({
        orderId,
        regenerateLabel: type === 'label',
        regenerateInvoice: type === 'invoice',
      })
    } catch (error) {
      console.error(`Failed to regenerate ${type} for order:`, order.order_number, error)
    } finally {
      setDocumentGenerationRef((current) => (current === documentRef ? null : current))
    }
  }

  const handleTrackShipment = (order: Order) => {
    const trackingReference = getTrackingReference(order)
    if (!trackingReference) {
      toast.open({ message: 'Tracking reference is not available yet.', severity: 'info' })
      return
    }

    navigate(`/tools/order_tracking?awb=${encodeURIComponent(trackingReference)}`)
  }

  const getQuickStatusCount = (tab: OrderStatusQuickFilter) => {
    if (!tab.statuses || tab.value === activeQuickStatus) return totalCount
    return tab.statuses.reduce((sum, status) => sum + (statusCounts[normalizeOrderStatus(status)] || 0), 0)
  }

  const applyQuickStatusFilter = (tab: OrderStatusQuickFilter) => {
    setFilters((previous) => ({
      ...previous,
      status: tab.statuses ? [...tab.statuses] : undefined,
    }))
    setPage(1)
    clearSelection()
    setBulkFeedback(null)
  }

  const handleSyncLiveStatus = (order: Order) => {
    const orderId = String(order.id || '').trim()
    if (!orderId) {
      toast.open({ message: 'Order identifier is not available.', severity: 'error' })
      return
    }

    if (!getTrackingReference(order)) {
      toast.open({ message: 'Tracking reference is not available yet.', severity: 'info' })
      return
    }

    setSyncingTrackingOrderId(order.id)
    syncB2CTracking(orderId, {
      onSettled: () => {
      setSyncingTrackingOrderId((current) => (current === order.id ? null : current))
      },
    })
  }

  const handleEditB2COrder = (order: Order) => {
    if (order.type !== 'b2c' || !isB2CPreShipmentDraft(order)) {
      toast.open({
        message: 'Only draft B2C orders that have not been shipped yet can be edited.',
        severity: 'warning',
      })
      return
    }

    setEditingOrder(order)
    setOrderFormDefaults(getB2COrderFormDefaults(order as B2COrder))
    setOrderFormKey((current) => current + 1)
  }

  const handleDeleteB2COrder = async (order: Order) => {
    if (order.type !== 'b2c' || !isB2CPreShipmentDraft(order)) {
      toast.open({
        message: 'Only draft B2C orders that have not been shipped yet can be deleted.',
        severity: 'warning',
      })
      return
    }

    const confirmed = window.confirm(
      `Delete draft order ${order.order_number || order.id}? This cannot be undone.`,
    )
    if (!confirmed) return

    try {
      await deleteB2COrder(String(order.id))
    } catch (error) {
      console.error('Draft order delete failed:', error)
    }
  }

  const columns: Column<Order>[] = [
    {
      id: 'order_number',
      label: 'LRN / AWB',
      minWidth: 230,
      truncate: false,
      render: (_v, row) => (
        <Stack spacing={0.35} sx={{ minWidth: 0, maxWidth: 218, pr: 1 }}>
          <Typography
            component="button"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setOrderDetailsOrder(row)
            }}
            sx={{
              all: 'unset',
              maxWidth: '100%',
              cursor: 'pointer',
              color: '#05BD7E',
              fontSize: 12.2,
              fontWeight: 600,
              lineHeight: 1.25,
              '&:hover': { textDecoration: 'underline' },
              '&:focus-visible': {
                outline: '2px solid rgba(5, 189, 126, 0.35)',
                outlineOffset: '2px',
                borderRadius: '4px',
              },
            }}
            noWrap
          >
            {getTrackingReference(row) || row.order_number || '-'}
          </Typography>
          <Typography sx={{ maxWidth: '100%', fontSize: 10.7, color: 'text.secondary', lineHeight: 1.25 }} noWrap>
            Created: {formatOrderDateTime(row.created_at || row.order_date)}
          </Typography>
          <Typography sx={{ maxWidth: '100%', fontSize: 10.7, color: 'text.primary', lineHeight: 1.25 }} noWrap>
            Picked Up: {formatOrderDateTime(getPickedUpAt(row))}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'awb_number',
      label: 'Order Type',
      minWidth: 144,
      truncate: false,
      render: (_value, row) => (
        <Chip
          label={getOrderTypeLabel(row)}
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
      id: 'products',
      label: 'Product Details',
      minWidth: 132,
      truncate: false,
      render: (_value, row) => {
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
      id: 'buyer_phone',
      minWidth: 150,
      truncate: false,
      render: (_value, row) => (
        renderPartyDetails({
          name: getReceiverName(row),
          phone: getReceiverPhone(row),
          address: getReceiverAddress(row),
        })
      ),
    },
    {
      label: 'Charged Weight',
      id: 'weight',
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
      render: (_value, row) => (
        <Typography sx={{ maxWidth: '100%', fontSize: 11.2, color: 'text.secondary', lineHeight: 1.3 }} noWrap>
          {formatOrderDateTime(row.updated_at || row.order_date)}
        </Typography>
      ),
    },
    {
      label: 'Status',
      id: 'order_status',
      minWidth: 160,
      truncate: false,
      render: (_value, row) => (
        <Chip
          label={getDisplayStatusLabel(row.order_status)}
          size="small"
          sx={{
            height: 25,
            minWidth: 74,
            maxWidth: '100%',
            borderRadius: '999px',
            ...getStatusChipSx(row.order_status),
            '& .MuiChip-label': {
              px: 0.7,
              fontSize: 10,
              fontWeight: 600,
            },
          }}
        />
      ),
    },
    {
      label: 'Action',
      id: 'id',
      minWidth: 160,
      truncate: false,
      render: (_v, row) => {
        const orderStatus = String(row.order_status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
        const canManifest = isManifestEligible(row)
        const isCancelled = isB2CCancelledStatus(orderStatus)
        const isDocumentReady = isDocumentGenerationReady(row)
        const isLabelGenerating = documentGenerationRef === `${row.id}-label`
        const isInvoiceGenerating = documentGenerationRef === `${row.id}-invoice`
        const isLabelDownloading = downloadingRowDocument === `${row.id}-label`
        const isInvoiceDownloading = downloadingRowDocument === `${row.id}-invoice`
        const isManifestDownloading = downloadingRowDocument === `${row.id}-manifest`
        const canDownloadLabel = hasDocument(row, 'label')
        const canDownloadInvoice = hasDocument(row, 'invoice')
        const canDownloadManifest = hasDocument(row, 'manifest')
        const isMenuOpen = activeActionOrderId === row.id && Boolean(actionMenuAnchor)
        const canSelectCourier = isCourierSelectionPending(row)
        const canEditDraft = row.type === 'b2c' && isB2CPreShipmentDraft(row)
        const trackingReference = getTrackingReference(row)
        const isSyncingThisOrder = syncingTracking && syncingTrackingOrderId === row.id

        const renderActionItem = ({
          key,
          icon,
          label,
          onClick,
          disabled = false,
          loading = false,
          danger = false,
        }: {
          key: string
          icon: ReactNode
          label: string
          onClick: () => void | Promise<void>
          disabled?: boolean
          loading?: boolean
          danger?: boolean
        }) => (
          <MenuItem
            key={key}
            disabled={disabled || loading}
            onClick={(event) => runActionFromMenu(event, onClick)}
            sx={danger ? actionMenuDangerItemSx : actionMenuItemSx}
          >
            <ListItemIcon sx={danger ? { ...actionMenuIconSx, color: 'error.main' } : actionMenuIconSx}>
              {loading ? <CircularProgress size={16} /> : icon}
            </ListItemIcon>
            <ListItemText
              primary={label}
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
            />
          </MenuItem>
        )

        return (
          <Stack direction="row" alignItems="center" spacing={0.55} sx={{ minWidth: 0 }}>
            <Button
              size="small"
              variant="contained"
              onClick={(event) => {
                event.stopPropagation()
                setSelectCourierOrder(row)
              }}
              disabled={isCancelled || !canSelectCourier}
              sx={shipNowButtonSx}
            >
              Ship Now
            </Button>
            <Tooltip title="More actions" arrow>
              <IconButton
                size="small"
                onClick={(event) => handleActionMenuOpen(event, row.id)}
                aria-haspopup="menu"
                aria-label={`Actions for ${row.order_number || 'order'}`}
                aria-expanded={isMenuOpen ? 'true' : undefined}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  color: '#FFFFFF',
                  bgcolor: isMenuOpen ? '#5F646D' : '#7C818A',
                  '&:hover': {
                    bgcolor: '#5F646D',
                  },
                }}
              >
                <MdMoreHoriz size={22} />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={actionMenuAnchor}
              open={isMenuOpen}
              onClose={handleActionMenuClose}
              onClick={(event) => event.stopPropagation()}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 0.75,
                    minWidth: 238,
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? alpha('#f8fafc', 0.12) : alpha('#0D1B4D', 0.12)}`,
                    background: surface,
                    boxShadow: isDark
                      ? `0 18px 38px ${alpha('#000000', 0.35)}`
                      : `0 18px 38px ${alpha('#0D1B4D', 0.18)}`,
                    overflow: 'hidden',
                  },
                },
                list: {
                  dense: true,
                  sx: { py: 0.55 },
                },
              }}
            >
              {renderActionItem({
                key: 'view-details',
                icon: <MdVisibility />,
                label: 'View Details',
                onClick: () => setOrderDetailsOrder(row),
              })}
              {canEditDraft &&
                renderActionItem({
                  key: 'edit-order',
                  icon: <MdEdit />,
                  label: 'Edit Order',
                  onClick: () => handleEditB2COrder(row),
                })}
              {canEditDraft &&
                renderActionItem({
                  key: 'delete-order',
                  icon: <MdDelete />,
                  label: deletingB2COrder ? 'Deleting Order' : 'Delete Order',
                  onClick: () => handleDeleteB2COrder(row),
                  loading: deletingB2COrder,
                  danger: true,
                })}
              {renderActionItem({
                key: 'generate-manifest',
                icon: <MdAssignment />,
                label: bulkManifesting ? 'Generating Manifest' : 'Generate Manifest',
                onClick: () => openSingleManifestSchedule(row),
                disabled: !canManifest || bulkManifesting,
                loading: canManifest && bulkManifesting,
              })}
              {renderActionItem({
                key: 'regenerate-label',
                icon: <MdLocalOffer />,
                label: isLabelGenerating ? 'Regenerating Label' : 'Regenerate Label',
                onClick: () => handleGenerateOrderDocument(row, 'label'),
                disabled:
                  isCancelled ||
                  !isDocumentReady ||
                  regeneratingDocuments ||
                  Boolean(documentGenerationRef),
                loading: isLabelGenerating,
              })}
              {renderActionItem({
                key: 'regenerate-invoice',
                icon: <MdReceipt />,
                label: isInvoiceGenerating ? 'Regenerating Invoice' : 'Regenerate Invoice',
                onClick: () => handleGenerateOrderDocument(row, 'invoice'),
                disabled:
                  isCancelled ||
                  !isDocumentReady ||
                  regeneratingDocuments ||
                  Boolean(documentGenerationRef),
                loading: isInvoiceGenerating,
              })}
              <Divider sx={{ my: 0.45 }} />
              {renderActionItem({
                key: 'download-label',
                icon: <MdFileDownload />,
                label: 'Download Label',
                onClick: () => handleSingleDocumentDownload(row, 'label'),
                disabled: !canDownloadLabel || Boolean(downloadingDocumentType) || Boolean(downloadingRowDocument),
                loading: isLabelDownloading,
              })}
              {renderActionItem({
                key: 'download-invoice',
                icon: <MdFileDownload />,
                label: 'Download Invoice',
                onClick: () => handleSingleDocumentDownload(row, 'invoice'),
                disabled: !canDownloadInvoice || Boolean(downloadingDocumentType) || Boolean(downloadingRowDocument),
                loading: isInvoiceDownloading,
              })}
              {renderActionItem({
                key: 'download-manifest',
                icon: <MdFileDownload />,
                label: 'Download Manifest',
                onClick: () => handleSingleDocumentDownload(row, 'manifest'),
                disabled: !canDownloadManifest || Boolean(downloadingDocumentType) || Boolean(downloadingRowDocument),
                loading: isManifestDownloading,
              })}
              <Divider sx={{ my: 0.45 }} />
              {renderActionItem({
                key: 'cancel-shipment',
                icon: <MdDelete />,
                label: cancellingShipment ? 'Cancelling Shipment' : 'Cancel Shipment',
                onClick: () => cancelShipment(String(row.id)),
                disabled:
                  !(
                    (row.type === 'b2c' && isB2CCancelEligible(row)) ||
                    isB2BCourierCancelEligible(row)
                  ) || cancellingShipment,
                loading: cancellingShipment,
                danger: true,
              })}
              {renderActionItem({
                key: 'track-shipment',
                icon: <MdTrackChanges />,
                label: 'Track Shipment',
                onClick: () => handleTrackShipment(row),
                disabled: !trackingReference,
              })}
              {renderActionItem({
                key: 'sync-live-status',
                icon: <MdSync />,
                label: isSyncingThisOrder ? 'Syncing Live Status' : 'Sync Live Status',
                onClick: () => handleSyncLiveStatus(row),
                disabled: !trackingReference || syncingTracking,
                loading: isSyncingThisOrder,
              })}
            </Menu>
          </Stack>
        )
      },
    },
  ]

  const filterFields: FilterField[] = [
    {
      name: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Order #, AWB, buyer, phone, city or pincode',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: Object.keys(statusColorMap).map((status) => ({
        label: status,
        value: status,
      })),
    },
    {
      name: 'paymentType',
      label: 'Payment Type',
      type: 'select',
      placeholder: 'All payment types',
      options: [
        { label: 'Prepaid', value: 'prepaid' },
        { label: 'Cash on Delivery', value: 'cod' },
      ],
    },
    ...(currentOrderView === 'all'
      ? [
          {
            name: 'businessType',
            label: 'Order Type',
            type: 'select' as const,
            placeholder: 'B2C and B2B',
            options: [
              { label: 'B2C', value: 'b2c' },
              { label: 'B2B', value: 'b2b' },
            ],
            isAdvanced: true,
          },
        ]
      : []),
    {
      name: 'courier',
      label: 'Courier',
      type: 'text',
      placeholder: 'Courier name or ID',
      isAdvanced: true,
    },
    {
      name: 'warehouse',
      label: 'Pickup Warehouse',
      type: 'text',
      placeholder: 'Warehouse name',
      isAdvanced: true,
    },
    {
      name: 'productQuery',
      label: 'Product / SKU',
      type: 'text',
      placeholder: 'Product name or SKU',
      isAdvanced: true,
    },
    { name: 'fromDate', label: 'From Date', type: 'date', placeholder: 'YYYY-MM-DD', isAdvanced: true },
    { name: 'toDate', label: 'To Date', type: 'date', placeholder: 'YYYY-MM-DD', isAdvanced: true },
  ]

  const activeFilterCount = Object.values(filters).filter((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(String(value || '').trim()),
  ).length

  return (
    <Stack gap={0.8}>
      {activeQuery.isError && (
        <Alert severity="warning">
          Live orders are temporarily unavailable. The table remains open and will update on the next refresh.
        </Alert>
      )}
      <Box
        sx={{
          backgroundColor: surface,
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          boxShadow: panelShadow,
          overflow: 'hidden',
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          alignItems={{ xs: 'flex-start', lg: 'center' }}
          justifyContent="space-between"
          gap={0.75}
          sx={{
            px: { xs: 1.15, md: 1.5 },
            py: 0.75,
            borderBottom: `1px solid ${borderColor}`,
            bgcolor: surface,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: textPrimary,
              fontSize: '17px',
            }}
          >
            Orders Management
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<TbRefresh size={16} />}
              onClick={() => activeQuery.refetch()}
              disabled={activeQuery.isRefetching}
              sx={{ borderRadius: 1, minHeight: 34, fontSize: 12 }}
            >
              {activeQuery.isRefetching ? 'Refreshing' : 'Refresh'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<TbFilter size={16} />}
              onClick={() => setIsFilterPanelOpen((open) => !open)}
              aria-expanded={isFilterPanelOpen}
              color={activeFilterCount ? 'primary' : 'inherit'}
              sx={{ borderRadius: 1, minHeight: 34, fontSize: 12 }}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button
              variant="outlined"
              startIcon={<MdTrackChanges size={16} />}
              onClick={() => navigate('/tools/order_tracking')}
              sx={{ borderRadius: 1, minHeight: 34, fontSize: 12 }}
            >
              Track By
            </Button>
            <Button
              variant="outlined"
              startIcon={exportingCsv ? <CircularProgress size={14} /> : <TbDownload size={16} />}
              onClick={handleExportCsv}
              disabled={exportingCsv}
              sx={{ borderRadius: 1, minHeight: 34, fontSize: 12 }}
            >
              {exportingCsv ? 'Exporting' : 'Export CSV'}
            </Button>
            <Button
              variant="contained"
              startIcon={<TbPlus size={16} />}
              onClick={() => navigate('/orders/create')}
              sx={{
                borderRadius: 1,
                minHeight: 34,
                fontSize: 12,
                bgcolor: '#1D2842',
                '&:hover': {
                  bgcolor: '#152038',
                },
              }}
            >
              Create Order
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            px: { xs: 1.15, md: 1.5 },
            py: 0.65,
            borderBottom: `1px solid ${borderColor}`,
            bgcolor: isDark ? alpha('#ffffff', 0.03) : '#F8FAFC',
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 999,
              backgroundColor: isDark ? alpha('#ffffff', 0.18) : alpha('#1D2842', 0.18),
            },
          }}
        >
          <Stack direction="row" gap={0.75} sx={{ width: 'max-content', minWidth: '100%' }}>
            {orderStatusQuickFilters.map((tab) => {
              const selected = activeQuickStatus === tab.value
              const count = getQuickStatusCount(tab)
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
                    gap: 0.65,
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
                  {tab.label}
                  <Box
                    component="span"
                    sx={{
                      minWidth: 22,
                      px: 0.65,
                      py: 0.1,
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      color: selected ? tabTone.main : textPrimary,
                      bgcolor: selected ? '#FFFFFF' : alpha(tabTone.main, 0.12),
                    }}
                  >
                    {count}
                  </Box>
                </Button>
              )
            })}
          </Stack>
        </Box>

        <Collapse in={isFilterPanelOpen} timeout="auto" unmountOnExit>
          <Box sx={{ px: { xs: 1.15, md: 1.5 }, py: 1 }} id="orders-filter-bar">
            <FilterBar
              fields={filterFields}
              defaultValues={{
                ...filters,
                status: Array.isArray(filters.status) ? filters.status[0] || '' : filters.status,
              }}
              appliedCount={activeFilterCount}
              onApply={(appliedFilters) => {
                setFilters(appliedFilters)
                setPage(1)
                clearSelection()
                setBulkFeedback(null)
              }}
              compact
            />
          </Box>
        </Collapse>

        {bulkFeedback && (
          <Alert
            severity={bulkFeedback.severity}
            onClose={() => setBulkFeedback(null)}
            sx={{ mt: 1, mx: { xs: 1.15, md: 1.5 }, alignItems: 'flex-start' }}
          >
            <AlertTitle>{bulkFeedback.title}</AlertTitle>
            {bulkFeedback.message}
          </Alert>
        )}

        {selectedOrders.length > 0 && (
          <Box
            sx={{
              mt: 1,
              mx: { xs: 1.15, md: 1.5 },
              p: 1.25,
              borderRadius: '8px',
              border: `1px solid ${borderColor}`,
              backgroundColor: quietSurface,
            }}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              alignItems={{ xs: 'flex-start', lg: 'center' }}
              justifyContent="space-between"
              gap={1.25}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, color: textPrimary, fontSize: '14px' }}>
                  {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
                </Typography>
                <Typography sx={{ color: textSecondary, fontSize: '12px', mt: 0.25 }}>
                  Manifest up to {BULK_MANIFEST_LIMIT} eligible orders at once. Bulk label, invoice,
                  and manifest downloads have no selection limit.
                </Typography>
                {manifestValidationMessage && (
                  <Typography sx={{ color: '#C0392B', fontSize: '12px', mt: 0.5 }}>
                    {manifestValidationMessage}
                  </Typography>
                )}
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} gap={0.75} flexWrap="wrap">
                <Button
                  variant="contained"
                  onClick={openBulkManifestSchedule}
                  disabled={bulkManifesting || Boolean(manifestValidationMessage)}
                  sx={{ textTransform: 'none', minWidth: 150, minHeight: 34, fontSize: 12 }}
                >
                  {bulkManifesting ? 'Manifesting...' : 'Manifest Selected'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleBulkDownload('label')}
                  disabled={downloadingDocumentType !== null}
                  sx={{ textTransform: 'none', minHeight: 34, fontSize: 12 }}
                >
                  {downloadingDocumentType === 'label' ? 'Downloading...' : 'Download Labels'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleBulkDownload('invoice')}
                  disabled={downloadingDocumentType !== null}
                  sx={{ textTransform: 'none', minHeight: 34, fontSize: 12 }}
                >
                  {downloadingDocumentType === 'invoice' ? 'Downloading...' : 'Download Invoices'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleBulkDownload('manifest')}
                  disabled={downloadingDocumentType !== null}
                  sx={{ textTransform: 'none', minHeight: 34, fontSize: 12 }}
                >
                  {downloadingDocumentType === 'manifest' ? 'Downloading...' : 'Download Manifests'}
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    clearSelection()
                    setBulkFeedback(null)
                  }}
                  sx={{ textTransform: 'none', minHeight: 34, fontSize: 12 }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          backgroundColor: surface,
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
          boxShadow: panelShadow,
          overflow: 'hidden',
        }}
      >
        <DataTable<Order>
          rows={orders}
          columns={columns}
          title={
            currentOrderView === 'b2c'
              ? `${totalCount} total B2C orders`
              : currentOrderView === 'b2b'
                ? `${totalCount} total B2B orders`
                : `${totalCount} total orders`
          }
          pagination
          selectable
          density="compact"
          tableVariant="shipment"
          maxHeight={640}
          currentPage={page}
          onPageChange={(newPage) => {
            setPage(newPage + 1)
            clearSelection()
            setBulkFeedback(null)
          }}
          onRowsPerPageChange={(newRowsPerPage) => {
            setRowsPerPage(newRowsPerPage)
            setPage(1)
            clearSelection()
            setBulkFeedback(null)
          }}
          defaultRowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          totalCount={totalCount}
          onRowClick={(row) => setOrderDetailsOrder(row)}
          onSelectRows={(ids) => setSelectedOrderIds(ids as Array<Order['id']>)}
          selectedRowIds={selectedOrderIds}
          selectionResetToken={selectionResetToken}
        />
      </Box>

      <ManifestScheduleDialog
        open={manifestScheduleOpen}
        loading={bulkManifesting}
        defaultShipmentCount={defaultManifestShipmentCount}
        showShipmentCount={showManifestShipmentCount}
        title="Schedule Selected Manifests"
        description="Choose the pickup date and time before sending the selected manifests to the courier."
        onClose={() => {
          if (!bulkManifesting) setManifestScheduleOpen(false)
        }}
        onConfirm={handleManifestScheduleConfirm}
      />

      <B2CSelectCourierDialog
        open={Boolean(selectCourierOrder)}
        order={selectCourierOrder as B2COrder | null}
        onClose={() => setSelectCourierOrder(null)}
      />

      <OrderDetailsDialog
        open={Boolean(orderDetailsOrder)}
        order={orderDetailsOrder}
        onClose={() => setOrderDetailsOrder(null)}
      />

      <CustomDrawer
        width={1200}
        open={Boolean(editingOrder)}
        onClose={() => {
          setEditingOrder(null)
          setOrderFormDefaults(null)
          setOrderFormKey((current) => current + 1)
        }}
        title={editingOrder?.order_number ? `Edit Order ${editingOrder.order_number}` : 'Edit Order'}
      >
        {editingOrder && (
          <B2COrderFormSteps
            key={orderFormKey}
            initialValues={orderFormDefaults || undefined}
            mode="edit"
            existingOrderId={String(editingOrder.id)}
            onClose={() => {
              setEditingOrder(null)
              setOrderFormDefaults(null)
              setOrderFormKey((current) => current + 1)
            }}
          />
        )}
      </CustomDrawer>
    </Stack>
  )
}

export default AllOrders
