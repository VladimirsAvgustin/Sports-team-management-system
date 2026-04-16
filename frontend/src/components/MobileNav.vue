<template>
  <header class="mobile-header">
    <nav class="navbar">
      <!-- Logo / Title -->
      <div class="nav-brand">
        <router-link to="/" class="brand-link">
          Sports Team
        </router-link>
      </div>

      <!-- Desktop: Theme and Language Switchers -->
      <div class="nav-utilities-desktop">
        <button 
          @click="handleToggleDarkMode"
          class="util-btn"
          :title="isDarkMode ? 'Light Mode' : 'Dark Mode'"
          aria-label="Toggle theme"
        >
          <svg v-if="isDarkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="M4.93 4.93l1.41 1.41"></path>
            <path d="M17.66 17.66l1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="M4.93 19.07l1.41-1.41"></path>
            <path d="M17.66 6.34l1.41-1.41"></path>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button 
          @click="handleToggleLanguage"
          class="util-btn"
          title="Change Language"
        >
          <span class="lang-badge">{{ localeProp === 'en' ? 'EN' : 'LV' }}</span>
        </button>
      </div>

      <!-- Hamburger для мобильных -->
      <button 
        @click="showMenu = !showMenu" 
        class="hamburger-toggle"
        :class="{ close: showMenu }"
        aria-label="Toggle menu"
      >
        {{ showMenu ? '✕' : '☰' }}
      </button>

      <!-- Меню (скрывается на мобильных) -->
      <div class="nav-menu" :class="{ active: showMenu }">
        <!-- Хэдер меню с кнопкой закрытия - только на мобильных -->
        <div class="nav-menu-header-mobile">
          <button 
            @click="showMenu = false"
            class="close-menu-btn"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <!-- Team Navigation (для страниц команды) -->
        <div v-if="isOnTeamPage" class="nav-section team-pages-nav">
          <h4 class="section-title">Team Pages</h4>
          <router-link 
            :to="`/team/${currentTeamId}/players`" 
            class="nav-item team-nav-link"
            :class="{ active: isOnPage('players') }"
            @click="showMenu = false"
          >
            Players
          </router-link>
          <router-link 
            v-if="isCoach"
            :to="`/team/${currentTeamId}/statistics`" 
            class="nav-item team-nav-link"
            :class="{ active: isOnPage('statistics') }"
            @click="showMenu = false"
          >
            Statistics
          </router-link>
          <router-link 
            :to="`/team-schedule/${currentTeamId}`" 
            class="nav-item team-nav-link"
            :class="{ active: isOnPage('schedule') }"
            @click="showMenu = false"
          >
            Schedule
          </router-link>
        </div>

        <!-- Утилиты в меню -->
        <div class="nav-section nav-utils-in-menu">
          <button 
            @click="() => { handleToggleDarkMode(); showMenu = false }"
            class="nav-btn small util-btn-menu"
            :title="isDarkMode ? 'Light Mode' : 'Dark Mode'"
          >
            <svg v-if="isDarkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2"></path>
              <path d="M12 20v2"></path>
              <path d="M4.93 4.93l1.41 1.41"></path>
              <path d="M17.66 17.66l1.41 1.41"></path>
              <path d="M2 12h2"></path>
              <path d="M20 12h2"></path>
              <path d="M4.93 19.07l1.41-1.41"></path>
              <path d="M17.66 6.34l1.41-1.41"></path>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            {{ isDarkMode ? 'Light' : 'Dark' }}
          </button>
          <button 
            @click="() => { handleToggleLanguage(); showMenu = false }"
            class="nav-btn small util-btn-menu"
            title="Change Language"
          >
            <span class="lang-badge">{{ localeProp === 'en' ? 'EN' : 'LV' }}</span>
          </button>
        </div>

        <!-- Главная навигация -->
        <div class="nav-section">
          <router-link to="/" class="nav-item" @click="showMenu = false">
            Home
          </router-link>
          <router-link to="/contact" class="nav-item" @click="showMenu = false">
            Contact
          </router-link>
        </div>

        <!-- Команда кнопки -->
        <div v-if="hasTeam || showCreateTeam || showJoinTeam" class="nav-section team-section">
          <button 
            v-if="showCreateTeam" 
            @click="() => { goToCreateTeam(); showMenu = false }"
            class="nav-btn primary"
          >
            Create Team
          </button>
          <button 
            v-if="hasTeam" 
            @click="() => { goToMyTeam(); showMenu = false }"
            class="nav-btn primary"
          >
            {{ userTeam?.name }}
          </button>
          <button 
            v-if="hasTeam" 
            @click="() => { goToSchedule(); showMenu = false }"
            class="nav-btn primary"
          >
            Schedule
          </button>
          <button 
            v-if="isLoggedIn"
            @click="() => { goToChat(); showMenu = false }"
            class="nav-btn secondary"
          >
            Chat
          </button>
          <button 
            v-if="showJoinTeam" 
            @click="() => { openJoinTeamModal(); showMenu = false }"
            class="nav-btn secondary"
          >
            Join Team
          </button>
        </div>

        <!-- Аутентификация -->
        <div class="nav-section auth-section">
          <template v-if="!isLoggedIn">
            <router-link 
              to="/register" 
              class="nav-btn secondary full-width"
              @click="showMenu = false"
            >
              Register
            </router-link>
            <button 
              @click="() => { openLoginModal(); showMenu = false }"
              class="nav-btn primary full-width"
            >
              Login
            </button>
          </template>
          <template v-else>
            <router-link 
              to="/profile"
              class="nav-btn secondary full-width"
              @click="showMenu = false"
            >
              {{ auth.user?.name }} {{ auth.user?.surname }}
            </router-link>
            <button 
              @click="() => { handleLogout(); showMenu = false }"
              class="nav-btn logout full-width"
            >
              Logout
            </button>
          </template>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const props = defineProps({
  isLoggedIn: Boolean,
  showCreateTeam: Boolean,
  showJoinTeam: Boolean,
  hasTeam: Boolean,
  userTeam: Object,
  isOnTeamPage: Boolean,
  currentTeamId: [String, Number],
  showCoachTeamLinks: Boolean,
  isDarkMode: Boolean,
  locale: String,
  auth: Object
})

const emit = defineEmits([
  'toggle-dark-mode',
  'toggle-language',
  'open-login',
  'open-join-team',
  'go-to-create-team',
  'go-to-team',
  'go-to-schedule',
  'go-to-chat',
  'go-to-profile',
  'go-to-register',
  'logout'
])

const showMenu = ref(false)
const localeProp = ref(props.locale || 'en')
const teamRouteNames = new Set([
  'TeamPage',
  'TeamPlayers',
  'TeamStatistics',
  'TeamSchedule'
])

const isOnTeamPage = computed(() => {
  if (props.isOnTeamPage) {
    return true
  }

  const routeName = typeof route.name === 'string' ? route.name : ''
  const routeTeamId = route.params?.id || route.params?.teamId
  const path = route.path || ''

  if (teamRouteNames.has(routeName) && routeTeamId) {
    return true
  }

  return path.startsWith('/team/') || path.startsWith('/team-schedule/') || path.startsWith('/teams/')
})

const currentTeamId = computed(() => props.currentTeamId || route.params?.id || route.params?.teamId || props.userTeam?.id || '')
const isCoach = computed(() => props.showCoachTeamLinks)

// Helper to check which page we're on
const isOnPage = (page) => {
  if (page === 'schedule') {
    return route.name === 'TeamSchedule' || route.path.startsWith('/team-schedule/') || route.path.includes('/schedule')
  }
  return route.path.includes(`/${page}`)
}

// Watch for language changes
watch(() => props.locale, (newLocale) => {
  localeProp.value = newLocale || 'en'
})

// Close menu when resizing to desktop
const handleResize = () => {
  if (window.innerWidth >= 1024) {
    showMenu.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const goToCreateTeam = () => {
  emit('go-to-create-team')
  showMenu.value = false
}

const goToMyTeam = () => {
  emit('go-to-team')
  showMenu.value = false
}

const goToSchedule = () => {
  emit('go-to-schedule')
  showMenu.value = false
}

const openLoginModal = () => {
  emit('open-login')
  showMenu.value = false
}

const openJoinTeamModal = () => {
  emit('open-join-team')
  showMenu.value = false
}

const handleToggleDarkMode = () => {
  emit('toggle-dark-mode')
  showMenu.value = false
}

const handleToggleLanguage = () => {
  emit('toggle-language')
  showMenu.value = false
}

const goToChat = () => {
  emit('go-to-chat')
  showMenu.value = false
}

const handleLogout = () => {
  emit('logout')
  showMenu.value = false
}
</script>

<style scoped>
.mobile-header {
  position: sticky;
  top: 0;
  z-index: 200;
}

.navbar {
  background: linear-gradient(135deg, #0073e6 0%, #005bb5 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  min-height: 40px;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

html.dark-mode .navbar {
  background: linear-gradient(135deg, #1a3a52 0%, #0d1f2d 100%);
}

.nav-brand {
  flex: 1;
  display: flex;
  align-items: center;
}

.brand-link {
  color: white;
  text-decoration: none;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
  white-space: nowrap;
}

.brand-link:hover {
  background: rgba(255, 255, 255, 0.1);
}

.brand-link:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Меню */
.nav-menu {
  display: none;
  position: fixed;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #fff 0%, #f5f5f5 100%);
  overflow-y: auto;
  z-index: 199;
  padding: 8px 0;
}

html.dark-mode .nav-menu {
  background: linear-gradient(180deg, #1a1a1a 0%, #111 100%);
}

.nav-menu.active {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

html.dark-mode .nav-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Утилиты в меню */
.nav-utils-in-menu {
  display: flex !important;
  flex-direction: row !important;
  gap: 8px !important;
  padding: 8px 12px !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
}

html.dark-mode .nav-utils-in-menu {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.util-btn-menu {
  width: auto !important;
  flex: 1;
  min-width: 100px !important;
  padding: 10px 12px !important;
  font-size: 14px !important;
  min-height: 40px !important;
  background: #e8e8e8 !important;
  color: #333 !important;
}

.util-btn-menu:hover {
  background: #d0d0d0 !important;
}

html.dark-mode .util-btn-menu {
  background: #444 !important;
  color: #f0f0f0 !important;
}

html.dark-mode .util-btn-menu:hover {
  background: #555 !important;
}

/* Хэдер меню с кнопкой закрытия - только на мобильных */
.nav-menu-header-mobile {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

html.dark-mode .nav-menu-header-mobile {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.close-menu-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-menu-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #000;
}

html.dark-mode .close-menu-btn {
  color: #aaa;
}

html.dark-mode .close-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  color: #333;
  text-decoration: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  transition: background 0.2s;
}

@media (max-width: 1023px) {
  .nav-item {
    padding: 10px 12px;
    font-size: 14px;
  }
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

html.dark-mode .nav-item {
  color: #f0f0f0;
}

html.dark-mode .nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Кнопки */
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 14px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  width: 100%;
}

@media (max-width: 1023px) {
  .nav-btn {
    padding: 10px 12px;
    font-size: 14px;
    min-height: 40px;
  }
}

.nav-btn.primary {
  background: #0073e6;
  color: white;
}

.nav-btn.primary:hover {
  background: #0056b3;
  transform: scale(1.01);
}

html.dark-mode .nav-btn.primary {
  background: #1a5bb5;
}

html.dark-mode .nav-btn.primary:hover {
  background: #0073e6;
}

.nav-btn.secondary {
  background: #e8e8e8;
  color: #333;
}

.nav-btn.secondary:hover {
  background: #d0d0d0;
  transform: scale(1.01);
}

html.dark-mode .nav-btn.secondary {
  background: #444;
  color: #f0f0f0;
}

html.dark-mode .nav-btn.secondary:hover {
  background: #555;
}

.nav-btn.logout {
  background: #dc3545;
  color: white;
}

.nav-btn.logout:hover {
  background: #c82333;
  transform: scale(1.01);
}

html.dark-mode .nav-btn.logout {
  background: #a02030;
}

html.dark-mode .nav-btn.logout:hover {
  background: #dc3545;
}

.nav-btn.small {
  width: auto;
  flex: 1;
  min-width: 100px;
}

.nav-btn.full-width {
  width: 100%;
}

/* Hamburger */
.hamburger-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 22px;
  cursor: pointer;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  border-radius: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.hamburger-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.hamburger-toggle.close {
  font-size: 24px;
}

/* Desktop версия - показываем горизонтальное меню */
@media (min-width: 1024px) {
  .mobile-header {
    position: sticky;
    top: 0;
    z-index: 200;
  }

  .navbar {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 24px;
  }

  .nav-brand {
    flex: 0 1 auto;
  }

  .hamburger-toggle {
    display: none !important;
  }

  .nav-menu-header-mobile {
    display: none !important;
  }

  .nav-utils-in-menu {
    display: none !important;
  }

  .nav-menu {
    position: static !important;
    display: flex !important;
    flex-direction: row;
    background: none !important;
    overflow: visible;
    padding: 0;
    gap: 0;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    height: auto;
    box-shadow: none;
  }

  .nav-menu.active {
    display: flex !important;
  }

  .nav-section {
    display: flex !important;
    flex-direction: row;
    gap: 8px;
    padding: 0;
    border: none !important;
    align-items: center;
    height: auto;
  }

  .nav-utils-in-menu {
    display: none !important;
  }

  .nav-item {
    padding: 8px 12px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .nav-btn {
    width: auto;
    min-width: auto;
    padding: 8px 12px;
    min-height: auto;
    font-size: 14px;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    border-radius: 4px;
  }

  .nav-btn.primary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  .nav-btn.primary:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: none;
  }

  html.dark-mode .nav-btn.primary {
    background: rgba(26, 91, 181, 0.4);
    border: 1px solid rgba(26, 91, 181, 0.6);
  }

  html.dark-mode .nav-btn.primary:hover {
    background: rgba(26, 91, 181, 0.6);
  }

  .nav-btn.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .nav-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: none;
  }

  html.dark-mode .nav-btn.secondary {
    background: rgba(68, 68, 68, 0.4);
    border: 1px solid rgba(68, 68, 68, 0.6);
    color: #f0f0f0;
  }

  html.dark-mode .nav-btn.secondary:hover {
    background: rgba(68, 68, 68, 0.6);
  }

  .nav-btn.logout {
    background: rgba(220, 53, 69, 0.8);
    border: 1px solid rgba(220, 53, 69, 1);
  }

  .nav-btn.logout:hover {
    background: rgba(200, 35, 51, 0.9);
  }

  html.dark-mode .nav-btn.logout {
    background: rgba(160, 32, 48, 0.6);
    border: 1px solid rgba(160, 32, 48, 0.8);
  }

  html.dark-mode .nav-btn.logout:hover {
    background: rgba(220, 53, 69, 0.8);
  }

  .nav-btn.small {
    flex: 0 1 auto;
    min-width: auto;
    width: auto;
    padding: 8px 12px;
  }

  .nav-btn.full-width {
    width: auto;
  }

  .team-section {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .auth-section {
    display: flex;
    flex-direction: row;
    gap: 8px;
    margin-left: auto;
  }
}

/* Планшеты */
@media (768px <= width < 1024px) {
  .nav-menu {
    top: 40px;
  }

  .nav-menu.active {
    display: flex;
  }
}

/* Мобильные */
@media (max-width: 767px) {
  .navbar {
    padding: 6px 10px;
    min-height: 40px;
  }

  .brand-link {
    font-size: 14px;
  }

  .nav-section {
    padding: 8px 10px;
  }

  .nav-btn {
    padding: 10px 12px;
    min-height: 40px;
    font-size: 14px;
  }
}

/* Desktop utilities (Theme & Language) */
.nav-utilities-desktop {
  display: none;
  align-items: center;
  gap: 8px;
}

@media (min-width: 1024px) {
  .nav-utilities-desktop {
    display: flex;
  }
}

.util-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 44px;
  min-height: 36px;
  justify-content: center;
}

.util-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.util-btn i {
  font-size: 16px;
}

.lang-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  min-width: 24px;
}

/* Desktop Team Navigation */
.team-nav-desktop {
  display: none;
  gap: 8px;
  align-items: center;
}

@media (min-width: 1024px) {
  .team-nav-desktop {
    display: flex;
    margin-left: 24px;
  }
}

.team-nav-btn {
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  min-height: 36px;
}

.team-nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.team-nav-btn.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

html.dark-mode .team-nav-btn {
  background: rgba(26, 91, 181, 0.2);
  border-color: rgba(26, 91, 181, 0.3);
}

html.dark-mode .team-nav-btn:hover {
  background: rgba(26, 91, 181, 0.4);
  border-color: rgba(26, 91, 181, 0.5);
}

html.dark-mode .team-nav-btn.active {
  background: rgba(26, 91, 181, 0.6);
  border-color: rgba(26, 91, 181, 0.8);
}

/* Team Pages Navigation */
.team-pages-nav {
  padding: 12px !important;
  border-bottom: 2px solid #0073e6 !important;
}

html.dark-mode .team-pages-nav {
  border-bottom: 2px solid #1a5bb5 !important;
}

.section-title {
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  color: #0073e6;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

html.dark-mode .section-title {
  color: #1a5bb5;
}

.team-nav-link {
  padding: 10px 14px !important;
  font-size: 14px !important;
  background: #f0f0f0;
  color: #333 !important;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.team-nav-link:hover {
  background: #e0e0e0 !important;
  border-left-color: #0073e6;
}

.team-nav-link.active {
  background: #e3f2fd;
  color: #0073e6 !important;
  border-left-color: #0073e6;
  font-weight: 600;
}

html.dark-mode .team-nav-link {
  background: #333;
  color: #f0f0f0 !important;
}

html.dark-mode .team-nav-link:hover {
  background: #444 !important;
  border-left-color: #1a5bb5;
}

html.dark-mode .team-nav-link.active {
  background: #1a3a5c;
  color: #1a5bb5 !important;
  border-left-color: #1a5bb5;
}

/* Desktop: Team Pages Navigation adjustments */
@media (min-width: 1024px) {
  .team-pages-nav {
    padding: 0 !important;
    border: none !important;
    gap: 4px;
  }

  .section-title {
    display: none;
  }

  .team-nav-link {
    padding: 8px 12px !important;
    background: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    border: none !important;
    font-size: 13px !important;
    border-radius: 4px;
    font-weight: 500;
  }

  .team-nav-link:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    border: none !important;
  }

  .team-nav-link.active {
    background: rgba(255, 255, 255, 0.3) !important;
    color: white !important;
    border: none !important;
  }

  html.dark-mode .team-nav-link {
    background: rgba(26, 91, 181, 0.3) !important;
  }

  html.dark-mode .team-nav-link:hover {
    background: rgba(26, 91, 181, 0.5) !important;
  }

  html.dark-mode .team-nav-link.active {
    background: rgba(26, 91, 181, 0.7) !important;
    color: white !important;
  }
}
</style>
