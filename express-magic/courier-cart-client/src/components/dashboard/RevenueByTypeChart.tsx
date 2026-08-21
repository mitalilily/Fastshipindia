import React from 'react'
import { Box, Card, CardContent } from '@mui/material'
import { MdMonetizationOn } from 'react-icons/md'
import DashboardWidgetHeader from './DashboardWidgetHeader'
import {
  dashboardCardContentSx,
  dashboardCardSx,
  dashboardChartBase,
  dashboardChartShellSx,
  dashboardPalette,
} from './dashboardStyles'

interface RevenueByTypeChartProps {
  chartData: { type: string; revenue: number }[]
  ChartComponent: React.ComponentType<{ options: unknown; series: unknown; type: string; height: number }> | null
  formatCurrency: (amount: number) => string
}

export default function RevenueByTypeChart({
  chartData,
  ChartComponent,
  formatCurrency,
}: RevenueByTypeChartProps) {
  const chartOptions = {
    chart: {
      ...dashboardChartBase,
      type: 'bar' as const,
      stacked: false,
    },
    colors: [dashboardPalette.green],
    xaxis: {
      categories: chartData?.map((d) => d.type.charAt(0).toUpperCase() + d.type.slice(1)) || [],
      labels: {
        style: { colors: dashboardPalette.muted, fontSize: '12px' },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: dashboardPalette.muted, fontSize: '12px' },
        formatter: (val: number) => `Rs. ${(val / 1000).toFixed(1)}k`,
      },
    },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 2,
        columnWidth: '42%',
      },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
    grid: {
      borderColor: dashboardPalette.line,
      strokeDashArray: 4,
    },
  }

  const chartSeries = [
    {
      name: 'Revenue',
      data: chartData?.map((d) => d.revenue) || [],
    },
  ]

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={dashboardCardContentSx}>
        <DashboardWidgetHeader
          icon={<MdMonetizationOn />}
          title="Revenue by Type"
          subtitle="Split by payment mode"
          color={dashboardPalette.green}
        />
        <Box sx={dashboardChartShellSx}>
          {ChartComponent && <ChartComponent options={chartOptions} series={chartSeries} type="bar" height={285} />}
        </Box>
      </CardContent>
    </Card>
  )
}
