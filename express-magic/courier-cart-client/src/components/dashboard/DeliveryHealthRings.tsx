import React from 'react'
import { alpha, Box, Card, CardContent, CircularProgress, Grid, Stack, Typography } from '@mui/material'
import { MdSpeed } from 'react-icons/md'
import { dashboardCardSx, dashboardChartBase, dashboardIconSx, dashboardPalette } from './dashboardStyles'

interface DeliveryHealthRingsProps {
  operational: {
    deliverySuccessRate: number
    ndrRate: number
    rtoRate: number
    avgDeliveryTime: number
    totalOrders: number
  }
  ChartComponent: React.ComponentType<{ options: unknown; series: unknown; type: string; height: number }> | null
}

const clampPercentage = (value: number) => Math.min(100, Math.max(0, Number(value) || 0))

export default function DeliveryHealthRings({ operational, ChartComponent }: DeliveryHealthRingsProps) {
  const deliverySuccess = clampPercentage(operational.deliverySuccessRate)
  const ndrControl = clampPercentage(100 - (operational.ndrRate || 0))
  const rtoControl = clampPercentage(100 - (operational.rtoRate || 0))

  const chartOptions = {
    chart: { ...dashboardChartBase, type: 'radialBar' as const },
    colors: [dashboardPalette.blue, dashboardPalette.red, '#315F9B'],
    labels: ['Delivery success', 'NDR control', 'RTO control'],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 225,
        hollow: { size: '24%', background: 'transparent' },
        track: { background: dashboardPalette.track, strokeWidth: '96%', margin: 7 },
        dataLabels: {
          name: { fontSize: '12px', fontWeight: 700, color: dashboardPalette.muted },
          value: {
            fontSize: '21px',
            fontWeight: 700,
            color: dashboardPalette.ink,
            formatter: (value: number) => `${Math.round(value)}%`,
          },
          total: {
            show: true,
            label: 'Health score',
            color: dashboardPalette.muted,
            fontSize: '12px',
            fontWeight: 700,
            formatter: () => `${Math.round((deliverySuccess + ndrControl + rtoControl) / 3)}%`,
          },
        },
      },
    },
    legend: {
      show: true,
      position: 'bottom' as const,
      fontSize: '11px',
      fontWeight: 600,
      labels: { colors: dashboardPalette.ink },
      markers: { width: 9, height: 9, radius: 9 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    stroke: { lineCap: 'round' as const },
  }

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={{ p: 2.4 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" mb={1.2}>
          <Box sx={dashboardIconSx(dashboardPalette.blue)}>
            <MdSpeed size={20} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: dashboardPalette.ink }}>
              Delivery Health
            </Typography>
            <Typography sx={{ fontSize: '0.76rem', color: dashboardPalette.muted }}>
              Success and exception control
            </Typography>
          </Box>
        </Stack>

        {ChartComponent ? (
          <ChartComponent
            options={chartOptions}
            series={[deliverySuccess, ndrControl, rtoControl]}
            type="radialBar"
            height={285}
          />
        ) : (
          <Box sx={{ height: 285, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={26} sx={{ color: dashboardPalette.blue }} />
          </Box>
        )}

        <Grid container spacing={1}>
          {[
            ['Avg delivery', `${operational.avgDeliveryTime || 0} days`],
            ['Analysed orders', (operational.totalOrders || 0).toLocaleString('en-IN')],
          ].map(([label, value]) => (
            <Grid size={6} key={label}>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: '11px',
                  bgcolor: alpha(dashboardPalette.blue, 0.055),
                  border: `1px solid ${alpha(dashboardPalette.blue, 0.14)}`,
                }}
              >
                <Typography sx={{ fontSize: '0.68rem', color: dashboardPalette.muted }}>{label}</Typography>
                <Typography sx={{ mt: 0.25, fontSize: '0.92rem', fontWeight: 700, color: dashboardPalette.ink }}>
                  {value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}
