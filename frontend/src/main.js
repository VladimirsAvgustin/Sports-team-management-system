import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import axios from 'axios'
import { useAuthStore } from './stores/auth'
import i18n from './i18n'
import { setupApiLocale } from './utils/apiLocale'

import '@/assets/styles/global.css'

const LEGACY_CACHE_PREFIXES = ['sports-team']
const RELOAD_FLAG = 'legacy-pwa-cleanup-reloaded'

async function cleanupLegacyPwa() {
  if (typeof window === 'undefined') {
    return
  }

  let cleanedUp = false

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length > 0) {
        cleanedUp = true
        await Promise.all(registrations.map((registration) => registration.unregister()))
      }
    } catch (error) {
      console.warn('[App] Failed to unregister legacy service workers:', error)
    }
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      const staleCacheNames = cacheNames.filter((cacheName) =>
        LEGACY_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix))
      )

      if (staleCacheNames.length > 0) {
        cleanedUp = true
        await Promise.all(staleCacheNames.map((cacheName) => caches.delete(cacheName)))
      }
    } catch (error) {
      console.warn('[App] Failed to clear legacy caches:', error)
    }
  }

  if (!cleanedUp) {
    sessionStorage.removeItem(RELOAD_FLAG)
    return
  }

  if (!sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.setItem(RELOAD_FLAG, 'true')
    window.location.reload()
    return
  }

  sessionStorage.removeItem(RELOAD_FLAG)
}

void cleanupLegacyPwa()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

setupApiLocale(axios)

// Initialize auth store after pinia is set up
const authStore = useAuthStore()
authStore.initializeAuth()

// Set up axios defaults
const token = localStorage.getItem('token')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

app.mount('#app')
