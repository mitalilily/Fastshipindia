import React from 'react'
import ReactApexChart from 'react-apexcharts'
import { useColorModeValue } from '@chakra-ui/react'
import { BRAND } from '../../constants/brand'

const OrdersLineChart = ({ data = [] }) => {
  const textColor = useColorModeValue('gray.700', 'white')
  const textColorSecondary = useColorModeValue('gray.500', 'gray.400')
  const gridColor = useColorModeValue('gray.200', 'gray.700')
  const gradientStops = [
    { offset: 0, color: BRAND.colors.teal, opacity: 0.82 },
    { offset: 58, color: '#3E6AA8', opacity: 0.5 },
    { offset: 100, color: BRAND.colors.orange, opacity: 0.18 },
  ]

  const chartData = [
    {
      name: 'Orders',
      data: data.map((item) => item.orders || 0),
    },
  ]

  const chartOptions = {
    chart: {
      toolbar: {
        show: false,
      },
      type: 'area',
      height: '100%',
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
      sparkline: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      lineCap: 'round',
      colors: [BRAND.colors.teal],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: [BRAND.colors.orange],
        inverseColors: false,
        opacityFrom: 0.8,
        opacityTo: 0.2,
        stops: [0, 50, 100],
        colorStops: gradientStops,
      },
    },
    colors: [BRAND.colors.teal],
    markers: {
      size: 5,
      colors: [BRAND.colors.orange],
      strokeColors: '#fff',
      strokeWidth: 2,
      hover: {
        size: 7,
      },
    },
    xaxis: {
      categories: data.map((item) => formatChartDate(item.date)),
      labels: {
        style: {
          colors: textColorSecondary,
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: textColorSecondary,
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
        },
        formatter: (val) => Math.round(val).toString(),
      },
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
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
      y: {
        formatter: (val) => `${val} orders`,
      },
      marker: {
        show: true,
      },
    },
    legend: {
      show: false,
    },
  }

  return (
    <ReactApexChart
      options={chartOptions}
      series={chartData}
      type="area"
      width="100%"
      height="100%"
    />
  )
}

export default OrdersLineChart
  const formatChartDate = (value) => {
    const [year, month, day] = String(value || '')
      .split('-')
      .map(Number)
    if (!year || !month || !day) return value
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
