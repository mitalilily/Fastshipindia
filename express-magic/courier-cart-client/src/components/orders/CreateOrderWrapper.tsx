import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useEmployeePermissions from '../../hooks/User/useEmployeePermissions'
import B2BOrderForm from './b2b/B2BOrderForm'
import B2COrderFormSteps from './b2c/B2COrderForm'
import ReversePickupForm from './reverse/ReversePickupForm'

const getRequestedOrderType = (value: string | null): 'b2c' | 'b2b' =>
  value === 'b2b' ? 'b2b' : 'b2c'

const getRequestedShipmentMode = (params: URLSearchParams): 'domestic' | 'international' => {
  const shipment = params.get('shipment')?.toLowerCase()
  const legacyType = params.get('type')?.toLowerCase()

  if (shipment === 'international' || legacyType === 'intl' || legacyType === 'international') {
    return 'international'
  }

  return 'domestic'
}

const CreateOrderWrapper = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const requestedType = getRequestedOrderType(searchParams.get('type'))
  const requestedShipmentMode = getRequestedShipmentMode(searchParams)
  const [activeTab, setActiveTab] = useState<'b2c' | 'b2b'>(requestedType)
  const [shipmentMode, setShipmentMode] = useState<'domestic' | 'international'>(requestedShipmentMode)
  const [pickupMode, setPickupMode] = useState<'forward' | 'reverse'>('forward')
  const { canAddReturnOrders, canViewReturnOrders } = useEmployeePermissions()

  useEffect(() => {
    setActiveTab(requestedType)
    setShipmentMode(requestedShipmentMode)
  }, [requestedShipmentMode, requestedType])

  const updateCreateParams = (nextType: 'b2c' | 'b2b', nextShipmentMode = shipmentMode) => {
    const next = new URLSearchParams(searchParams)
    next.set('type', nextType)
    next.set('shipment', nextShipmentMode)
    setSearchParams(next, { replace: true })
  }

  const handleOrderTypeChange = (newValue: 'b2c' | 'b2b') => {
    setActiveTab(newValue)
    updateCreateParams(newValue)
    if (newValue === 'b2c') {
      setPickupMode('forward')
    }
  }

  const handleShipmentModeChange = (newValue: 'domestic' | 'international') => {
    setShipmentMode(newValue)
    updateCreateParams(activeTab, newValue)
  }

  return (
    <Container
      maxWidth={false}
      sx={{
        px: { xs: 1, md: 1.5 },
        py: 2,
        bgcolor: '#f4f7fb',
        minHeight: 'calc(100dvh - 68px)',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        gap={1.4}
        sx={{
          mb: 2,
          px: { xs: 1.2, md: 2 },
          py: 1.4,
          border: '1px solid #E2E8F0',
          borderRadius: 2,
          bgcolor: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" gap={1.4}>
          <Button
            onClick={() => navigate('/orders/new')}
            sx={{
              minWidth: 36,
              width: 36,
              height: 36,
              borderRadius: '50%',
              color: '#071d33',
              px: 0,
              fontSize: 24,
              '&:hover': { bgcolor: '#eef4f8' },
            }}
          >
            &lt;
          </Button>
          <Typography sx={{ color: '#071d33', fontSize: 20, fontWeight: 900 }}>
            Add {activeTab.toUpperCase()} Order
          </Typography>
        </Stack>
        <Stack direction="row" gap={1} justifyContent="flex-end" flexWrap="wrap">
          <Button onClick={() => navigate('/orders/new')} sx={{ ...createTopButtonSx, bgcolor: '#cceaf3', color: '#007197' }}>
            Dismiss
          </Button>
          <Button sx={{ ...createTopButtonSx, bgcolor: '#0789ad', color: '#fff' }}>Save</Button>
          <Button sx={{ ...createTopButtonSx, bgcolor: '#313456', color: '#fff', minWidth: 190 }}>
            Save & Assign Courier
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" gap={1.2} flexWrap="wrap" sx={{ mb: 2 }}>
        <SegmentControl
          items={[
            { label: 'B2C Order', value: 'b2c' },
            { label: 'B2B Order', value: 'b2b' },
          ]}
          value={activeTab}
          onChange={(value) => handleOrderTypeChange(value as 'b2c' | 'b2b')}
        />
        <SegmentControl
          items={[
            { label: 'Domestic', value: 'domestic' },
            { label: 'International', value: 'international' },
          ]}
          value={shipmentMode}
          onChange={(value) => handleShipmentModeChange(value as 'domestic' | 'international')}
        />
      </Stack>

      <Box
        sx={{
          flex: 1,
          bgcolor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: { xs: 1.5, sm: 2 },
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          p: { xs: 0.65, sm: 0.75, md: 0.85 },
          minHeight: { xs: 'calc(100dvh - 210px)', md: 'calc(100dvh - 212px)' },
          height: { md: 'calc(100dvh - 212px)' },
          overflow: 'hidden',
        }}
      >
        <Box sx={{ height: '100%', minHeight: 0 }}>
          {activeTab === 'b2c' ? (
            <Stack sx={{ height: '100%', minHeight: 0 }} spacing={1}>
              {pickupMode === 'forward' ? (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() => setPickupMode('forward')}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 999,
                        px: 2,
                        boxShadow: 'none',
                      }}
                    >
                      Forward Order
                    </Button>
                    {canViewReturnOrders ? (
                      <Button
                        variant="outlined"
                        onClick={() => canAddReturnOrders && setPickupMode('reverse')}
                        disabled={!canAddReturnOrders}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 999,
                          px: 2,
                        }}
                      >
                        Reverse Pickup
                      </Button>
                    ) : null}
                  </Stack>
                </Box>
              ) : null}

              <Box sx={{ flex: 1, minHeight: 0 }}>
                {pickupMode === 'forward' || !canViewReturnOrders || !canAddReturnOrders ? (
                  <B2COrderFormSteps />
                ) : (
                  <ReversePickupForm
                    onSwitchToForward={() => setPickupMode('forward')}
                    onSwitchToReverse={() => setPickupMode('reverse')}
                  />
                )}
              </Box>
            </Stack>
          ) : (
            <B2BOrderForm />
          )}
        </Box>
      </Box>
    </Container>
  )
}

function SegmentControl({
  items,
  value,
  onChange,
}: {
  items: Array<{ label: string; value: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Stack direction="row" sx={{ border: '1px solid #D7E1EC', bgcolor: '#fff', borderRadius: '11px', p: 0.35 }}>
      {items.map((item) => {
        const selected = item.value === value
        return (
          <Button
            key={item.value}
            onClick={() => onChange(item.value)}
            sx={{
              minWidth: 96,
              borderRadius: '10px',
              color: selected ? '#fff' : '#071d33',
              bgcolor: selected ? '#0789ad' : 'transparent',
              textTransform: 'none',
              fontWeight: 800,
              '&:hover': { bgcolor: selected ? '#0789ad' : '#eef4f8' },
            }}
          >
            {item.label}
          </Button>
        )
      })}
    </Stack>
  )
}

const createTopButtonSx = {
  height: 40,
  px: 2,
  borderRadius: '10px',
  textTransform: 'none',
  fontWeight: 900,
  boxShadow: 'none',
  '&:hover': { opacity: 0.92 },
}

export default CreateOrderWrapper
