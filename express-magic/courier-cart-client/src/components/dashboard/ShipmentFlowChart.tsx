import React from 'react'
import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { MdTimeline } from 'react-icons/md'
import { dashboardCardSx, dashboardChartBase, dashboardIconSx, dashboardPalette } from './dashboardStyles'

interface ShipmentFlowChartProps {
  todayOps: {
    orders: number
    pending: number
    inTransit: number
    delivered: number
  }
  ChartComponent: React.ComponentType<{ options: unknown; series: unknown; type: string; height: number }> | null
}

export default function ShipmentFlowChart({ todayOps, ChartComponent }: ShipmentFlowChartProps) {
  const stages = [
    { label: 'Orders', value: Number(todayOps.orders) || 0 },
    { label: 'Pending', value: Number(todayOps.pending) || 0 },
    { label: 'In transit', value: Number(todayOps.inTransit) || 0 },
    { label: 'Delivered', value: Number(todayOps.delivered) || 0 },
  ]

  const chartOptions = {
    chart: { ...dashboardChartBase, type: 'bar' as const },
    colors: [dashboardPalette.blue, dashboardPalette.red, '#315F9B', '#0B3A78'],
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 7,
        barHeight: '56%',
        dataLabels: { position: 'top' as const },
      },
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start' as const,
      offsetX: 8,
      style: { colors: [dashboardPalette.ink], fontSize: '12px', fontWeight: 700 },
      formatter: (value: number) => value.toLocaleString('en-IN'),
    },
    xaxis: {
      categories: stages.map((stage) => stage.label),
      labels: { style: { colors: dashboardPalette.muted, fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: dashboardPalette.ink, fontSize: '12px', fontWeight: 600 } } },
    grid: { borderColor: dashboardPalette.line, strokeDashArray: 4, padding: { right: 35 } },
    legend: { show: false },
    tooltip: { y: { formatter: (value: number) => `${value.toLocaleString('en-IN')} shipments` } },
  }

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={{ p: 2.4 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
          <Box sx={dashboardIconSx(dashboardPalette.blue)}>
            <MdTimeline size={20} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: dashboardPalette.ink }}>
              Shipment Lifecycle
            </Typography>
            <Typography sx={{ fontSize: '0.76rem', color: dashboardPalette.muted }}>
              Today's operational flow
            </Typography>
          </Box>
        </Stack>
        {ChartComponent ? (
          <ChartComponent
            options={chartOptions}
            series={[{ name: 'Shipments', data: stages.map((stage) => stage.value) }]}
            type="bar"
            height={300}
          />
        ) : (
          <Box sx={{ height: 300, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={26} sx={{ color: dashboardPalette.blue }} />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
