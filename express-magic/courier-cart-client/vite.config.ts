import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, '/')
          if (!moduleId.includes('/node_modules/')) return undefined

          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(moduleId)) {
            return 'vendor-react'
          }
          if (moduleId.includes('/node_modules/react-router')) return 'vendor-router'
          if (moduleId.includes('/node_modules/@tanstack/react-query/')) return 'vendor-query'
          if (moduleId.includes('/node_modules/@emotion/')) return 'vendor-emotion'
          if (moduleId.includes('/node_modules/axios/')) return 'vendor-http'
          if (
            /\/node_modules\/(socket\.io-client|socket\.io-parser|engine\.io-client|engine\.io-parser)\//.test(
              moduleId,
            )
          ) {
            return 'vendor-socket'
          }

          return undefined
        },
      },
    },
  },
})
