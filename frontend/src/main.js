import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import axios from 'axios'
import { useAuthStore } from './stores/auth'
import i18n from './i18n'

import '@/assets/styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Initialize auth store after pinia is set up
const authStore = useAuthStore()
authStore.initializeAuth()

// Set up axios defaults
const token = localStorage.getItem('token')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

app.mount('#app')

// ============================================================
// PWA - Запуск приложения как standalone
// ============================================================

// Проверяем что приложение запущено как PWA
const isStandalone = window.navigator.standalone === true || 
                     window.matchMedia('(display-mode: standalone)').matches ||
                     window.matchMedia('(display-mode: fullscreen)').matches

console.log('[PWA] Application mode:', {
  standalone: window.navigator.standalone,
  displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
  isStandalone: isStandalone
})

// Обработчик смены режима отображения
window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
  console.log('[PWA] Display mode changed:', e.matches ? 'standalone' : 'browser')
})

// Убедимся что приложение останется fullscreen в PWA режиме
if (isStandalone) {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}

// Обработка событий из системы при запуске приложения
document.addEventListener('visibilitychange', () => {
  console.log('[PWA] Visibility changed:', document.hidden ? 'hidden' : 'visible')
})

// createApp(App).use(router).mount('#app')
