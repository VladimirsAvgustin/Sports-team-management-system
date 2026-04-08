import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check if HTTPS certificates exist
const certDir = path.resolve(__dirname, 'certs')
const keyFile = path.join(certDir, 'key.pem')
const certFile = path.join(certDir, 'cert.pem')

let https = false
if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  https = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile)
  }
  console.log('✅ Using HTTPS with self-signed certificate for PWA installation')
} else {
  console.log('⚠️  HTTPS certificates not found at:', certDir)
  console.log('   Run: npm run gen-cert')
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: https || false,
    hmr: https ? {
      host: '192.168.31.212',
      port: 5173,
      protocol: 'wss'
    } : {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      external: [
        '@fullcalendar/vue3',
        '@fullcalendar/daygrid',
        '@fullcalendar/timegrid',
        '@fullcalendar/interaction'
      ]
    }
  }
})
