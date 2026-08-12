import { Box, HStack, Stack, Text } from '@chakra-ui/react'
import { AdminCard, AdminStack, adminUi } from 'components/AdminUI/AdminPage'
import { RateCardContainer } from 'components/RateCard/RateCardContainer'
import { useState } from 'react'
import ZonesManagement from 'views/Zones/ZonesManagement'

const tabs = [
  { key: 'zones', label: 'Zones' },
  { key: 'pricing', label: 'Pricing' },
]

const B2CPricingManagement = () => {
  const [activeTab, setActiveTab] = useState('pricing')

  return (
    <AdminStack spacing="20px">
      <AdminCard p={{ base: '18px', lg: '25px' }}>
        <Stack spacing={5}>
          <Box>
            <Text fontSize={{ base: '22px', md: '26px' }} fontWeight="800" color={adminUi.text}>
              B2C Pricing Management
            </Text>
            <Text mt={1} fontSize="sm" color={adminUi.muted}>
              Configure Delhivery Surface and Express rate cards for every B2C zone.
            </Text>
          </Box>

          <HStack
            spacing={{ base: 5, md: 8 }}
            borderBottom="1px solid"
            borderColor={adminUi.border}
            overflowX="auto"
            align="flex-end"
          >
            {tabs.map((tab) => (
              <Box
                key={tab.key}
                as="button"
                type="button"
                pb="12px"
                flexShrink={0}
                borderBottom="3px solid"
                borderColor={activeTab === tab.key ? adminUi.purple : 'transparent'}
                color={activeTab === tab.key ? adminUi.purple : adminUi.text}
                onClick={() => setActiveTab(tab.key)}
              >
                <Text
                  fontSize={{ base: '16px', md: '19px' }}
                  fontWeight={activeTab === tab.key ? '700' : '500'}
                >
                  {tab.label}
                </Text>
              </Box>
            ))}
          </HStack>

          <Box minW={0}>
            {activeTab === 'zones' ? (
              <ZonesManagement defaultBusinessType="B2C" />
            ) : (
              <RateCardContainer forceBusinessType="B2C" embedded />
            )}
          </Box>
        </Stack>
      </AdminCard>
    </AdminStack>
  )
}

export default B2CPricingManagement
