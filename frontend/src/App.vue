<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import LoginModal from './components/LoginModal.vue'
// import PWAInstallPrompt from './components/PWAInstallPrompt.vue' // DISABLED for now
import MobileNav from './components/MobileNav.vue'
import axios from 'axios'
import { useRouter, useRoute } from 'vue-router'
import JoinTeamModal from './components/JoinTeamModal.vue'
import { useI18n } from 'vue-i18n'

// Authentication store
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { locale, t } = useI18n()

// States
const showLoginModal = ref(false)
const isDarkMode = ref(false)

const userTeam = ref(null);

// Computed auth flag
const isLoggedIn = computed(() => auth.isAuthenticated)

// Whether to show create team button
const showCreateTeam = computed(() =>
  auth.user?.role === 'Coach' && !userTeam.value
)

const showJoinTeam = computed(() =>
  (auth.user?.role === 'Player' || auth.user?.role === 'Coach') && !userTeam.value
)

// Whether user has a team
const hasTeam = computed(() => !!userTeam.value)

const openLoginModal  = () => showLoginModal.value = true
const closeLoginModal = () => showLoginModal.value = false

const showJoinTeamModal = ref(false)

const openJoinTeamModal = () => {
  showJoinTeamModal.value = true
}

const closeJoinTeamModal = () => {
  showJoinTeamModal.value = false
}

const handleTeamJoined = (team) => {
  userTeam.value = team
}

async function handleLogin(email, password) {
  try {
    await auth.login(email, password)
    closeLoginModal()
  } catch (e) {
    alert(t('messages.loginError') + ': ' + e.message)
  }
}

const handleJoin = async (teamCode) => {
  try {
    const response = await fetch('/api/auth/join-team', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}` // ⬅️ если нужно
      },
      body: JSON.stringify({ teamCode })
    })

    const result = await response.json()

    if (response.ok) {
      alert(t('messages.teamJoined'))
      await fetchMyTeam()
      closeJoinTeamModal()
    } else {
      alert(result.message || t('messages.failedToJoinTeam'))
    }
  } catch (err) {
    console.error(err)
    alert(t('messages.somethingWentWrong'))
  }
}


// Dark mode toggle
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', isDarkMode.value ? 'enabled' : 'disabled')
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
  document.body.classList.toggle('dark-mode', isDarkMode.value)
}

// Language toggle
function toggleLanguage() {
  locale.value = locale.value === 'en' ? 'lv' : 'en'
  localStorage.setItem('locale', locale.value)
}

// Navigation
const goToCreateTeam = () => {
  router.push('/create-team')
}

const goToMyTeam = () => {
  if (userTeam.value) {
    router.push(`/team/${userTeam.value.id}`)
  }
}
const goToSchedule = () => {
  if (userTeam.value) {
    router.push(`/team-schedule/${userTeam.value.id}`)
  }
}

// Method that uses token from Pinia and loads team
async function fetchMyTeam() {
  if (!auth.token) {
   userTeam.value = null
    return
  }

  try {
    const res = await axios.get('/api/auth/my-team', {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    userTeam.value = res.data.team
  } catch (err) {
    if (err.response?.status === 404) {
      userTeam.value = null
    } else {
      console.error('Error loading team:', err)
    }
  }
}

onMounted(async () => {
  // First authenticate
  await auth.fetchUser()
  // Then try to get team (if logged in)
  await fetchMyTeam()

  isDarkMode.value = localStorage.getItem('darkMode') === 'enabled'
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
  document.body.classList.toggle('dark-mode', isDarkMode.value)
})

// If token changed (logged in/out) - refresh team
watch(() => auth.isAuthenticated, async () => {
  await fetchMyTeam()
})

// Refresh team when navigating to home page
watch(() => route.path, async (newPath) => {
  if (newPath === '/') {
    await fetchMyTeam()
  }
})
</script>

<template>
  <div id="app">
    <!-- PWA Install Prompt - DISABLED for now -->
    <!-- <PWAInstallPrompt /> -->

    <!-- Mobile Navigation Component -->
    <MobileNav 
      :is-logged-in="isLoggedIn"
      :show-create-team="showCreateTeam"
      :show-join-team="showJoinTeam"
      :has-team="hasTeam"
      :user-team="userTeam"
      :is-dark-mode="isDarkMode"
      :locale="locale"
      :auth="auth"
      @toggle-dark-mode="toggleDarkMode"
      @toggle-language="toggleLanguage"
      @open-login="openLoginModal"
      @open-join-team="openJoinTeamModal"
      @go-to-create-team="goToCreateTeam"
      @go-to-team="goToMyTeam"
      @go-to-schedule="goToSchedule"
      @go-to-chat="() => router.push('/chat')"
      @go-to-profile="() => router.push('/profile')"
      @go-to-register="() => router.push('/register')"
      @logout="auth.logout"
    />

    <router-view :key="$route.fullPath" />

    <LoginModal
      v-if="showLoginModal"
      @close="closeLoginModal"
      @login="handleLogin"
    />
    <JoinTeamModal
      v-if="showJoinTeamModal"
      @close="closeJoinTeamModal"
      @join="handleJoin"
    />
  </div>

</template>

<style>
/* ========== Base Reset ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Arial', sans-serif;
}

html, body, #app {
  height: 100%;
  min-height: 100vh;
  background-color: var(--background-color);
  color: var(--text-color);
  transition: background 0.3s, color 0.3s;
}

/* ========== Dark Mode ========== */
.dark-mode,
.dark-mode body,
.dark-mode #app {
  background-color: #121212;
  color: #f4f4f4;
}

.dark-mode .card,
.dark-mode aside,
.dark-mode .modal-content {
  background-color: #333;
  color: white;
}

.dark-mode .btn {
  background-color: #ff9800;
  color: black;
}

.dark-mode img {
  filter: brightness(0.8);
}

/* ========== Cards ========== */
.card-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin: 20px 0;
}

.card {
  background: white;
  width: 300px;
  padding: 20px;
  margin: 10px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.card:hover {
  box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.14);
}

.card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}

/* ========== Footer ========== */
footer {
  text-align: center;
  padding: 20px;
  background: #333;
  color: white;
  margin-top: 50px;
}

.footer-links {
  list-style: none;
  padding: 0;
}

.footer-links li {
  display: inline;
  margin: 0 10px;
}

.footer-links li a {
  color: white;
  text-decoration: none;
}

.footer-links li a:hover {
  text-decoration: underline;
}

/* ========== Modal (Login) ========== */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  animation: fadeIn 0.3s;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  color: red;
  font-size: 24px;
  cursor: pointer;
}

.close-btn:hover {
  color: darkred;
}

.modal-content form {
  margin-top: 20px;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

/* Fade-in Animation */
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* ========== Responsive ========== */
@media (max-width: 1024px) {
  nav {
    padding: 12px 20px;
    gap: 8px;
  }

  nav ul {
    gap: 15px;
  }

  .nav-actions {
    gap: 8px;
  }

  .nav-actions button,
  .nav-actions a {
    padding: 8px 12px;
    font-size: 13px;
  }

  .team-actions {
    gap: 8px;
  }

  .team-actions button {
    padding: 8px 12px;
    font-size: 13px;
  }
}

@media (max-width: 768px) {
  nav {
    flex-direction: column;
    align-items: stretch;
    padding: 10px;
  }

  nav ul {
    flex-direction: column;
    gap: 0;
    width: 100%;
  }

  nav ul li {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  nav ul li a {
    padding: 12px;
    font-size: 15px;
  }

  .team-actions {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .team-actions button {
    width: 100%;
    padding: 12px;
    font-size: 14px;
  }

  .nav-actions {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .nav-actions button,
  .nav-actions a {
    width: 100%;
    padding: 12px;
    font-size: 14px;
  }

  .card-container {
    flex-direction: column;
    align-items: center;
  }

  .card {
    width: 100%;
    max-width: 400px;
  }

  .modal-content {
    max-width: 95%;
  }

  .registration-btn {
    margin-right: 0;
  }
}

@media (max-width: 480px) {
  nav {
    padding: 8px;
    gap: 6px;
    flex-direction: column;
  }

  nav ul {
    flex-direction: column;
    gap: 0;
    width: 100%;
  }

  nav ul li {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  nav ul li a {
    padding: 12px;
    font-size: 14px;
    width: 100%;
  }

  .team-actions,
  .nav-actions {
    gap: 6px;
    flex-direction: column;
    width: 100%;
  }

  .team-actions button,
  .nav-actions button,
  .nav-actions a {
    padding: 12px 8px;
    font-size: 13px;
    min-height: 48px;
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .create-team-btn {
    padding: 12px;
    font-size: 13px;
    width: 100%;
  }

  .btn,
  .toggle-dark-mode,
  .toggle-lang-btn {
    padding: 10px 8px;
    font-size: 12px;
    margin-right: 0;
    width: 100%;
  }

  .login-btn {
    width: 100%;
    padding: 12px;
    font-size: 13px;
  }

  .registration-btn {
    margin-right: 0;
  }
}

/* Landscape orientation */
@media (max-height: 500px) and (orientation: landscape) {
  nav {
    padding: 8px;
  }

  nav ul li a {
    padding: 8px;
    font-size: 12px;
  }
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-actions button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.user-actions button:hover {
  background-color: #d32f2f;
}

.create-team-btn {
  background: linear-gradient(45deg, #0073e6, #00c6ff);
  color: white;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  cursor: pointer;
  transition: background 0.3s;
}

.create-team-btn:hover {
  background: linear-gradient(45deg, #005bb5, #0099cc);
}
.create-team-btn:active {
  opacity: 0.9;
}
.registration-btn {
  text-decoration: none;
  font-weight: normal;
  margin-right: 30px;
}

.registration-btn:hover {
  text-decoration: underline;
}

.team-actions {
  display: flex;
  gap: 10px;
  margin-right: auto;
}

.create-team-btn {
  background: linear-gradient(45deg, #0073e6, #00c6ff);
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.create-team-btn:hover {
  opacity: 0.9;
}

/* LoginModal in Dark Mode */
.dark-mode .modal-content {
  background: #1f2937;
  border: none;
}

.dark-mode .modal-content h2 {
  color: #ffffff !important;
}

.dark-mode .modal-content label {
  color: #ffffff !important;
}

.dark-mode .modal-content input {
  background: #374151;
  color: #ffffff;
  border: 1px solid #4b5563;
}

.dark-mode .modal-content input:focus {
  outline: 2px solid #60a5fa;
  border-color: #60a5fa;
}

.dark-mode .modal-content .btn {
  background: #fbbf24 !important;
  color: #111827 !important;
  border: none;
}

.dark-mode .modal-content .btn:hover {
  background: #f59e0b !important;
}
</style>