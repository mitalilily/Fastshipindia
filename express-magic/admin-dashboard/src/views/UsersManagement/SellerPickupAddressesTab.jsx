import { Badge, Box, Center, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import { IconMapPin, IconPhone } from '@tabler/icons-react'
import { useSellerPickupAddresses } from 'hooks/useUser'

export default function SellerPickupAddressesTab({ userId }) {
  const { data, isLoading, isError } = useSellerPickupAddresses(userId)
  const addresses = data?.data || []

  if (isLoading) return <Center minH="360px"><Spinner size="xl" /></Center>
  if (isError) return <Center minH="300px"><Text color="red.500">Failed to load pickup addresses.</Text></Center>

  if (!addresses.length) {
    return (
      <Center minH="360px" bg="white" border="1px solid #E4EAF3" borderRadius="16px">
        <Stack align="center" color="#607397">
          <IconMapPin size={44} stroke={1.5} />
          <Text>No pickup addresses added by this seller.</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing="15px">
      {addresses.map((row) => {
        const address = row.pickup || {}
        return (
          <Box key={row.pickupId || address.id} bg="white" border="1px solid #E4EAF3" borderRadius="16px" p="20px">
            <Stack spacing="10px">
              <Box>
                <Badge colorScheme={row.isPickupEnabled ? 'green' : 'gray'} mr="8px">{row.isPickupEnabled ? 'Active' : 'Inactive'}</Badge>
                {row.isPrimary ? <Badge colorScheme="purple">Primary</Badge> : null}
              </Box>
              <Text fontSize="lg" fontWeight="800">{address.addressNickname || address.contactName || 'Pickup address'}</Text>
              <Text color="#536786"><IconMapPin size={16} style={{ display: 'inline', marginRight: 7 }} />{[address.addressLine1, address.addressLine2, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</Text>
              <Text color="#536786"><IconPhone size={16} style={{ display: 'inline', marginRight: 7 }} />{address.contactName || '—'} · {address.contactPhone || '—'}</Text>
              {address.contactEmail ? <Text color="#607397" fontSize="sm">{address.contactEmail}</Text> : null}
            </Stack>
          </Box>
        )
      })}
    </SimpleGrid>
  )
}
