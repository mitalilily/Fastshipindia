import { Box, Flex, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import {
  IconBuilding,
  IconCalendar,
  IconClock,
  IconMail,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconRefresh,
  IconShoppingBag,
} from '@tabler/icons-react'

const display = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return value || '—'
}

const dateTime = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('en-IN')
}

const InfoRow = ({ icon: icon, label, value }) => {
  const IconComponent = icon
  return (
    <Flex py="13px" borderBottom="1px solid #E9EDF4" gap="13px" align="center" minW={0}>
      <IconComponent size={18} color="#7183A0" />
      <Text color="#7183A0" minW={{ base: '110px', md: '145px' }}>{label}</Text>
      <Text color="#172139" fontWeight="600" wordBreak="break-word">{display(value)}</Text>
    </Flex>
  )
}

const Section = ({ title, children }) => (
  <Box bg="white" border="1px solid #E4EAF3" borderRadius="16px" p={{ base: 4, md: 6 }}>
    <Text fontSize="lg" fontWeight="800" color="#172139" mb="7px">{title}</Text>
    <Stack spacing={0}>{children}</Stack>
  </Box>
)

export default function ProfileInformation({ user }) {
  const company = user?.companyInfo || {}
  const salesChannels = user?.salesChannels
    ? Object.entries(user.salesChannels).filter(([, enabled]) => enabled).map(([channel]) => channel)
    : []

  return (
    <Stack spacing="18px">
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing="18px">
        <Section title="Contact Information">
          <InfoRow icon={IconMail} label="Email" value={user?.email || company.contactEmail} />
          <InfoRow icon={IconPhone} label="Phone" value={user?.phone || company.contactNumber} />
          <InfoRow icon={IconMapPin} label="Pincode" value={company.pincode} />
          <InfoRow icon={IconMapPin} label="Location" value={[company.city, company.state].filter(Boolean).join(', ')} />
        </Section>

        <Section title="Business Details">
          <InfoRow icon={IconBuilding} label="Business" value={company.businessName || company.brandName} />
          <InfoRow icon={IconShoppingBag} label="Sells On" value={salesChannels} />
          <InfoRow icon={IconPackage} label="Volume" value={user?.monthlyOrderCount} />
          <InfoRow icon={IconBuilding} label="Business Type" value={user?.businessType} />
        </Section>
      </SimpleGrid>

      <Section title="Activity">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacingX="28px">
          <InfoRow icon={IconCalendar} label="Joined" value={dateTime(user?.createdAt || user?.submittedAt)} />
          <InfoRow icon={IconClock} label="Last login" value={dateTime(user?.lastLogin || user?.last_login_at)} />
          <InfoRow icon={IconRefresh} label="Last updated" value={dateTime(user?.updatedAt)} />
        </SimpleGrid>
      </Section>
    </Stack>
  )
}
