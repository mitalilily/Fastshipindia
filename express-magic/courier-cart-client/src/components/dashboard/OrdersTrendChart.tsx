import React, { useState } from 'react'
import { Box, Card, CardContent, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { FaChartLine } from 'react-icons/fa'
import DashboardWidgetHeader from './DashboardWidgetHeader'
import {
  dashboardCardContentSx,
  dashboardCardSx,
  dashboardChartBase,
  dashboardChartShellSx,
  dashboardPalette,
} from './dashboardStyles'

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
      <CardContent sx={dashboardCardContentSx}>
        <DashboardWidgetHeader
          icon={<FaChartLine />}
          title="Orders & Revenue Trend"
          subtitle="Shipment volume with earned revenue"
          color={dashboardPalette.blue}
          action={
            <ToggleButtonGroup
              exclusive
              size="small"
              value={range}
              onChange={(_, value: '7d' | '30d' | null) => value && setRange(value)}
              aria-label="Analytics range"
              sx={{
                '& .MuiToggleButton-root': {
                  minWidth: 38,
                  px: 1,
                  py: 0.45,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  borderColor: 'var(--dashboard-line)',
                },
              }}
            >
              <ToggleButton value="7d">7D</ToggleButton>
              <ToggleButton value="30d">30D</ToggleButton>
            </ToggleButtonGroup>
          }
        />
        <Box sx={dashboardChartShellSx}>
          {ChartComponent ? (
            <ChartComponent options={chartOptions} series={chartSeries} type="area" height={285} />
          ) : (
            <Box sx={{ height: 285, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={26} thickness={4} sx={{ color: dashboardPalette.blue }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
