import { alpha, Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import { MdAnalytics, MdShoppingBag } from 'react-icons/md'
import { TbCurrencyRupee } from 'react-icons/tb'
import DashboardWidgetHeader from './DashboardWidgetHeader'
import { dashboardCardContentSx, dashboardCardSx, dashboardPalette } from './dashboardStyles'

interface MetricsOverviewCardProps {
  metrics: {
    avgOrderValue: number
    totalPrepaidOrders: number
    totalCodOrders: number
  }
  formatCurrency: (amount: number) => string
}

export default function MetricsOverviewCard({ metrics, formatCurrency }: MetricsOverviewCardProps) {
  const metricCards = [
    {
      title: 'Avg Order Value',
      value: formatCurrency(metrics.avgOrderValue || 0),
      icon: <MdAnalytics size={20} />,
      color: dashboardPalette.blue,
      accent: '#0A4EA3',
    },
    {
      title: 'Prepaid Orders',
      value: metrics.totalPrepaidOrders?.toLocaleString() || '0',
      icon: <MdShoppingBag size={20} />,
      color: '#0F766E',
      accent: '#0F766E',
    },
    {
      title: 'COD Orders',
      value: metrics.totalCodOrders?.toLocaleString() || '0',
      icon: <TbCurrencyRupee size={20} />,
      color: '#B8141A',
      accent: '#B8141A',
    },
  ]

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={dashboardCardContentSx}>
        <DashboardWidgetHeader
          icon={<MdAnalytics />}
          title="Key Metrics"
          subtitle="Order mix and value"
          color={dashboardPalette.blue}
        />

        <Grid container spacing={1.5} sx={{ mt: 2.25 }}>
          {metricCards.map((metric) => (
            <Grid size={{ xs: 12, sm: 4 }} key={metric.title}>
              <Box
                sx={{
                  p: 1.65,
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #DDE5F0',
                  minHeight: 104,
                  boxShadow: 'none',
                  borderTop: `3px solid ${alpha(metric.accent, 0.72)}`,
                }}
              >
                <Stack direction="row" spacing={0.85} alignItems="center" mb={1.2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: metric.color,
                      flex: '0 0 auto',
                      '& svg': { width: 17, height: 17 },
                    }}
                  >
                    {metric.icon}
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: dashboardPalette.muted, lineHeight: 1.2 }}>
                    {metric.title}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: '1.28rem', fontWeight: 800, color: dashboardPalette.ink, overflowWrap: 'anywhere' }}>
                  {metric.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}
