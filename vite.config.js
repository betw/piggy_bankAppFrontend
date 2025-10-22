import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Proxy any /api requests to the backend running on localhost:8000
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
