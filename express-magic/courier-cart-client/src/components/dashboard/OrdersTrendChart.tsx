import React, { useState } from 'react'
import { Box, Card, CardContent, CircularProgress, ToggleButton, ToggleButtonGroup, Stack, Typography } from '@mui/material'
import { FaChartLine } from 'react-icons/fa'
import { dashboardCardSx, dashboardChartBase, dashboardIconSx, dashboardPalette } from './dashboardStyles'

interface OrdersTrendChartProps {
  sevenDayOrders: { date: string; orders: number }[]
  thirtyDayOrders: { date: string; orders: number }[]
  sevenDayRevenue: { date: string; revenue: number }[]
  thirtyDayRevenue: { date: string; revenue: number }[]
  ChartComponent: React.ComponentType<{ options: unknown; series: unknown; type: string; height: number }> | null
}

export default function OrdersTrendChart({
  sevenDayOrders,
  thirtyDayOrders,
  sevenDayRevenue,
  thirtyDayRevenue,
  ChartComponent,
}: OrdersTrendChartProps) {
  const [range, setRange] = useState<'7d' | '30d'>('7d')
  const chartData = range === '7d' ? sevenDayOrders : thirtyDayOrders
  const revenueData = range === '7d' ? sevenDayRevenue : thirtyDayRevenue
  const formatChartDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return value
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    })
  }

  const chartOptions = {
    chart: {
      ...dashboardChartBase,
      type: 'area' as const,
      sparkline: { enabled: false },
      zoom: { enabled: false },
    },
    stroke: {
      curve: 'smooth' as const,
      width: [3, 2],
      lineCap: 'round' as const,
    },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.18,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    markers: { size: 0, hover: { size: 5 } },
    colors: [dashboardPalette.blue, dashboardPalette.orange],
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartData?.map((d) => formatChartDate(d.date)) || [],
      labels: { style: { colors: dashboardPalette.muted, fontSize: '12px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        title: { text: 'Orders', style: { color: dashboardPalette.muted, fontWeight: 500 } },
        labels: { style: { colors: dashboardPalette.muted, fontSize: '12px' } },
      },
      {
        opposite: true,
        title: { text: 'Revenue', style: { color: dashboardPalette.muted, fontWeight: 500 } },
        labels: {
          style: { colors: dashboardPalette.muted, fontSize: '12px' },
          formatter: (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`,
        },
      },
    ],
    tooltip: {
      theme: 'light',
      shared: true,
      y: {
        formatter: (val: number, context: { seriesIndex: number }) =>
          context.seriesIndex === 1 ? `₹${val.toLocaleString('en-IN')}` : `${val} orders`,
      },
    },
    grid: {
      borderColor: dashboardPalette.line,
      strokeDashArray: 4,
    },
  }

  const chartSeries = [
    {
      name: 'Orders',
      type: 'area',
      data: chartData?.map((d) => d.orders) || [],
    },
    {
      name: 'Revenue',
      type: 'line',
      data: revenueData?.map((d) => d.revenue) || [],
    },
  ]

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={{ p: 2.4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          gap={1.2}
          mb={2}
        >
          <Stack direction="row" spacing={1.2} alignItems="center" minWidth={0}>
            <Box sx={dashboardIconSx(dashboardPalette.blue)}>
              <FaChartLine size={17} />
            </Box>
            <Box minWidth={0}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: dashboardPalette.ink }}>
                Orders & Revenue Trend
              </Typography>
              <Typography sx={{ fontSize: '0.76rem', color: dashboardPalette.muted }}>
                Shipment volume with earned revenue
              </Typography>
            </Box>
          </Stack>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={range}
            onChange={(_, value: '7d' | '30d' | null) => value && setRange(value)}
            aria-label="Analytics range"
            sx={{
              flexShrink: 0,
              alignSelf: { xs: 'flex-end', sm: 'auto' },
              '& .MuiToggleButton-root': { px: 1.1, py: 0.45, fontSize: '0.72rem' },
            }}
          >
            <ToggleButton value="7d">7D</ToggleButton>
            <ToggleButton value="30d">30D</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {ChartComponent ? (
          <ChartComponent options={chartOptions} series={chartSeries} type="area" height={300} />
        ) : (
          <Box sx={{ height: 300, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={26} thickness={4} sx={{ color: dashboardPalette.blue }} />
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
