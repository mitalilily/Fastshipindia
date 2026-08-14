import {
  Box,
  Center,
  Flex,
  HStack,
  Progress,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import {
  IconArrowDown,
  IconArrowUp,
  IconBox,
  IconCircleCheck,
  IconClock,
  IconCoinRupee,
  IconTruckDelivery,
  IconWallet,
} from '@tabler/icons-react'
import { useSellerSummary } from 'hooks/useUser'

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0))

const StatCard = ({ icon: icon, label, value, helper, color = '#6C5CE7' }) => {
  const IconComponent = icon
  return (
    <Box bg="white" border="1px solid #E4EAF3" borderRadius="16px" p="20px">
      <HStack spacing="11px" color="#607397">
        <Flex w="34px" h="34px" borderRadius="10px" bg={`${color}14`} align="center" justify="center">
          <IconComponent size={19} color={color} />
        </Flex>
        <Text fontSize="sm" fontWeight="700" textTransform="uppercase">{label}</Text>
      </HStack>
      <Text mt="12px" fontSize="2xl" fontWeight="800" color="#111C33">{value}</Text>
      <Text mt="3px" fontSize="sm" color="#607397">{helper}</Text>
    </Box>
  )
}

const PipelineItem = ({ label, count, color }) => (
  <Box border={`1px solid ${color}55`} bg={`${color}0D`} borderRadius="11px" px="15px" py="12px" minW="135px">
    <Text color={color} fontWeight="700" fontSize="sm">{label} &nbsp; {count}</Text>
  </Box>
)

export default function SellerSummaryTab({ userId }) {
  const { data, isLoading, isError } = useSellerSummary(userId)

  if (isLoading) return <Center minH="360px"><Spinner size="xl" /></Center>
  if (isError) return <Center minH="300px"><Text color="red.500">Failed to load seller summary.</Text></Center>

  const financial = data?.financial || {}
  const operational = data?.operational || {}
  const metrics = data?.metrics || {}
  const actions = data?.actions || {}
  const statusRows = data?.charts?.ordersByStatus || []
  const statusMap = statusRows.reduce((out, row) => ({ ...out, [row.status]: row.count }), {})
  const activePipeline = [
    ['Processing', statusMap.pending || 0, '#D68A3A'],
    ['Booked', statusMap.booked || statusMap.shipment_created || 0, '#3B9DBD'],
    ['Pickup Initiated', statusMap.pickup_initiated || 0, '#6787E8'],
    ['Shipped', statusMap.shipped || 0, '#7A6EE6'],
    ['In Transit', statusMap.in_transit || 0, '#9B6AD8'],
    ['Out for Delivery', statusMap.out_for_delivery || 0, '#4FAE78'],
  ]

  const delivered = operational.deliveredOrders || 0
  const ndr = operational.ndrCount || 0
  const rto = operational.rtoCount || 0
  const cancelled = statusMap.cancelled || statusMap.canceled || 0
  const total = operational.totalOrders || 0
  const percentage = (value) => (total ? Math.round((value / total) * 100) : 0)
  const courierPerformance = Object.entries(data?.couriers?.performance || {})

  return (
    <Stack spacing="18px">
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing="15px">
        <StatCard icon={IconBox} label="Total Orders" value={total} helper={`${metrics.totalPrepaidOrders || 0} prepaid · ${metrics.totalCodOrders || 0} COD`} color="#2F80ED" />
        <StatCard icon={IconCoinRupee} label="Total Revenue" value={money(financial.totalRevenue)} helper={`Freight ${money(financial.totalFreightCharges)}`} color="#00A881" />
        <StatCard icon={IconWallet} label="Wallet Balance" value={money(financial.walletBalance)} helper="Current available balance" color="#6C5CE7" />
        <StatCard icon={IconTruckDelivery} label="Delivery Rate" value={`${operational.deliverySuccessRate || 0}%`} helper={`${delivered} of ${total} delivered`} color="#31A66B" />
      </SimpleGrid>

      <Box bg="white" border="1px solid #E4EAF3" borderRadius="16px" p="20px">
        <Flex justify="space-between" mb="16px">
          <Text fontWeight="800" color="#172139">Active Orders Pipeline</Text>
          <Text fontSize="sm" color="#607397">{activePipeline.reduce((sum, item) => sum + Number(item[1]), 0)} in pipeline</Text>
        </Flex>
        <Flex gap="11px" overflowX="auto" pb="4px">
          {activePipeline.map(([label, count, color]) => <PipelineItem key={label} label={label} count={count} color={color} />)}
        </Flex>
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing="15px">
        <Box bg="white" border="1px solid #E4EAF3" borderRadius="16px" p="20px">
          <Text fontWeight="800" mb="18px">Order Outcomes</Text>
          <Stack spacing="17px">
            {[
              ['Delivered', delivered, '#16A05D', IconCircleCheck],
              ['NDR', ndr, '#F07B20', IconClock],
              ['RTO', rto, '#EF4444', IconArrowDown],
              ['Cancelled / Lost', cancelled, '#64748B', IconArrowDown],
            ].map(([label, value, color, IconComponent]) => (
              <Box key={label}>
                <Flex justify="space-between" mb="7px">
                  <HStack><IconComponent size={17} color={color} /><Text color={color} fontWeight="700">{label}</Text></HStack>
                  <Text fontWeight="700">{value} <Text as="span" fontSize="xs" color="#607397">({percentage(value)}%)</Text></Text>
                </Flex>
                <Progress value={percentage(value)} size="xs" colorScheme={label === 'Delivered' ? 'green' : label === 'NDR' ? 'orange' : 'red'} borderRadius="full" />
              </Box>
            ))}
          </Stack>
        </Box>

        <Box bg="white" border="1px solid #E4EAF3" borderRadius="16px" p="20px">
          <Text fontWeight="800" mb="18px">Payment Breakdown</Text>
          <Stack spacing="12px">
            <Flex justify="space-between" bg="#EEFBF4" border="1px solid #BDEDD0" borderRadius="11px" p="14px"><Text color="#607397">Prepaid</Text><Text fontWeight="800">{metrics.totalPrepaidOrders || 0}</Text></Flex>
            <Flex justify="space-between" bg="#FFF9E9" border="1px solid #F4DC96" borderRadius="11px" p="14px"><Text color="#607397">COD</Text><Text fontWeight="800">{metrics.totalCodOrders || 0}</Text></Flex>
            <Flex justify="space-between" pt="10px"><Text color="#607397">Average order value</Text><Text fontWeight="800">{money(metrics.avgOrderValue)}</Text></Flex>
          </Stack>
        </Box>

        <Box bg="white" border="1px solid #E4EAF3" borderRadius="16px" p="20px">
          <Text fontWeight="800" mb="18px">COD Remittance</Text>
          <Stack spacing="15px">
            <Flex justify="space-between"><Text color="#607397">Total COD</Text><Text fontWeight="800">{money(financial.codAmount)}</Text></Flex>
            <Flex justify="space-between"><HStack color="green.600"><IconArrowUp size={16} /><Text>Remitted</Text></HStack><Text color="green.600" fontWeight="800">{money(financial.codRemittanceCredited)}</Text></Flex>
            <Flex justify="space-between"><HStack color="orange.600"><IconClock size={16} /><Text>Pending</Text></HStack><Text color="orange.600" fontWeight="800">{money(financial.codRemittanceDue)}</Text></Flex>
            <Flex justify="space-between" pt="8px"><Text color="#607397">Open support tickets</Text><Text fontWeight="800">{actions.openTickets || 0}</Text></Flex>
          </Stack>
        </Box>
      </SimpleGrid>

      <Box bg="white" border="1px solid #E4EAF3" borderRadius="16px" p="20px">
        <Text fontWeight="800" mb="13px">Top Courier Partners</Text>
        {courierPerformance.length ? (
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing="12px">
            {courierPerformance.slice(0, 6).map(([courier, stats]) => (
              <Box key={courier} bg="#F8FAFD" borderRadius="11px" p="14px">
                <Text fontWeight="800">{courier}</Text>
                <Text fontSize="sm" color="#607397">{stats.count} shipments · {stats.deliveryRate}% delivered</Text>
              </Box>
            ))}
          </SimpleGrid>
        ) : <Text color="#607397">No shipments yet.</Text>}
      </Box>
    </Stack>
  )
}
