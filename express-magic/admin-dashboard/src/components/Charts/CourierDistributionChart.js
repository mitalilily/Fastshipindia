import React from 'react'
import Chart from 'react-apexcharts'
import { useColorModeValue } from '@chakra-ui/react'

const CourierDistributionChart = ({ data = {} }) => {
  const textColor = useColorModeValue('gray.700', 'white')
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const chartColors = useColorModeValue(
    ['#0D1B4D', '#E31B2D', '#2B6CB0', '#22A06B', '#F59E0B'],
    ['#8DA9DD', '#FF7180', '#63B3ED', '#4ADE80', '#FBBF24']
  )

  const totalOrders = Object.values(data).reduce((sum, stats) => {
    if (typeof stats === 'object' && stats !== null && 'count' in stats) {
      return sum + (stats.count || 0)
    }
    return sum + (stats || 0)
  }, 0)

  // Calculate percentages for each aggregator
  const aggregatorData = Object.entries(data).map(([name, stats], index) => {
    const count = typeof stats === 'object' && stats !== null && 'count' in stats ? stats.count || 0 : stats || 0
    const percentage = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(1) : 0
    const revenue = typeof stats === 'object' && stats !== null && 'revenue' in stats ? stats.revenue || 0 : 0
    const deliveryRate = typeof stats === 'object' && stats !== null && 'deliveryRate' in stats ? stats.deliveryRate || 0 : 0
    
    return {
      name,
      count,
      percentage: parseFloat(percentage),
      revenue,
      deliveryRate,
      color: chartColors[index % chartColors.length],
    }
  })

  // Sort by count descending
  aggregatorData.sort((a, b) => b.count - a.count)

  const tooltipBg = useColorModeValue('#fff', '#1a202c')
  const tooltipTextColor = useColorModeValue('#1a202c', '#fff')

  const chartOptions = {
    chart: {
      type: 'bar',
      toolbar: {
        show: false,
      },
      animations: {
        enabled: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 8,
        distributed: true,
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      style: {
        colors: [bgColor],
        fontSize: '12px',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontWeight: 600,
      },
      formatter: (val, opts) => {
        const index = opts.dataPointIndex
        const item = aggregatorData[index]
        return `${item.count} orders (${item.percentage}%)`
      },
      offsetX: 10,
      dropShadow: {
        enabled: false,
      },
    },
    colors: aggregatorData.map(item => item.color),
    xaxis: {
      categories: aggregatorData.map(item => item.name),
      labels: {
        style: {
          colors: textColor,
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
        },
      },
      axisBorder: {
        color: borderColor,
      },
      axisTicks: {
        color: borderColor,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: textColor,
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
        },
      },
    },
    grid: {
      borderColor: borderColor,
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
    tooltip: {
      theme: useColorModeValue('light', 'dark'),
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
      },
      custom: ({ dataPointIndex }) => {
        const item = aggregatorData[dataPointIndex]
        return `
          <div style="padding: 12px; background: ${tooltipBg}; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: ${tooltipTextColor};">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: ${item.color};">${item.name}</div>
            <div style="font-size: 12px; margin-bottom: 4px;">Orders: <strong>${item.count}</strong> (${item.percentage}%)</div>
            <div style="font-size: 12px; margin-bottom: 4px;">Revenue: <strong>₹${item.revenue.toLocaleString('en-IN')}</strong></div>
            <div style="font-size: 12px;">Delivery Rate: <strong>${item.deliveryRate}%</strong></div>
          </div>
        `
      },
      marker: {
        show: true,
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          plotOptions: {
            bar: {
              barHeight: '50%',
            },
          },
          dataLabels: {
            style: {
              fontSize: '10px',
            },
          },
        },
      },
    ],
  }

  return (
    <Chart
      options={chartOptions}
      series={[{ name: 'Orders', data: aggregatorData.map(item => item.count) }]}
      type="bar"
      width="100%"
      height="240px"
    />
  )
}

export default CourierDistributionChart
