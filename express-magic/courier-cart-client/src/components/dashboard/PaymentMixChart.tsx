import React from 'react'
import { alpha, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { MdDonutLarge } from 'react-icons/md'
import DashboardWidgetHeader from './DashboardWidgetHeader'
import {
  dashboardCardContentSx,
  dashboardCardSx,
  dashboardChartBase,
  dashboardChartShellSx,
  dashboardPalette,
} from './dashboardStyles'

interface PaymentMixChartProps {
  metrics: {
    totalPrepaidOrders: number
    totalCodOrders: number
    prepaidRevenue: number
    codRevenue: number
  }
  ChartComponent: React.ComponentType<{ options: unknown; series: unknown; type: string; height: number }> | null
  formatCurrency: (amount: number) => string
}

export default function PaymentMixChart({ metrics, ChartComponent, formatCurrency }: PaymentMixChartProps) {
  const prepaidOrders = Number(metrics.totalPrepaidOrders) || 0
  const codOrders = Number(metrics.totalCodOrders) || 0
  const totalOrders = prepaidOrders + codOrders
  const hasOrders = totalOrders > 0
  const chartSeries = hasOrders ? [prepaidOrders, codOrders] : [1]

  const chartOptions = {
    chart: { ...dashboardChartBase, type: 'donut' as const },
    labels: hasOrders ? ['Prepaid', 'Cash on Delivery'] : ['No orders yet'],
    colors: hasOrders ? [dashboardPalette.blue, dashboardPalette.red] : ['#CBD5E1'],
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '74%',
          labels: {
            show: true,
            name: { show: true, fontSize: '12px', fontWeight: 700, color: dashboardPalette.muted },
            value: { show: false },
            total: {
              show: true,
              label: 'Total orders',
              fontSize: '12px',
              fontWeight: 700,
              color: dashboardPalette.muted,
              formatter: () => totalOrders.toLocaleString('en-IN'),
            },
          },
        },
      },
    },
    legend: {
      show: hasOrders,
      position: 'bottom' as const,
      fontSize: '12px',
      fontWeight: 600,
      labels: { colors: dashboardPalette.ink },
      markers: { width: 9, height: 9, radius: 9 },
    },
    stroke: { width: 4, colors: ['#FFFFFF'] },
    tooltip: { y: { formatter: (value: number) => `${value.toLocaleString('en-IN')} orders` } },
  }

  const rows = [
    { label: 'Prepaid revenue', value: formatCurrency(metrics.prepaidRevenue || 0), color: dashboardPalette.blue },
    { label: 'COD revenue', value: formatCurrency(metrics.codRevenue || 0), color: dashboardPalette.red },
  ]

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={dashboardCardContentSx}>
        <DashboardWidgetHeader
          icon={<MdDonutLarge />}
          title="Payment Mix"
          subtitle="Prepaid versus COD share"
          color={dashboardPalette.red}
        />

        <Box sx={{ ...dashboardChartShellSx, minHeight: { xs: 230, md: 250 }, mt: 1 }}>
          {ChartComponent ? (
            <ChartComponent options={chartOptions} series={chartSeries} type="donut" height={250} />
          ) : (
            <Box sx={{ height: 250, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={26} sx={{ color: dashboardPalette.red }} />
            </Box>
          )}
        </Box>

        <Stack spacing={0.85}>
          {rows.map((row) => (
            <Stack
              key={row.label}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ p: 1.05, borderRadius: '10px', bgcolor: alpha(row.color, 0.055) }}
            >
              <Stack direction="row" spacing={0.8} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color }} />
                <Typography sx={{ fontSize: '0.72rem', color: dashboardPalette.muted }}>{row.label}</Typography>
              </Stack>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: dashboardPalette.ink }}>
                {row.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}
