<template>
  <div class="team-container">
    <!-- Hero Section with Team Info -->
    <div class="team-hero">
      <div class="hero-content">
        <!-- Komandas logotips -->
        <div class="team-logo-section">
          <div class="team-logo" @click="isCoach && triggerLogoUpload()">
            <img v-if="team.logo" :src="team.logo" alt="Komandas logotips" class="logo-image" />
            <div v-else class="logo-placeholder">
              <span class="logo-initials">{{ getTeamInitials(team.name) }}</span>
            </div>
            <div v-if="isCoach" class="logo-overlay">
              <span>📷</span>
              <span class="overlay-text">{{ $t('teamPage.changeLogo') }}</span>
            </div>
          </div>
          <input 
            type="file" 
            ref="logoInput" 
            @change="handleLogoUpload" 
            accept="image/*" 
            style="display: none"
          />
          <button v-if="isCoach && team.logo" @click="deleteLogo" class="delete-logo-btn">
            {{ $t('teamPage.removeLogo') }}
          </button>
        </div>

        <!-- Team Info -->
        <div class="team-info-section">
          <h1 class="team-name">{{ team.name }}</h1>
          <div class="team-code-badge">
            <span class="code-label">{{ $t('teamPage.teamCode') }}</span>
            <span class="code-value">{{ team.team_code }}</span>
          </div>
          <div class="page-highlights">
            <span v-if="isCoach" class="page-pill accent">Trenera rīki ieslēgti</span>
            <span class="page-pill">{{ sortedPlayers.length }} spēlētāji sastāvā</span>
          </div>
          <div class="team-meta">
            <span class="meta-item">
              <span class="meta-icon"></span>
              {{ sortedPlayers.length }} {{ $t('teamPage.players') }}
            </span>
            <button @click="toggleChat" class="chat-toggle-btn" title="Komandas čats">
              Čats
              <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Team Stats Summary -->
      <div class="team-stats-summary">
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.totalGoals }}</span>
            <span class="stat-label">{{ $t('teamPage.totalGoals') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.totalAssists }}</span>
            <span class="stat-label">{{ $t('teamPage.totalAssists') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.totalMatches }}</span>
            <span class="stat-label">{{ $t('teamPage.matchesPlayed') }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.avgAttendance }}%</span>
            <span class="stat-label">{{ $t('teamPage.avgAttendance') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Team Navigation -->
    <div class="team-nav">
      <router-link :to="`/team/${teamId}/overview`" class="nav-link" active-class="active">
        {{ $t('nav.overview') }}
      </router-link>
      <router-link :to="`/team/${teamId}/players`" class="nav-link" active-class="active">
        {{ $t('teamPage.players') }}
      </router-link>
      <router-link v-if="isCoach" :to="`/team/${teamId}/statistics`" class="nav-link" active-class="active">
        {{ $t('schedule.stats') }}
      </router-link>
      <router-link v-if="isCoach" :to="`/team/${teamId}/settings`" class="nav-link" active-class="active">
        {{ $t('teamPage.teamSettings') }}
      </router-link>
    </div>

    <!-- Pārskata sadaļa -->
    <div class="overview-section">
      <div class="overview-stats-detail">
        <h3>{{ $t('teamPage.teamStats') }}</h3>
        <div class="stats-detail-grid">
          <div class="stat-detail-card">
            <div class="stat-detail-label">Vārti</div>
            <p class="stat-number">{{ teamStats.totalGoals }}</p>
          </div>
          <div class="stat-detail-card">
            <div class="stat-detail-label">Piespēles</div>
            <p class="stat-number">{{ teamStats.totalAssists }}</p>
          </div>
          <div class="stat-detail-card">
            <div class="stat-detail-label">Spēles</div>
            <p class="stat-number">{{ teamStats.totalMatches }}</p>
          </div>
          <div class="stat-detail-card">
            <div class="stat-detail-label">Apmeklējums</div>
            <p class="stat-number">{{ teamStats.avgAttendance }}%</p>
          </div>
        </div>
      </div>

      <div class="overview-players-summary">
        <h3>{{ $t('teamPage.playersInTeam') }}</h3>
        <p class="players-count">{{ sortedPlayers.length }} {{ $t('teamPage.players') }}</p>
        <div v-if="sortedPlayers.length > 0" class="top-performers">
          <h4>Labākie spēlētāji</h4>
          <div class="top-performers-list">
            <div v-for="player in sortedPlayers.slice(0, 5)" :key="player.id" class="top-performer-item">
              <span class="performer-name">{{ fullName(player) }}</span>
              <span class="performer-stats">Vārti: {{ player.stats.goals }} | Piespēles: {{ player.stats.assists }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Chat Panel -->
    <transition name="slide-left">
      <div v-if="showChat" class="floating-chat">
        <ChatComponent :room-id="chatRoomId" :show-close="true" @close="toggleChat" />
      </div>
    </transition>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>{{ $t('messages.loading') }}</p>
    </div>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import ChatComponent from '../components/ChatComponent.vue'
import { canManageTeam } from '../utils/teamAccess'
import { fetchTeamBundle, removeTeamLogo, uploadTeamLogo } from '../services/teamApi'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()

const teamId = route.params.id
const team = ref({ name: '', coach_id: null, team_code: '', logo: null })
const players = ref([])
const loading = ref(false)
const toastMessage = ref('')
const toastType = ref('')
const showChat = ref(false)
const unreadCount = ref(0)
const logoInput = ref(null)

const currentUser = computed(() => authStore.user)
const isCoach = canManageTeam({
  userRef: currentUser,
  teamRef: team,
  teamIdRef: computed(() => teamId)
})
const sortedPlayers = computed(() => [...players.value].sort((a, b) => fullName(a).localeCompare(fullName(b))))

const teamStats = computed(() => ({
  totalGoals: players.value.reduce((sum, p) => sum + (p.stats?.goals || 0), 0),
  totalAssists: players.value.reduce((sum, p) => sum + (p.stats?.assists || 0), 0),
  totalMatches: players.value.reduce((sum, p) => sum + (p.stats?.matches || 0), 0),
  avgAttendance: players.value.length > 0 
    ? Math.round(players.value.reduce((sum, p) => sum + (p.stats?.attendance || 0), 0) / players.value.length)
    : 0
}))

const fullName = (player) => `${player.name} ${player.surname}`

const getTeamInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

const fetchTeamData = async () => {
  loading.value = true
  try {
    const response = await fetchTeamBundle(teamId)
    team.value = response.team
    players.value = response.players
  } catch (error) {
    console.error('Error fetching team:', error)
    showToast(t('messages.error'), 'error')
  } finally {
    loading.value = false
  }
}

const triggerLogoUpload = () => logoInput.value?.click()

const handleLogoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    showToast(t('messages.imageSizeTooLarge'), 'error')
    return
  }

  try {
    team.value.logo = await uploadTeamLogo(teamId, file)
    showToast(t('teamPage.logoUpdated'), 'success')
  } catch (error) {
    console.error('Error uploading logo:', error)
    showToast(t('messages.uploadError'), 'error')
  }
}

const deleteLogo = async () => {
  if (!confirm(t('teamPage.removeLogoConfirm'))) return

  try {
    await removeTeamLogo(teamId)
    team.value.logo = null
    showToast(t('teamPage.logoRemoved'), 'success')
  } catch (error) {
    console.error('Error deleting logo:', error)
    showToast(t('messages.logoRemoveError'), 'error')
  }
}

const toggleChat = () => showChat.value = !showChat.value

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => toastMessage.value = '', 3000)
}

const chatRoomId = computed(() => `team-${teamId}`)

onMounted(() => {
  fetchTeamData()
  unreadCount.value = chatStore.getUnreadCount(`team-${teamId}`)
})
</script>

<style scoped>
@import url('../assets/styles/team-shared.css');

.team-nav {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: var(--bg-color-secondary);
  border-bottom: 2px solid var(--primary-color);
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.nav-link {
  padding: 0.65rem 1.2rem;
  border: 2px solid transparent;
  background: #f0f0f0;
  color: #333;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

html.dark-mode .nav-link {
  background: #444;
  color: #f0f0f0;
}

.nav-link:hover {
  background: #e0e0e0;
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

html.dark-mode .nav-link:hover {
  background: #555;
  border-color: var(--primary-color);
}

.nav-link.active {
  color: white;
  background: var(--primary-color);
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
}

.page-highlights {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.page-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(var(--primary-rgb), 0.08);
  color: var(--text-color-secondary);
  font-size: 0.85rem;
  font-weight: 600;
}

.page-pill.accent {
  background: rgba(16, 185, 129, 0.15);
  color: #0f8a5f;
}

html.dark-mode .page-pill.accent {
  color: #7dd3a7;
}

.overview-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.overview-stats-detail,
.overview-players-summary {
  background: var(--bg-color-secondary);
  border-radius: 12px;
  padding: 2rem;
}

.stats-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-top: 1rem;
}

.stat-detail-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.05));
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border-color);
}

.stat-detail-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-detail-card h4 {
  margin: 0.5rem 0;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary-color);
  margin: 0.5rem 0;
}

.top-performers {
  margin-top: 1.5rem;
}

.top-performers h4 {
  margin-bottom: 1rem;
  color: var(--text-color);
}

.top-performers-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top-performer-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(var(--primary-rgb), 0.05);
  border-radius: 8px;
  border-left: 3px solid var(--primary-color);
}

.performer-name {
  font-weight: 500;
  color: var(--text-color);
}

.performer-stats {
  color: var(--text-color-secondary);
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .overview-section {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  .team-nav {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem;
  }

  .page-highlights {
    justify-content: center;
  }

  .nav-link {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }

  .stats-detail-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
