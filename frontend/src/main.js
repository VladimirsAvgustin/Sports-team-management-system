import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

import '@/assets/styles/global.css'

import '@/assets/fullcalendar/core.css';
import '@/assets/fullcalendar/daygrid.css';
import '@/assets/fullcalendar/timegrid.css';




const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')


// createApp(App).use(router).mount('#app')
