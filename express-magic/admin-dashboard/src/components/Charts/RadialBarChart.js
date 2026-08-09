import React from 'react'
import ReactApexChart from 'react-apexcharts'
import { useColorModeValue } from '@chakra-ui/react'

const RadialBarChart = ({ series = [], labels = [] }) => {
  const textColor = useColorModeValue('gray.700', 'white')
  const textColorSecondary = useColorModeValue('gray.500', 'gray.400')

  const chartOptions = {
    chart: {
      type: 'radialBar',
      toolbar: { show: false },
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '28%',
        },
        track: {
          background: useColorModeValue('#E5E7EB', '#334155'),
        },
        dataLabels: {
          name: {
            color: textColorSecondary,
            fontSize: '12px',
          },
          value: {
            color: textColor,
            fontSize: '26px',
            fontWeight: 800,
            formatter: (val) => `${Math.round(val)}%`,
          },
        },
      },
    },
    labels,
    colors: ['#062A5B', '#ED1C24', '#3E6AA8', '#86A8D3', '#B80F1A'],
    stroke: {
      lineCap: 'round',
    },
    legend: {
      show: true,
      position: 'bottom',
      labels: {
        colors: textColorSecondary,
      },
    },
  }

  return <ReactApexChart options={chartOptions} series={series} type="radialBar" width="100%" height="100%" />
}

export default RadialBarChart
