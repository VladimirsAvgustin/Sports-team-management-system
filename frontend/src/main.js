import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import axios from 'axios'
import { useAuthStore } from './stores/auth'

import '@/assets/styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth store after pinia is set up
const authStore = useAuthStore()
authStore.initializeAuth()

// Set up axios defaults
const token = localStorage.getItem('token')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

app.mount('#app')


// createApp(App).use(router).mount('#app')
