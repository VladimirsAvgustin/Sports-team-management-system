import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const certDir = path.resolve(__dirname, 'certs')
const keyFile = path.join(certDir, 'key.pem')
const certFile = path.join(certDir, 'cert.pem')

export default defineConfig(({ mode }) => {
  const useHttps = mode === 'https'
  const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000'
  let https = false

  if (useHttps) {
    if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
      https = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile)
      }
      console.log('Using HTTPS with self-signed certificate for PWA installation')
    } else {
      console.log('HTTPS certificates not found at:', certDir)
      console.log('Run: npm run gen-cert')
    }
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      https,
      hmr: useHttps ? {
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
          target: apiProxyTarget,
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
  }
})
