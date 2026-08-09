import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const vendorChunks = [
  {
    name: 'vendor-react',
    packages: ['react', 'react-dom', 'react-router-dom'],
  },
  {
    name: 'vendor-mui',
    packages: ['@mui/material', '@mui/system', '@mui/x-date-pickers', '@emotion/react', '@emotion/styled'],
  },
  {
    name: 'vendor-data',
    packages: ['@tanstack/react-query', 'axios', 'qs'],
  },
  {
    name: 'vendor-charts',
    packages: ['apexcharts', 'react-apexcharts'],
  },
  {
    name: 'vendor-maps',
    packages: ['leaflet', 'react-leaflet'],
  },
  {
    name: 'vendor-tools',
    packages: ['moment', 'date-fns', 'papaparse', 'file-saver', 'react-barcode'],
  },
  {
    name: 'vendor-visuals',
    packages: ['three', 'lottie-react', 'gsap'],
  },
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          const normalizedId = id.replace(/\\/g, '/')
          const matchedChunk = vendorChunks.find((chunk) =>
            chunk.packages.some((packageName) => normalizedId.includes(`/node_modules/${packageName}/`)),
          )

          return matchedChunk?.name || 'vendor'
        },
      },
    },
  },
})
