import { Box, Container, Tab, Tabs } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import PageHeading from '../UI/heading/PageHeading'
import B2BOrderForm from './b2b/B2BOrderForm'
import B2COrderFormSteps from './b2c/B2COrderForm'
import type { ReshipCreateOrderState } from './reshipOrderDefaults'

const CreateOrderWrapper = () => {
  const location = useLocation()
  const reshipState = location.state as Partial<ReshipCreateOrderState> | null
  const routeActiveTab = reshipState?.mode === 'reship' ? reshipState.activeTab : undefined
  const [activeTab, setActiveTab] = useState<'b2c' | 'b2b'>(routeActiveTab || 'b2c')
  const formKey = useMemo(
    () =>
      reshipState?.mode === 'reship'
        ? `reship-${reshipState.activeTab}-${reshipState.sourceOrderNumber || 'order'}`
        : 'create-order',
    [reshipState],
  )

  useEffect(() => {
    if (routeActiveTab) setActiveTab(routeActiveTab)
  }, [routeActiveTab])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'b2c' | 'b2b') => {
    setActiveTab(newValue)
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        px: { xs: 1, sm: 1.5, md: 2 },
        py: { xs: 1, sm: 1.5 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1.25, sm: 1.5 },
        }}
      >
        <PageHeading title={reshipState?.mode === 'reship' ? 'Reship Order Draft' : 'Create New Order'} />

        <Box
          sx={{
            flex: 1,
            bgcolor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: { xs: 2, sm: 3 },
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            p: { xs: 1, sm: 1.25, md: 1.75 },
            minHeight: '64vh',
          }}
        >
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="order type tabs"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  minHeight: 40,
                },
                '& .Mui-selected': {
                  color: '#333369',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#333369',
                  height: 3,
                },
              }}
            >
              <Tab label="B2C Order" value="b2c" />
              <Tab label="B2B Order" value="b2b" />
            </Tabs>
          </Box>

          {/* Form Content */}
          <Box>
            {activeTab === 'b2c' ? (
              <B2COrderFormSteps key={`${formKey}-b2c`} initialValues={reshipState?.initialValues?.b2c} />
            ) : (
              <B2BOrderForm key={`${formKey}-b2b`} initialValues={reshipState?.initialValues?.b2b} />
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  )
}

export default CreateOrderWrapper
