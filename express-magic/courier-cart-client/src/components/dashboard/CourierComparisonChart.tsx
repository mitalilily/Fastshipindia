import React from 'react'
import { Box, Card, CardContent } from '@mui/material'
import { MdLocalShipping } from 'react-icons/md'
import DashboardWidgetHeader from './DashboardWidgetHeader'
import {
  dashboardCardContentSx,
  dashboardCardSx,
  dashboardChartBase,
  dashboardChartShellSx,
  dashboardPalette,
} from './dashboardStyles'

interface CourierComparisonChartProps {
  ordersData: { courier: string; count: number }[]
  ChartComponent: React.ComponentType<{ options: unknown; series: unknown; type: string; height: number }> | null
}

export default function CourierComparisonChart({
  ordersData,
  ChartComponent,
}: CourierComparisonChartProps) {
  const topCouriers = [...ordersData].sort((a, b) => b.count - a.count).slice(0, 5)
  const courierNames = topCouriers.map((d) => d.courier.charAt(0).toUpperCase() + d.courier.slice(1))
  const ordersSeries = topCouriers.map((d) => d.count)

  const chartOptions = {
    chart: {
      ...dashboardChartBase,
      type: 'bar' as const,
      stacked: false,
    },
    colors: [dashboardPalette.blue],
    xaxis: {
      categories: courierNames,
      labels: {
        style: { colors: dashboardPalette.muted, fontSize: '12px', fontWeight: 600 },
        trim: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: dashboardPalette.muted, fontSize: '12px' },
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
      y: { formatter: (val: number) => `${val.toLocaleString()} orders` },
    },
    legend: { show: false },
    grid: {
      borderColor: dashboardPalette.line,
      strokeDashArray: 4,
    },
  }

  const chartSeries = [
    {
      name: 'Orders',
      data: ordersSeries,
    },
  ]

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={dashboardCardContentSx}>
        <DashboardWidgetHeader
          icon={<MdLocalShipping />}
          title="Courier Comparison"
          subtitle="Top carriers by order count"
          color={dashboardPalette.blue}
        />
        <Box sx={dashboardChartShellSx}>
          {ChartComponent && <ChartComponent options={chartOptions} series={chartSeries} type="bar" height={285} />}
        </Box>
      </CardContent>
    </Card>
  )
}
