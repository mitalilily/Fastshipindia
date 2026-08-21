import React from 'react'
import { Box, Card, CardContent } from '@mui/material'
import { MdPieChart } from 'react-icons/md'
import DashboardWidgetHeader from './DashboardWidgetHeader'
import {
  dashboardCardContentSx,
  dashboardCardSx,
  dashboardChartBase,
  dashboardChartShellSx,
  dashboardPalette,
} from './dashboardStyles'

interface OrderStatusChartProps {
  chartData: { status: string; count: number }[]
  ChartComponent: React.ComponentType<{ options: unknown; series: unknown; type: string; height: number }> | null
}

export default function OrderStatusChart({ chartData, ChartComponent }: OrderStatusChartProps) {
  const statusColors: Record<string, string> = {
    delivered: dashboardPalette.green,
    pending: dashboardPalette.amber,
    in_transit: dashboardPalette.blue,
    shipment_created: '#0F766E',
    cancelled: dashboardPalette.red,
    out_for_delivery: '#7C3AED',
    default: '#94A3B8',
  }

  const total = chartData?.reduce((sum, d) => sum + d.count, 0) || 0

  const chartOptions = {
    chart: {
      ...dashboardChartBase,
      type: 'donut' as const,
    },
    labels:
      chartData?.map((d) => d.status.charAt(0).toUpperCase() + d.status.slice(1).replace(/_/g, ' ')) || [],
    colors: chartData?.map((d) => statusColors[d.status.toLowerCase()] || statusColors.default) || [],
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '12px',
              fontWeight: 700,
              color: dashboardPalette.muted,
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 700,
              color: dashboardPalette.ink,
              formatter: () => total.toLocaleString(),
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '12px',
              fontWeight: 700,
              color: dashboardPalette.muted,
              formatter: () => total.toLocaleString(),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: 'bottom' as const,
      fontSize: '12px',
      fontWeight: 600,
      labels: { colors: dashboardPalette.ink },
      markers: { width: 10, height: 10, radius: 3 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val.toLocaleString()} orders`,
      },
    },
    stroke: {
      show: true,
      width: 3,
      colors: ['#FFFFFF'],
    },
  }

  const chartSeries = chartData?.map((d) => d.count) || []

  return (
    <Card sx={dashboardCardSx}>
      <CardContent sx={dashboardCardContentSx}>
        <DashboardWidgetHeader
          icon={<MdPieChart />}
          title="Order Status"
          subtitle="Breakdown by shipment state"
          color={dashboardPalette.blue}
        />
        <Box sx={dashboardChartShellSx}>
          {ChartComponent && <ChartComponent options={chartOptions} series={chartSeries} type="donut" height={300} />}
        </Box>
      </CardContent>
    </Card>
  )
}
