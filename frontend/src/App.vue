<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from './stores/auth'
import LoginModal from './components/LoginModal.vue'

// Стор для аутентификации
const auth = useAuthStore()

// Состояния
const showLoginModal = ref(false)
const isDarkMode = ref(false)

// При монтировании подгружаем пользователя и тему
onMounted(() => {
  auth.fetchUser()
  isDarkMode.value = localStorage.getItem('darkMode') === 'enabled'
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
})

// Открыть/закрыть модалку входа
const openLoginModal  = () => showLoginModal.value = true
const closeLoginModal = () => showLoginModal.value = false

// Обработчик логина из модалки
async function handleLogin(username, password) {
  try {
    await auth.login(username, password)
    closeLoginModal()
  } catch (e) {
    alert('Ошибка входа: ' + e.message)
  }
}

// Переключатель темной темы
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', isDarkMode.value ? 'enabled' : 'disabled')
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
}

// Вычисляемый флаг авторизации
const isLoggedIn = computed(() => auth.isAuthenticated)
</script>

<template>
  <div id="app">
    <header>
      <nav>
        <ul id="pc">
          <li><router-link to="/">Home</router-link></li>
          <li class="dropdown">
            <a href="#">Services</a>
            <ul class="dropdown-content">
              <li><a href="#">Team Management</a></li>
              <li><a href="#">Schedule Organization</a></li>
              <li><a href="#">Player Statistics</a></li>
            </ul>
          </li>
          <li><router-link to="/contact">Contact</router-link></li>
          <li><router-link to="/register">Registration</router-link></li>
        </ul>

        <div class="nav-actions">
          <button class="toggle-dark-mode" @click="toggleDarkMode">
            {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
          </button>

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

    <router-view />

    <LoginModal
      v-if="showLoginModal"
      @close="closeLoginModal"
      @login="handleLogin"
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
</style>
