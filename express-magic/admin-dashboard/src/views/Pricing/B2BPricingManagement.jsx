import { Box, HStack, Select, Stack, Text } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { AdminCard, AdminStack, adminUi } from 'components/AdminUI/AdminPage'
import B2BAdditionalCharges from 'components/B2B/B2BAdditionalCharges'
import B2BPincodeManagement from 'components/B2B/B2BPincodeManagement'
import B2BQuoteCalculator from 'components/B2B/B2BQuoteCalculator'
import B2BRateMatrix from 'components/B2B/B2BRateMatrix'
import { useEffect, useState } from 'react'
import { PlansService } from 'services/plan.service'
import ZonesManagement from 'views/Zones/ZonesManagement'

const tabs = ['Zones', 'Pincodes', 'Rate Matrix', 'Additional Charges', 'Quote Calculator']

const B2BPricingManagement = () => {
  const [activeTab, setActiveTab] = useState('Pincodes')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: PlansService.getPlans })

  useEffect(() => {
    if (!plans.length || plans.some((plan) => String(plan.id) === String(selectedPlanId))) return
    const basicPlan = plans.find((plan) => String(plan.name || '').trim().toLowerCase() === 'basic')
    setSelectedPlanId((basicPlan || plans[0]).id)
  }, [plans, selectedPlanId])

  const renderTabContent = () => {
    if (activeTab === 'Zones') return <ZonesManagement defaultBusinessType="B2B" />
    if (activeTab === 'Pincodes') return <B2BPincodeManagement />
    if (activeTab === 'Rate Matrix') return <B2BRateMatrix planId={selectedPlanId} />
    if (activeTab === 'Additional Charges') {
      return <B2BAdditionalCharges planId={selectedPlanId} />
    }
    return <B2BQuoteCalculator planId={selectedPlanId} />
  }

  const planRequired = ['Rate Matrix', 'Additional Charges', 'Quote Calculator'].includes(activeTab)

  return (
    <AdminStack spacing="20px">
      <AdminCard p={{ base: '18px', lg: '25px' }}>
        <Stack spacing={5}>
          <HStack justify="space-between" align="center" gap={4} wrap="wrap">
            <Box>
              <Text fontSize={{ base: '22px', md: '26px' }} fontWeight="800" color={adminUi.text}>
                B2B Pricing Management
              </Text>
              <Text mt={1} fontSize="sm" color={adminUi.muted}>
                Configure zones, pincode coverage, rates and shipment charges.
              </Text>
            </Box>
            {planRequired && plans.length ? (
              <HStack>
                <Text fontSize="sm" fontWeight="700" color={adminUi.muted}>Plan</Text>
                <Select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)} minW="180px" bg="white">
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </Select>
              </HStack>
            ) : null}
          </HStack>

          <HStack spacing={{ base: 4, md: 6 }} borderBottom="1px solid" borderColor={adminUi.border} overflowX="auto" align="flex-end">
            {tabs.map((tab) => (
              <Box
                key={tab}
                as="button"
                type="button"
                pb="11px"
                flexShrink={0}
                borderBottom="3px solid"
                borderColor={activeTab === tab ? adminUi.purple : 'transparent'}
                color={activeTab === tab ? adminUi.purple : adminUi.text}
                onClick={() => setActiveTab(tab)}
              >
                <Text fontSize={{ base: '15px', md: '18px' }} fontWeight={activeTab === tab ? '700' : '500'}>
                  {tab}
                </Text>
              </Box>
            ))}
          </HStack>

          <Box minW={0}>{renderTabContent()}</Box>
        </Stack>
      </AdminCard>
    </AdminStack>
  )
}

export default B2BPricingManagement
