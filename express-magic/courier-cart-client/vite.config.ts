import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('apexcharts') || id.includes('react-apexcharts')) return 'charts'
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui'
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
            return 'react-core'
          }
          return undefined
        },
      },
    },
  },
})
