<template>
  <div class="team-container">
    <!-- Hero Section with Team Info -->
    <div class="team-hero">
      <div class="hero-content">
        <!-- Team Logo -->
        <div class="team-logo-section">
          <div class="team-logo" @click="isCoach && triggerLogoUpload()">
            <img v-if="team.logo" :src="team.logo" alt="Team Logo" class="logo-image" />
            <div v-else class="logo-placeholder">
              <span class="logo-initials">{{ getTeamInitials(team.name) }}</span>
            </div>
            <div v-if="isCoach" class="logo-overlay">
              <span>📷</span>
              <span class="overlay-text">Change Logo</span>
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
            Remove Logo
          </button>
        </div>

        <!-- Team Info -->
        <div class="team-info-section">
          <h1 class="team-name">{{ team.name }}</h1>
          <div class="team-code-badge">
            <span class="code-label">Team Code:</span>
            <span class="code-value">{{ team.team_code }}</span>
          </div>
          <div class="team-meta">
            <span class="meta-item">
              <span class="meta-icon"></span>
              {{ sortedPlayers.length }} Players
            </span>
            <button @click="toggleChat" class="chat-toggle-btn" title="Team Chat">
              💬 Chat
              <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Team Stats Summary -->
      <div class="team-stats-summary">
        <div class="stat-card">
          <span class="stat-icon">⚽</span>
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.totalGoals }}</span>
            <span class="stat-label">Total Goals</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🎯</span>
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.totalAssists }}</span>
            <span class="stat-label">Total Assists</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🏟️</span>
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.totalMatches }}</span>
            <span class="stat-label">Matches Played</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📊</span>
          <div class="stat-content">
            <span class="stat-value">{{ teamStats.avgAttendance }}%</span>
            <span class="stat-label">Avg Attendance</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Goals Distribution Chart (for Coach) -->
    <div v-if="isCoach && sortedPlayers.length > 0" class="charts-section">
      <div class="chart-container">
        <h3>Goals Distribution</h3>
        <canvas ref="goalsChartRef"></canvas>
      </div>
      <div class="chart-container">
        <h3>Assists Distribution</h3>
        <canvas ref="assistsChartRef"></canvas>
      </div>
    </div>

    <!-- Floating Chat Panel -->
    <transition name="slide-left">
      <div v-if="showChat" class="floating-chat">
        <ChatComponent :room-id="chatRoomId" :show-close="true" @close="toggleChat" />
      </div>
    </transition>

    <!-- Search and Controls -->
    <div class="team-controls">
      <div class="search-container">
        <input 
          v-model="searchQuery" 
          placeholder="Search players..." 
          class="search-input"
        >
        <span class="search-icon">🔍</span>
      </div>
      <div class="controls-right">
        <select v-model="sortBy" class="sort-select">
          <option value="username">By Name</option>
          <option value="goals">By Goals</option>
          <option value="assists">By Assists</option>
          <option value="matches">By Matches</option>
        </select>
        <div class="view-toggle">
          <button 
            @click="viewMode = 'cards'" 
            :class="{ active: viewMode === 'cards' }"
            title="Card view" 
          >
            <i class="fas fa-th-large"></i>
            <span class="visually-hidden">Cards</span>
          </button>
          <button 
            @click="viewMode = 'list'" 
            :class="{ active: viewMode === 'list' }"
            title="List view"
          >
            <i class="fas fa-list"></i>
            <span class="visually-hidden">List</span>
          </button>
        </div>
        <!-- <button 
          v-if="isCoach" 
          @click="exportStats" 
          class="export-btn"
        >
          Export CSV
        </button> -->
      </div>
    </div>

    <!-- Players List - Cards View -->
    <div v-if="viewMode === 'cards'" class="players-list cards-view">
      <transition-group name="card-move" tag="div" class="cards-grid">
        <div 
          v-for="(player, index) in sortedPlayers" 
          :key="player.id" 
          class="player-card-wrapper"
          :class="{ 
            'highlight-top': isTopPerformer(player),
            'dragging': draggedPlayer?.id === player.id,
            'drag-over': dragOverIndex === index
          }"
          :draggable="isCoach"
          @dragstart="onDragStart($event, player, index)"
          @dragend="onDragEnd"
          @dragover.prevent="onDragOver($event, index)"
          @dragleave="onDragLeave"
          @drop="onDrop($event, index)"
        >
          <div class="player-card">
            <!-- Card Header with Gradient -->
            <div class="card-header" :style="getPlayerGradient(player)">
              <div class="drag-handle" v-if="isCoach">
                <i class="fas fa-grip-vertical"></i>
              </div>
              <div class="avatar-wrapper">
                <div class="avatar-circle">
                  {{ getInitials(player.username) }}
                </div>
              </div>
              <div class="quick-stats">
                <div class="quick-stat" v-if="player.stats.goals > 0">
                  <span class="qs-value">{{ player.stats.goals }}</span>
                  <span class="qs-label">⚽</span>
                </div>
                <div class="quick-stat" v-if="player.stats.assists > 0">
                  <span class="qs-value">{{ player.stats.assists }}</span>
                  <span class="qs-label">🎯</span>
                </div>
                <div class="quick-stat" v-if="player.stats.matches > 0">
                  <span class="qs-value">{{ player.stats.matches }}</span>
                  <span class="qs-label">🏟️</span>
                </div>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <div class="player-identity">
                <h3 class="player-name">{{ player.username }}</h3>
                <p class="player-email">{{ player.email }}</p>
                <div class="player-status">
                  <span class="status-indicator active"></span>
                  <span class="status-text">Active Player</span>
                </div>
              </div>

              <!-- Stats Grid -->
              <div class="stats-grid">
                <div 
                  v-for="stat in statFields" 
                  :key="stat.key" 
                  class="stat-cell"
                  :class="getStatHighlight(player, stat.key)"
                >
                  <div class="stat-icon">{{ getStatIcon(stat.key) }}</div>
                  <div class="stat-details">
                    <span class="stat-label">{{ stat.label }}</span>
                    <div class="stat-input-wrapper">
                      <button 
                        v-if="isCoach" 
                        class="stat-btn minus"
                        @click="decrementStat(player, stat.key)"
                        :disabled="player.stats[stat.key] <= 0"
                      >−</button>
                      <input 
                        v-model.number="player.stats[stat.key]" 
                        type="number" 
                        min="0"
                        :disabled="!isCoach"
                        @change="updatePlayerStats(player)"
                        class="stat-input"
                      >
                      <button 
                        v-if="isCoach" 
                        class="stat-btn plus"
                        @click="incrementStat(player, stat.key)"
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="card-footer" v-if="isCoach">
              <button @click="confirmRemovePlayer(player)" class="remove-btn">
                <i class="fas fa-user-minus"></i>
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- Players List - Table View -->
    <div v-else class="players-list table-view">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th v-for="stat in statFields" :key="stat.key">{{ stat.label }}</th>
            <th v-if="isCoach">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in sortedPlayers" :key="player.id">
            <td>
              <div class="player-info-list">
                <div class="avatar-circle-sm">
                  {{ getInitials(player.username) }}
                </div>
                <div>
                  <h4>{{ player.username }}</h4>
                  <p class="email-small">{{ player.email }}</p>
                </div>
              </div>
            </td>
            <td v-for="stat in statFields" :key="stat.key">
              <input 
                v-model.number="player.stats[stat.key]" 
                type="number" 
                min="0"
                :disabled="!isCoach"
                @change="updatePlayerStats(player)"
                class="stat-input-list"
              >
            </td>
            <td v-if="isCoach">
              <button @click="confirmRemovePlayer(player)" class="danger-btn">
                <i class="fas fa-user-minus"></i> Remove
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>



    <!-- Empty State -->
    <div v-if="!loading && sortedPlayers.length === 0" class="empty-state">
      <h3>No Players Found</h3>
      <p v-if="searchQuery">Try adjusting your search query</p>
      <p v-else>This team currently has no players</p>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading team data...</p>
    </div>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import Chart from 'chart.js/auto'
import ChatComponent from '../components/ChatComponent.vue'

const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()
const teamId = route.params.id

// Refs and state
const team = ref({ name: '', coach_id: null, team_code: '', logo: null })
const players = ref([])
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('username')
const viewMode = ref('cards') // 'cards' or 'list'
const toastMessage = ref('')
const toastType = ref('')

// Logo upload ref
const logoInput = ref(null)

// Team stats
const teamStats = ref({
  totalGoals: 0,
  totalAssists: 0,
  totalMatches: 0,
  avgAttendance: 0
})

// Chat state
const showChat = ref(false)
const chatRoomId = ref(null)
const unreadCount = computed(() => chatStore.unreadCount)

// Drag and drop state
const draggedPlayer = ref(null)
const draggedIndex = ref(null)
const dragOverIndex = ref(null)
const playerOrder = ref([])

const goalsChartRef = ref(null)
const assistsChartRef = ref(null)
let goalsChartInstance = null
let assistsChartInstance = null

const statFields = [
  { key: 'matches', label: 'Matches' },
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'yellow_cards', label: 'Yellow Cards' },
  { key: 'red_cards', label: 'Red Cards' }
]

// Data fetching
const fetchTeamData = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/auth/teams/${teamId}`)
    team.value = res.data.team
    await fetchPlayers()
    await fetchTeamStats()
  } catch (err) {
    console.error('Error loading team:', err)
    showToast('Failed to load team data', 'error')
  } finally {
    loading.value = false
  }
}

// Fetch team statistics
const fetchTeamStats = async () => {
  try {
    const res = await axios.get(`/api/auth/teams/${teamId}/stats`)
    teamStats.value = res.data
  } catch (err) {
    console.error('Error loading team stats:', err)
  }
}

// Logo functions
const getTeamInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const triggerLogoUpload = () => {
  if (isCoach.value) {
    logoInput.value.click()
  }
}

const handleLogoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error')
    return
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size must be less than 2MB', 'error')
    return
  }

  // Convert to base64
  const reader = new FileReader()
  reader.onload = async (e) => {
    const base64 = e.target.result
    try {
      const res = await axios.post(`/api/auth/teams/${teamId}/logo`, { logo: base64 })
      team.value.logo = res.data.logo
      showToast('Logo uploaded successfully')
    } catch (err) {
      console.error('Error uploading logo:', err)
      showToast('Failed to upload logo', 'error')
    }
  }
  reader.readAsDataURL(file)
}

const deleteLogo = async () => {
  if (!confirm('Are you sure you want to remove the team logo?')) return

  try {
    await axios.delete(`/api/auth/teams/${teamId}/logo`)
    team.value.logo = null
    showToast('Logo removed successfully')
  } catch (err) {
    console.error('Error deleting logo:', err)
    showToast('Failed to remove logo', 'error')
  }
}

const fetchPlayers = async () => {
  try {
    const res = await axios.get(`/api/teams/${teamId}/players`)
    
    players.value = res.data.players
      .filter(player => player.role !== 'Coach')
      .map(player => ({
        ...player,
        stats: {
          matches: player.matches || 0,
          goals: player.goals || 0,
          assists: player.assists || 0,
          yellow_cards: player.yellow_cards || 0,
          red_cards: player.red_cards || 0
        }
      }))
    
    if (isCoach.value) await nextTick(renderCharts)
  } catch (err) {
    console.error('Error loading players:', err)
    showToast('Failed to load players', 'error')
  }
}

const updatePlayerStats = async (player) => {
  try {
    await axios.put(`/api/auth/players/${player.id}/stats`, player.stats)
    showToast('Stats updated successfully')
    if (isCoach.value) renderCharts()
  } catch (err) {
    console.error('Error updating stats:', err)
    showToast('Failed to update stats', 'error')
    // Revert changes if update fails
    await fetchPlayers()
  }
}

const confirmRemovePlayer = async (player) => {
  if (confirm(`Are you sure you want to remove ${player.username} from the team?`)) {
    await removePlayer(player.id)
  }
}

const removePlayer = async (playerId) => {
  try {
    await axios.delete(`/api/auth/players/${playerId}/team`)
    players.value = players.value.filter(p => p.id !== playerId)
    showToast('Player removed successfully')
    if (isCoach.value) renderCharts()
  } catch (error) {
    console.error('Error removing player:', error)
    showToast('Failed to remove player', 'error')
  }
}

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
    toastType.value = ''
  }, 3000)
}

// Computed properties
const coach = computed(() => {
  return players.value.find(p => p.id === team.value.coach_id)
})

const isCoach = computed(() => {
  return authStore.user?.role === 'Coach' && authStore.user?.team_id === team.value.id
})

const filteredPlayers = computed(() => {
  if (!searchQuery.value) return players.value
  const query = searchQuery.value.toLowerCase()
  return players.value.filter(p =>
    p.username.toLowerCase().includes(query) ||
    p.email.toLowerCase().includes(query)
  )
})

const sortedPlayers = computed(() => {
  return [...filteredPlayers.value].sort((a, b) => {
    if (sortBy.value === 'username') return a.username.localeCompare(b.username)
    return b.stats[sortBy.value] - a.stats[sortBy.value]
  })
})

// Helper methods
const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

const isTopPerformer = (player) => {
  return player.stats.goals >= 5 || player.stats.assists >= 5
}

const getStatusClass = (player) => {
  if (player.stats.red_cards > 0) return 'inactive'
  if (player.stats.yellow_cards >= 2) return 'warning'
  return 'active'
}

// New enhanced card functions
const getStatIcon = (key) => {
  const icons = {
    matches: '🏟️',
    goals: '⚽',
    assists: '🎯',
    yellow_cards: '🟨',
    red_cards: '🟥'
  }
  return icons[key] || '📊'
}

const getPlayerGradient = (player) => {
  const totalScore = player.stats.goals * 3 + player.stats.assists * 2
  if (totalScore >= 20) return { background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)' }
  if (totalScore >= 10) return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
  if (totalScore >= 5) return { background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }
  return { background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
}

const getPlayerRank = (player) => {
  const sorted = [...players.value].sort((a, b) => 
    (b.stats.goals * 3 + b.stats.assists * 2) - (a.stats.goals * 3 + a.stats.assists * 2)
  )
  const rank = sorted.findIndex(p => p.id === player.id) + 1
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

const getPlayerLevel = (player) => {
  const total = player.stats.goals + player.stats.assists + player.stats.matches
  if (total >= 30) return 'legendary'
  if (total >= 20) return 'pro'
  if (total >= 10) return 'rising'
  return 'rookie'
}

const getPlayerLevelText = (player) => {
  const total = player.stats.goals + player.stats.assists + player.stats.matches
  if (total >= 30) return '⭐ Legend'
  if (total >= 20) return '💫 Pro'
  if (total >= 10) return '🌟 Rising'
  return '🌱 Rookie'
}

const getStatHighlight = (player, key) => {
  const maxValue = Math.max(...players.value.map(p => p.stats[key] || 0))
  if (maxValue > 0 && player.stats[key] === maxValue) return 'highlight'
  return ''
}

const calculatePerformance = (player) => {
  const maxGoals = Math.max(...players.value.map(p => p.stats.goals || 0), 1)
  const maxAssists = Math.max(...players.value.map(p => p.stats.assists || 0), 1)
  const maxMatches = Math.max(...players.value.map(p => p.stats.matches || 0), 1)
  
  const goalScore = (player.stats.goals / maxGoals) * 40
  const assistScore = (player.stats.assists / maxAssists) * 30
  const matchScore = (player.stats.matches / maxMatches) * 30
  
  return Math.min(100, Math.round(goalScore + assistScore + matchScore))
}

const getPerformanceClass = (player) => {
  const perf = calculatePerformance(player)
  if (perf >= 80) return 'excellent'
  if (perf >= 60) return 'good'
  if (perf >= 40) return 'average'
  return 'low'
}

const incrementStat = (player, key) => {
  player.stats[key]++
  updatePlayerStats(player)
}

const decrementStat = (player, key) => {
  if (player.stats[key] > 0) {
    player.stats[key]--
    updatePlayerStats(player)
  }
}

// Drag and drop functions
const onDragStart = (event, player, index) => {
  draggedPlayer.value = player
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', player.id)
}

const onDragEnd = () => {
  draggedPlayer.value = null
  draggedIndex.value = null
  dragOverIndex.value = null
}

const onDragOver = (event, index) => {
  event.preventDefault()
  if (draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

const onDragLeave = () => {
  dragOverIndex.value = null
}

const onDrop = (event, targetIndex) => {
  event.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    onDragEnd()
    return
  }
  
  // Reorder players array
  const arr = [...players.value]
  const [draggedItem] = arr.splice(draggedIndex.value, 1)
  arr.splice(targetIndex, 0, draggedItem)
  players.value = arr
  
  showToast('Player order updated', 'success')
  onDragEnd()
}

const exportStats = () => {
  const headers = ['Player', 'Email', ...statFields.map(f => f.label)]
  const rows = sortedPlayers.value.map(p => [
    p.username,
    p.email,
    ...statFields.map(f => p.stats[f.key])
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${team.value.name}_stats.csv`
  link.click()
}

// Chat functions
const toggleChat = async () => {
  if (!showChat.value && !chatRoomId.value) {
    // Initialize chat room if not already done
    const room = await chatStore.getTeamRoom(teamId)
    if (room) {
      chatRoomId.value = room.id
    }
  }
  showChat.value = !showChat.value
}

// Chart rendering
const renderCharts = () => {
  if (!goalsChartRef.value || !assistsChartRef.value) return

  const playersWithGoals = [...players.value]
    .filter(p => p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals)
  
  const playersWithAssists = [...players.value]
    .filter(p => p.stats.assists > 0)
    .sort((a, b) => b.stats.assists - a.stats.assists)

  // Color palette
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
    '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'
  ]

  // Destroy old charts
  if (goalsChartInstance) goalsChartInstance.destroy()
  if (assistsChartInstance) assistsChartInstance.destroy()

  // Goals chart (Doughnut)
  if (playersWithGoals.length > 0) {
    goalsChartInstance = new Chart(goalsChartRef.value.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: playersWithGoals.map(p => p.username),
        datasets: [{
          data: playersWithGoals.map(p => p.stats.goals),
          backgroundColor: colors.slice(0, playersWithGoals.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: { 
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                const percentage = Math.round((context.raw / total) * 100)
                return `${context.label}: ${context.raw} goals (${percentage}%)`
              }
            }
          }
        },
        cutout: '60%'
      }
    })
  }

  // Assists chart (Doughnut)
  if (playersWithAssists.length > 0) {
    assistsChartInstance = new Chart(assistsChartRef.value.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: playersWithAssists.map(p => p.username),
        datasets: [{
          data: playersWithAssists.map(p => p.stats.assists),
          backgroundColor: colors.slice(0, playersWithAssists.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: { 
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#333'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                const percentage = Math.round((context.raw / total) * 100)
                return `${context.label}: ${context.raw} assists (${percentage}%)`
              }
            }
          }
        },
        cutout: '60%'
      }
    })
  }
}

// Lifecycle
onMounted(() => {
  fetchTeamData()
  
  // Initialize chat socket connection
  if (!chatStore.isConnected && authStore.token) {
    chatStore.connect()
  }
})

watch(players, () => { 
  if (isCoach.value) renderCharts() 
}, { deep: true })
</script>

<style scoped>
/* Base Styles */
.team-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: var(--text-color);
  min-height: 100vh;
}

/* Team Hero Section */
.team-hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  color: white;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.hero-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* Team Logo */
.team-logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.team-logo {
  width: 120px;
  height: 120px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.team-logo:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-initials {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.logo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.team-logo:hover .logo-overlay {
  opacity: 1;
}

.overlay-text {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.delete-logo-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.delete-logo-btn:hover {
  background: rgba(255, 100, 100, 0.5);
}

/* Team Info */
.team-info-section {
  flex: 1;
}

.team-name {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.team-code-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 25px;
  margin-bottom: 1rem;
  color: #333;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.code-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.code-value {
  font-weight: 700;
  font-size: 1rem;
}

.team-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.95rem;
  color: #333;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.meta-icon {
  font-size: 1.1rem;
}

/* Team Stats Summary */
.team-stats-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s, background 0.2s;
  color: #333;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.stat-card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
  color: #333;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-top: 0.25rem;
  color: #555;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Dark mode stat cards */
:global(.dark-mode) .stat-card {
  background: rgba(255, 255, 255, 0.15);
  box-shadow: none;
  color: #fff;
}

:global(.dark-mode) .stat-card:hover {
  background: rgba(255, 255, 255, 0.25);
  box-shadow: none;
}

:global(.dark-mode) .stat-value {
  color: #fff;
}

:global(.dark-mode) .stat-label {
  color: rgba(255, 255, 255, 0.8);
}

:global(.dark-mode) .team-code-badge {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  box-shadow: none;
}

:global(.dark-mode) .meta-item {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  box-shadow: none;
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: var(--card-bg);
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1.1rem;
}

/* Chat Toggle Button in Hero */
.chat-toggle-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.5rem 1.25rem;
  border-radius: 25px;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s, transform 0.2s;
  position: relative;
}

.chat-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4757;
  color: white;
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
  font-weight: 600;
}

/* Legacy Team Header - keep for backwards compatibility */
.team-header {
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
}

.team-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
  font-weight: 700;
}

.badge {
  background-color: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 500;
}

/* Team Controls */
.team-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: var(--card-bg);
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.search-container {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 115, 230, 0.2);
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sort-select {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1rem;
  cursor: pointer;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

.view-toggle button {
  padding: 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-color);
}

.view-toggle button.active {
  background: var(--primary-color);
  color: white;
}

.export-btn {
  padding: 0.75rem 1.5rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.export-btn:hover {
  background-color: var(--primary-dark);
  transform: translateY(-1px);
}

/* Cards View */
.players-list.cards-view {
  margin-bottom: 3rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

/* New Enhanced Player Card Wrapper */
.player-card-wrapper {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-card-wrapper.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.player-card-wrapper.drag-over {
  transform: translateY(10px);
}

.player-card-wrapper.drag-over::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--primary-color);
  border-radius: 2px;
}

/* Enhanced Player Card */
.player-card {
  background-color: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.player-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.player-card-wrapper.highlight-top .player-card {
  border: 2px solid #FFD700;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
}

/* Card Header */
.card-header {
  padding: 1.5rem;
  color: white;
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.drag-handle {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  cursor: grab;
  opacity: 0.6;
  transition: opacity 0.2s;
  font-size: 1.1rem;
}

.drag-handle:hover {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.player-rank {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.avatar-wrapper {
  position: relative;
}

.card-header .avatar-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.player-level {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
  backdrop-filter: blur(5px);
}

.player-level.legendary { background: linear-gradient(135deg, #FFD700, #FF8C00); }
.player-level.pro { background: linear-gradient(135deg, #667eea, #764ba2); }
.player-level.rising { background: linear-gradient(135deg, #11998e, #38ef7d); }
.player-level.rookie { background: linear-gradient(135deg, #6c757d, #495057); }

.quick-stats {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-left: auto;
}

.quick-stat {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  backdrop-filter: blur(5px);
}

.qs-value {
  font-weight: 700;
  font-size: 0.95rem;
}

.qs-label {
  font-size: 0.85rem;
}

/* Card Body */
.card-body {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.player-identity {
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.player-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 0.25rem 0;
}

.card-body .player-email {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
}

.player-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.active {
  background: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.stat-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--input-bg);
  border-radius: 12px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.stat-cell:hover {
  background: var(--card-bg);
  border-color: var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-cell.highlight {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
  border-color: rgba(255, 215, 0, 0.3);
}

.stat-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.stat-details {
  flex: 1;
  min-width: 0;
}

.stat-cell .stat-label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.stat-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: var(--primary-color);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.stat-btn:hover:not(:disabled) {
  transform: scale(1.1);
  background: var(--primary-dark);
}

.stat-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stat-btn.minus {
  background: #ef4444;
}

.stat-btn.plus {
  background: #10b981;
}

.stat-cell .stat-input {
  width: 50px;
  padding: 0.35rem 0.5rem;
  text-align: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-color);
  font-weight: 600;
  font-size: 0.95rem;
}

.stat-cell .stat-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.stat-cell .stat-input:disabled {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

/* Performance Section */
.performance-section {
  margin-top: auto;
}

.performance-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.performance-label span:first-child {
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.perf-score {
  font-weight: 700;
  color: var(--text-color);
}

.performance-bar {
  height: 8px;
  background: var(--input-bg);
  border-radius: 4px;
  overflow: hidden;
}

.performance-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.performance-fill.excellent {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.performance-fill.good {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.performance-fill.average {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.performance-fill.low {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

/* Card Footer */
.card-footer {
  padding: 1rem 1.5rem;
  background: var(--input-bg);
  border-top: 1px solid var(--border-color);
}

.card-footer .remove-btn {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.card-footer .remove-btn:hover {
  background: #ef4444;
  color: white;
}

/* Card Animation */
.card-move-enter-active,
.card-move-leave-active {
  transition: all 0.3s ease;
}

.card-move-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.card-move-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Legacy styles below - keeping for backwards compatibility */
.player-avatar {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.avatar-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-right: 1rem;
}

.player-badges {
  display: flex;
  gap: 0.5rem;
}

.goal-badge {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.assist-badge {
  background-color: rgba(33, 150, 243, 0.2);
  color: #2196F3;
}

.player-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: var(--text-color);
}

.player-email {
  margin: 0 0 0.75rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.player-status {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.status-dot.active {
  background-color: #4CAF50;
}

.status-dot.warning {
  background-color: #FFC107;
}

.status-dot.inactive {
  background-color: #F44336;
}

/* Player Stats */
.player-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-item label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.stat-value {
  display: flex;
  align-items: center;
}

.stat-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-color);
}

.stat-input:disabled {
  background-color: var(--disabled-bg);
  cursor: not-allowed;
}

.remove-btn {
  margin-top: auto;
  padding: 0.75rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
}

.remove-btn:hover {
  background-color: #d32f2f;
}

/* Table View */
.players-list.table-view {
  overflow-x: auto;
  margin-bottom: 3rem;
}

.players-list.table-view table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.players-list.table-view th,
.players-list.table-view td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.players-list.table-view th {
  background: var(--primary-color);
  color: white;
  font-weight: 500;
  position: sticky;
  top: 0;
}

.player-info-list {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-circle-sm {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.email-small {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.stat-input-list {
  width: 60px;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-color);
}

.danger-btn {
  background: #f44336;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.danger-btn:hover {
  background: #d32f2f;
}

/* Statistics Section */
.stats-section {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
}

.stats-section h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-color);
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 2rem;
}

.chart-wrapper {
  background-color: var(--card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.chart-wrapper h3 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-color);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  margin: 2rem 0;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px dashed var(--border-color);
}

.empty-state h3 {
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin: 0;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(0, 115, 230, 0.2);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-overlay p {
  color: var(--text-color);
  font-size: 1.1rem;
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: white;
  z-index: 1000;
  animation: slideIn 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast.success {
  background: #4CAF50;
}

.toast.error {
  background: #f44336;
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideIn {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .team-hero {
    padding: 1.5rem;
  }
  
  .hero-content {
    flex-direction: column;
    text-align: center;
  }
  
  .team-name {
    font-size: 1.75rem;
  }
  
  .team-stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .team-header h1 {
    font-size: 2rem;
  }
  
  .team-controls {
    flex-direction: column;
  }
  
  .players-list.cards-view {
    grid-template-columns: 1fr;
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .team-container {
    padding: 1rem;
  }
  
  .team-stats-summary {
    grid-template-columns: 1fr;
  }
  
  .team-logo {
    width: 80px;
    height: 80px;
  }
  
  .logo-initials {
    font-size: 1.75rem;
  }
  
  .player-stats {
    grid-template-columns: 1fr;
  }
  
  .players-list.table-view th,
  .players-list.table-view td {
    padding: 0.75rem;
  }
  
  .player-info-list {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

/* Chat Styles */
.chat-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  margin-left: auto;
}

.chat-toggle-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}

.floating-chat {
  position: fixed;
  right: 2rem;
  top: 80px;
  bottom: 2rem;
  width: 400px;
  z-index: 1000;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

/* Slide animation */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .floating-chat {
    right: 0;
    left: 0;
    width: 100%;
    top: 60px;
    bottom: 0;
    border-radius: 0;
  }
  
  .chat-toggle-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  .chat-toggle-btn span:not(.unread-badge) {
    display: none;
  }

  /* Responsive player cards */
  .cards-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    padding: 1.25rem;
  }

  .card-header .avatar-circle {
    width: 60px;
    height: 60px;
    font-size: 1.25rem;
  }

  .quick-stats {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .stat-cell {
    flex-direction: column;
    text-align: center;
    padding: 0.5rem;
  }

  .stat-input-wrapper {
    justify-content: center;
  }

  .stat-cell .stat-input {
    width: 45px;
  }

  .stat-btn {
    width: 22px;
    height: 22px;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .card-header {
    flex-wrap: wrap;
    justify-content: center;
    text-align: center;
  }

  .quick-stats {
    width: 100%;
    justify-content: center;
    margin-top: 0.75rem;
  }

  .player-rank {
    position: static;
    order: -1;
  }

  .drag-handle {
    top: 0.5rem;
    left: 0.5rem;
  }
}
</style>