import {
  Box,
  Button,
  Collapse,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import Card from 'components/Card/Card'
import OrdersTable from 'components/Tables/OrdersTable'
import OrderDetailsModal from 'components/Tables/OrderDetailsModal'
import { useCancelOrderMutation, useOrders } from 'hooks/useOrders'
import { useEffect, useMemo, useState } from 'react'
import { FiChevronDown, FiDownload, FiPackage, FiPlus, FiSearch } from 'react-icons/fi'
import { useLocation } from 'react-router-dom'
import { exportOrdersToCSV } from 'services/order.service'

const ORDER_STATUS_FILTERS = [
  { label: 'All', value: 'all', statuses: undefined },
  { label: 'Scheduled', value: 'scheduled', statuses: ['pickup_initiated', 'manifest_generated'] },
  { label: 'Not Picked', value: 'not_picked', statuses: ['pending', 'booked', 'shipment_created'] },
  { label: 'In-Transit', value: 'in_transit', statuses: ['in_transit'] },
  { label: 'Out For Delivery', value: 'out_for_delivery', statuses: ['out_for_delivery'] },
  { label: 'Delivered', value: 'delivered', statuses: ['delivered'] },
  { label: 'RTO Intransit', value: 'rto_in_transit', statuses: ['rto_in_transit'] },
  { label: 'RTO Delivered', value: 'rto_delivered', statuses: ['rto_delivered'] },
  { label: 'Undelivered', value: 'undelivered', statuses: ['ndr', 'undelivered'] },
  { label: 'Cancelled', value: 'cancelled', statuses: ['cancelled', 'cancellation_requested'] },
]

const normalizeStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const normalizeStatusFilter = (status) =>
  (Array.isArray(status) ? status : status ? [status] : []).map(normalizeStatus).filter(Boolean)

const isSameStatusFilter = (currentStatus, quickStatuses) => {
  const current = normalizeStatusFilter(currentStatus).sort()
  const quick = [...(quickStatuses || [])].map(normalizeStatus).sort()

  if (current.length !== quick.length) return false
  return current.every((value, index) => value === quick[index])
}

const Orders = () => {
  const location = useLocation()
  const initialSearch = new URLSearchParams(location.search).get('search') || ''
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filters, setFilters] = useState({
    status: '',
    businessType: '',
    paymentType: '',
    courier: '',
    warehouse: '',
    productQuery: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    search: initialSearch,
    fromDate: '',
    toDate: '',
  })
  const [isExporting, setIsExporting] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancellingOrderId, setCancellingOrderId] = useState(null)

  const { data: ordersData, isLoading, isFetching, refetch } = useOrders(page, limit, filters)
  const { mutateAsync: cancelOrder, isPending: isCancellingOrder } = useCancelOrderMutation()
  const toast = useToast()

  useEffect(() => {
    const nextSearch = new URLSearchParams(location.search).get('search') || ''
    setFilters((prev) => (prev.search === nextSearch ? prev : { ...prev, search: nextSearch }))
    setPage(1)
  }, [location.search])

  const panelBg = useColorModeValue('#FFFFFF', '#161B22')
  const borderColor = useColorModeValue('#E2E8F0', '#30363D')
  const textColor = useColorModeValue('#0F172A', '#E6EDF3')
  const mutedColor = useColorModeValue('#64748B', '#8B949E')
  const inputBg = useColorModeValue('#FFFFFF', '#161B22')
  const statusHoverBg = useColorModeValue('#F8FAFC', '#1F2937')
  const statusBadgeBg = useColorModeValue('#EEF2F7', '#27313F')
  const totalCount = ordersData?.totalCount || 0
  const activeStatusFilter =
    ORDER_STATUS_FILTERS.find((filter) => isSameStatusFilter(filters.status, filter.statuses))?.value ||
    'custom'

  const stats = useMemo(() => {
    const orders = ordersData?.orders || []
    const statusCounts = orders.reduce((counts, order) => {
      const status = normalizeStatus(order.order_status)
      if (!status) return counts
      counts[status] = (counts[status] || 0) + 1
      return counts
    }, {})

    return {
      total: totalCount,
      inTransit: orders.filter((o) => ['shipment_created', 'in_transit', 'pickup_initiated'].includes(o.order_status)).length,
      delivered: orders.filter((o) => o.order_status === 'delivered').length,
      cancelled: orders.filter((o) => o.order_status === 'cancelled').length,
      rto: orders.filter((o) => String(o.order_status || '').includes('rto')).length,
      revenue: orders.reduce((sum, order) => sum + Number(order.order_amount || 0), 0),
      statusCounts,
    }
  }, [ordersData, totalCount])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await exportOrdersToCSV(filters)
      toast({ title: 'Orders exported', status: 'success', duration: 2500, isClosable: true })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export orders',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const getStatusFilterCount = (filter) => {
    if (!filter.statuses || filter.value === activeStatusFilter) return totalCount
    return filter.statuses.reduce((sum, status) => sum + (stats.statusCounts[normalizeStatus(status)] || 0), 0)
  }

  const applyStatusFilter = (filter) => {
    setFilters((prev) => ({
      ...prev,
      status: filter.statuses ? [...filter.statuses] : '',
    }))
    setPage(1)
  }

  const handleCancelOrder = async (order) => {
    if (!order?.id) return

    const label = order.order_number || order.awb_number || order.id
    const confirmed = window.confirm(
      `Cancel real shipment ${label}? This will call the courier cancellation API and process wallet refund if applicable.`,
    )
    if (!confirmed) return

    try {
      setCancellingOrderId(order.id)
      const response = await cancelOrder(order.id)
      toast({
        title: 'Shipment cancelled',
        description: response?.message || `${label} cancellation completed.`,
        status: 'success',
        duration: 4500,
        isClosable: true,
      })
      setSelectedOrder((current) =>
        current?.id === order.id
          ? {
              ...current,
              order_status: 'cancelled',
            }
          : current,
      )
      refetch()
    } catch (error) {
      toast({
        title: 'Cancellation failed',
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Courier cancellation was not accepted.',
        status: 'error',
        duration: 6500,
        isClosable: true,
      })
    } finally {
      setCancellingOrderId(null)
    }
  }

  const openClientOrderCreate = () => {
    const clientBaseUrl = (process.env.REACT_APP_CLIENT_URL || 'https://app.fastship.in').replace(/\/+$/, '')
    window.open(`${clientBaseUrl}/orders/create`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Box pt={{ base: '100px', md: '92px' }}>
      <Card bg={panelBg} borderColor={borderColor} borderWidth="1px" borderRadius="20px" p="26px" mb="20px" boxShadow="none">
        <Flex justify="space-between" align={{ base: 'flex-start', xl: 'center' }} gap={5} wrap="wrap">
          <HStack spacing={4}>
            <Flex w="46px" h="46px" borderRadius="14px" bg="rgba(108, 92, 231, 0.16)" align="center" justify="center">
              <Icon as={FiPackage} color="#6C5CE7" boxSize={5} />
            </Flex>
            <Box>
              <Text color={textColor} fontSize="22px" fontWeight="800">
                Orders
              </Text>
              <Text color={mutedColor} fontSize="15px">
                View and manage all orders across users
              </Text>
            </Box>
          </HStack>

          <HStack spacing={4} wrap="wrap" color={mutedColor}>
            <StatDot color="#6C5CE7" value={stats.total} label="total" />
            <StatDot color="#3B82F6" value={stats.inTransit} label="in transit" />
            <StatDot color="#10B981" value={stats.delivered} label="delivered" />
            <StatDot color="#F87171" value={stats.cancelled} label="cancelled" />
            <StatDot color="#F97316" value={stats.rto} label="RTO" />
            <Text color={textColor} fontWeight="800">
              ₹ {stats.revenue.toLocaleString('en-IN')}
              <Text as="span" color={mutedColor} fontWeight="400" ml={2}>
                revenue
              </Text>
            </Text>
          </HStack>
        </Flex>

        <Box h="1px" bg={borderColor} my="20px" />

        <Box
          overflowX="auto"
          pb="10px"
          css={{
            '&::-webkit-scrollbar': { height: '6px' },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(15, 23, 42, 0.18)',
              borderRadius: '999px',
            },
          }}
        >
          <HStack spacing={2} minW="max-content">
            {ORDER_STATUS_FILTERS.map((filter) => {
              const selected = activeStatusFilter === filter.value
              return (
                <Button
                  key={filter.value}
                  size="sm"
                  h="34px"
                  px="12px"
                  borderRadius="10px"
                  variant="outline"
                  borderColor={selected ? '#0B3A78' : borderColor}
                  bg={selected ? '#0B3A78' : inputBg}
                  color={selected ? '#FFFFFF' : textColor}
                  fontWeight="700"
                  fontSize="13px"
                  _hover={{
                    bg: selected ? '#082E60' : statusHoverBg,
                    borderColor: selected ? '#082E60' : '#0B3A78',
                  }}
                  onClick={() => applyStatusFilter(filter)}
                >
                  <HStack spacing={2}>
                    <Text>{filter.label}</Text>
                    <Text
                      as="span"
                      px="7px"
                      py="1px"
                      borderRadius="999px"
                      bg={selected ? '#FFFFFF' : statusBadgeBg}
                      color={selected ? '#0B3A78' : mutedColor}
                      fontSize="11px"
                      fontWeight="800"
                    >
                      {getStatusFilterCount(filter)}
                    </Text>
                  </HStack>
                </Button>
              )
            })}
          </HStack>
        </Box>

        <Flex justify="space-between" align={{ base: 'stretch', lg: 'flex-end' }} gap={4} wrap="wrap">
          <Stack direction={{ base: 'column', md: 'row' }} spacing={4} flex="1">
            <Box minW={{ base: '100%', md: '300px' }}>
              <Text color={mutedColor} fontSize="14px" mb="8px">
                Search
              </Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color={mutedColor} />
                </InputLeftElement>
                <Input
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder="Order ID, AWB, name, city..."
                  bg={inputBg}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: '#6E7681' }}
                />
              </InputGroup>
            </Box>
            <Box minW={{ base: '100%', md: '200px' }}>
              <Text color={mutedColor} fontSize="14px" mb="8px">
                Status
              </Text>
              <Select value={Array.isArray(filters.status) ? '' : filters.status} onChange={(event) => updateFilter('status', event.target.value)} bg={inputBg} borderColor={borderColor} color={textColor}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="shipment_created">Shipment Created</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="rto_delivered">RTO Delivered</option>
              </Select>
            </Box>
            <Button
              variant="link"
              color="#6C5CE7"
              rightIcon={<FiChevronDown />}
              alignSelf={{ base: 'flex-start', md: 'flex-end' }}
              onClick={() => setShowMoreFilters((visible) => !visible)}
              aria-expanded={showMoreFilters}
            >
              More filters
            </Button>
          </Stack>

          <HStack spacing={4} justify="flex-end">
            <Text color={mutedColor} whiteSpace="nowrap">
              {totalCount} orders
            </Text>
            <Button leftIcon={<FiDownload />} variant="outline" borderColor={borderColor} color={textColor} isLoading={isExporting} onClick={handleExport}>
              Export CSV
            </Button>
            <Button
              leftIcon={<FiPlus />}
              bg="#6C5CE7"
              color="white"
              _hover={{ bg: '#5A4BD1' }}
              onClick={openClientOrderCreate}
            >
              Create Manual Order
            </Button>
          </HStack>
        </Flex>

        <Collapse in={showMoreFilters} animateOpacity>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={4} mt={5} align="flex-end" flexWrap="wrap">
            <FilterSelect label="Order Type" value={filters.businessType} onChange={(value) => updateFilter('businessType', value)}>
              <option value="">B2C and B2B</option>
              <option value="b2c">B2C</option>
              <option value="b2b">B2B</option>
            </FilterSelect>
            <FilterSelect label="Payment" value={filters.paymentType} onChange={(value) => updateFilter('paymentType', value)}>
              <option value="">All payments</option>
              <option value="prepaid">Prepaid</option>
              <option value="cod">Cash on Delivery</option>
            </FilterSelect>
            <FilterInput label="Courier" value={filters.courier} placeholder="Name or courier ID" onChange={(value) => updateFilter('courier', value)} />
            <FilterInput label="Pickup Warehouse" value={filters.warehouse} placeholder="Warehouse name" onChange={(value) => updateFilter('warehouse', value)} />
            <FilterInput label="Product / SKU" value={filters.productQuery} placeholder="Product name or SKU" onChange={(value) => updateFilter('productQuery', value)} />
            <FilterInput label="From Date" type="date" value={filters.fromDate} onChange={(value) => updateFilter('fromDate', value)} />
            <FilterInput label="To Date" type="date" value={filters.toDate} onChange={(value) => updateFilter('toDate', value)} />
            <Button
              variant="outline"
              borderColor={borderColor}
              onClick={() => {
                setFilters((previous) => ({
                  ...previous,
                  businessType: '',
                  paymentType: '',
                  courier: '',
                  warehouse: '',
                  productQuery: '',
                  fromDate: '',
                  toDate: '',
                }))
                setPage(1)
              }}
            >
              Clear extra filters
            </Button>
          </Stack>
        </Collapse>
      </Card>

      <OrdersTable
        orders={ordersData?.orders}
        totalCount={totalCount}
        page={page}
        setPage={setPage}
        perPage={limit}
        setPerPage={setLimit}
        loading={isLoading || isFetching}
        onRowClick={setSelectedOrder}
        onCancelOrder={handleCancelOrder}
        cancellingOrderId={cancellingOrderId}
      />

      <OrderDetailsModal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onOrderUpdated={(updatedOrder) => setSelectedOrder(updatedOrder)}
        onCancelOrder={handleCancelOrder}
        isCancellingOrder={isCancellingOrder && selectedOrder?.id === cancellingOrderId}
      />
    </Box>
  )
}

function FilterInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <Box minW={{ base: '100%', md: '180px' }} flex="1">
      <Text color="gray.500" fontSize="13px" mb="6px">{label}</Text>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Box>
  )
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <Box minW={{ base: '100%', md: '170px' }} flex="1">
      <Text color="gray.500" fontSize="13px" mb="6px">{label}</Text>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>{children}</Select>
    </Box>
  )
}

function StatDot({ color, value, label }) {
  return (
    <HStack spacing={1.5}>
      <Box w="14px" h="14px" borderRadius="4px" border="2px solid" borderColor={color} />
      <Text color="#E6EDF3" fontWeight="800">
        {value}
      </Text>
      <Text color="#8B949E">{label}</Text>
    </HStack>
  )
}

export default Orders
