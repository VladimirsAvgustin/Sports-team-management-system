<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import LoginModal from './components/LoginModal.vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import JoinTeamModal from './components/JoinTeamModal.vue'

// Authentication store
const auth = useAuthStore()
const router = useRouter()

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
  auth.user?.role === 'Player' && !userTeam.value
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

async function handleLogin(username, password) {
  try {
    await auth.login(username, password)
    closeLoginModal()
  } catch (e) {
    alert('Login error: ' + e.message)
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
      alert('You have joined the team!')
      await fetchMyTeam()
      closeJoinTeamModal()
    } else {
      alert(result.message || 'Failed to join the team')
    }
  } catch (err) {
    console.error(err)
    alert('Something went wrong')
  }
}


// Dark mode toggle
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', isDarkMode.value ? 'enabled' : 'disabled')
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
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
})

// If token changed (logged in/out) - refresh team
watch(() => auth.isAuthenticated, async () => {
  await fetchMyTeam()
})
</script>

<template>
  <div id="app">
    <header>
      <nav>
        <ul id="pc">
          <li><router-link to="/">Home</router-link></li>

          <li><router-link to="/contact">Contact</router-link></li>
        </ul>

        
        <div class="team-actions">
          <button 
            v-if="showCreateTeam" 
            @click="goToCreateTeam"
            class="create-team-btn"
          >
            Create Team
          </button>

          <button 
            v-if="hasTeam" 
            @click="goToMyTeam"
            class="create-team-btn"
          >
            {{ userTeam.name }}
          </button>

          <button 
            v-if="hasTeam" 
            @click="goToSchedule"
            class="create-team-btn"
          >
            Schedule
          </button>

          <button 
          v-if="showJoinTeam" 
          @click="openJoinTeamModal"
          class="create-team-btn"
        >
          Join Team
        </button>
        </div>

        <div class="nav-actions">
          <button class="toggle-dark-mode" @click="toggleDarkMode">
            {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
          </button>

          <router-link
          v-if="!isLoggedIn"
          to="/register" class="login-btn registration-btn"
          >
            Registration
          </router-link>
         
          <button
            v-if="!isLoggedIn"
            class="login-btn"
            @click="openLoginModal"
          >
            Login
          </button>

          <router-link
            v-else
            to="/profile"
            class="login-btn"
          >
            {{ auth.user?.username }}
          </router-link>
        </div>
      </nav>
    </header>

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

html, body {
  height: 100%;
  background-color: #f4f4f4;
  color: #333;
  transition: background 0.3s, color 0.3s;
}

/* ========== Dark Mode ========== */
.dark-mode {
  background-color: #222;
  color: #f4f4f4;
}

.dark-mode nav,
.dark-mode footer {
  background-color: #111;
}

.dark-mode .card,
.dark-mode aside,
.dark-mode .modal-content {
  background-color: #333;
  color: white;
}

.dark-mode .btn,
.dark-mode .toggle-dark-mode {
  background-color: #ff9800;
  color: black;
}

.dark-mode img {
  filter: brightness(0.8);
}

/* ========== Navigation ========== */
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0073e6;
  padding: 15px 30px;
}

nav ul {
  list-style: none;
  display: flex;
}

nav ul li {
  margin: 0 15px;
  position: relative;
}

nav ul li a {
  color: white;
  text-decoration: none;
  font-size: 16px;
}

nav ul li a:hover {
  text-decoration: underline;
}

/* ========== Dropdown ========== */
.dropdown-content {
  display: none;
  position: absolute;
  background-color: white;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  padding: 10px;
  top: 100%;
  left: 0;
  min-width: 150px;
  z-index: 100;
}

.dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-content li {
  margin: 5px 0;
}

.dropdown-content li a {
  color: #333;
  text-decoration: none;
}

.dropdown-content li a:hover {
  background: #f0f0f0;
}

/* ========== Buttons ========== */
.btn,
.toggle-dark-mode {
  background: #122f4d;
  color: white;
  padding: 10px 15px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  font-size: 14px;
  transition: background 0.3s, transform 0.2s;
  margin-right: 20px;
}

.btn:hover,
.toggle-dark-mode:hover {
  background: #ff9800;
  transform: scale(1.05);
}

.login-btn {
  background-color: white;
  color: #111;
  border: 2px solid var(--primary-color);
  padding: 8px 15px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s, color 0.3s, border-color 0.3s;
}

.login-btn:hover {
  background-color: var(--primary-color);
  color: white;
}

.dark-mode .btn:hover,
.toggle-dark-mode:hover {
  background: #212faf;
  transform: scale(1.05);
}
.dark-mode .login-btn {
  background: #ff9800;
}

.dark-mode .login-btn:hover {
  background: #e68900;
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
  transition: transform 0.3s;
}

.card:hover {
  transform: scale(1.05);
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
@media (max-width: 768px) {
  nav {
    flex-direction: column;
  }

  nav ul {
    flex-direction: column;
  }

  nav ul li {
    margin: 10px 0;
  }

  .card-container {
    flex-direction: column;
    align-items: center;
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
  transition: background 0.3s, transform 0.2s;
}

.create-team-btn:hover {
  background: linear-gradient(45deg, #005bb5, #0099cc);
  transform: scale(1.05);
}
.create-team-btn:active {
  transform: scale(0.95);
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
  transform: translateY(-1px);
}
</style>