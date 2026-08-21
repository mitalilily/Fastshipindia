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
    },
    {
      title: 'Prepaid Orders',
      value: metrics.totalPrepaidOrders?.toLocaleString() || '0',
      icon: <MdShoppingBag size={20} />,
      color: '#0F766E',
    },
    {
      title: 'COD Orders',
      value: metrics.totalCodOrders?.toLocaleString() || '0',
      icon: <TbCurrencyRupee size={20} />,
      color: dashboardPalette.amber,
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
                  p: 1.7,
                  borderRadius: '12px',
                  background: alpha(metric.color, 0.055),
                  border: `1px solid ${alpha(metric.color, 0.16)}`,
                  minHeight: 108,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '9px',
                      display: 'grid',
                      placeItems: 'center',
                      color: metric.color,
                      bgcolor: alpha(metric.color, 0.1),
                      flex: '0 0 auto',
                    }}
                  >
                    {metric.icon}
                  </Box>
                  <Typography sx={{ fontSize: '0.74rem', fontWeight: 500, color: dashboardPalette.muted, lineHeight: 1.2 }}>
                    {metric.title}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: dashboardPalette.ink, overflowWrap: 'anywhere' }}>
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
