<template>
  <div class="team-container">
    <!-- Team Header -->
    <div class="team-header">
      <h1>{{ team.name }}</h1>
      <h2>{{ team.team_code }}</h2>
      <div class="team-meta">
        <span class="badge">{{ sortedPlayers.length }} players</span>
      </div>
    </div>

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
      <transition-group name="fade">
        <div 
          v-for="player in sortedPlayers" 
          :key="player.id" 
          class="player-card"
          :class="{ 'highlight-top': isTopPerformer(player) }"
        >
          <div class="player-avatar">
            <div class="avatar-circle">
              {{ getInitials(player.username) }}
            </div>
            <div class="player-badges">
              <span v-if="player.stats.goals > 0" class="badge goal-badge">
                {{ player.stats.goals }}
              </span>
              <span v-if="player.stats.assists > 0" class="badge assist-badge">
                {{ player.stats.assists }}
              </span>
            </div>
          </div>
          <div class="player-info">
            <h3>{{ player.username }}</h3>
            <p class="player-email">{{ player.email }}</p>
            <div class="player-status">
              <span class="status-dot" :class="getStatusClass(player)"></span>
              Active Player
            </div>
          </div>

          <!-- Player Stats -->
          <div class="player-stats">
            <div class="stat-item" v-for="stat in statFields" :key="stat.key">
              <label>{{ stat.label }}:</label>
              <div class="stat-value">
                <input 
                  v-model.number="player.stats[stat.key]" 
                  type="number" 
                  min="0"
                  :disabled="!isCoach"
                  @change="updatePlayerStats(player)"
                  class="stat-input"
                >
              </div>
            </div>
          </div>
          <button 
            v-if="isCoach" 
            @click="confirmRemovePlayer(player)" 
            class="remove-btn"
          >
            Remove Player
          </button>
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
import Chart from 'chart.js/auto'

const route = useRoute()
const authStore = useAuthStore()
const teamId = route.params.id

// Refs and state
const team = ref({ name: '', coach_id: null, team_code: '' })
const players = ref([])
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('username')
const viewMode = ref('cards') // 'cards' or 'list'
const toastMessage = ref('')
const toastType = ref('')

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
  } catch (err) {
    console.error('Error loading team:', err)
    showToast('Failed to load team data', 'error')
  } finally {
    loading.value = false
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
  return authStore.user?.role === 'Coach' && authStore.user.id === team.value.coach_id
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

// Chart rendering
const renderCharts = () => {
  if (!goalsChartRef.value || !assistsChartRef.value) return

  const topGoals = [...players.value]
    .sort((a, b) => b.stats.goals - a.stats.goals)
    .slice(0, 5)
    .filter(p => p.stats.goals > 0)
  
  const topAssists = [...players.value]
    .sort((a, b) => b.stats.assists - a.stats.assists)
    .slice(0, 5)
    .filter(p => p.stats.assists > 0)

  // Destroy old charts
  if (goalsChartInstance) goalsChartInstance.destroy()
  if (assistsChartInstance) assistsChartInstance.destroy()

  // Goals chart
  if (topGoals.length > 0) {
    goalsChartInstance = new Chart(goalsChartRef.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels: topGoals.map(p => p.username),
        datasets: [{
          label: 'Goals',
          data: topGoals.map(p => p.stats.goals),
          backgroundColor: '#4CAF50',
          borderRadius: 4
        }]
      },
      options: { 
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    })
  }

  // Assists chart
  if (topAssists.length > 0) {
    assistsChartInstance = new Chart(assistsChartRef.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels: topAssists.map(p => p.username),
        datasets: [{
          label: 'Assists',
          data: topAssists.map(p => p.stats.assists),
          backgroundColor: '#2196F3',
          borderRadius: 4
        }]
      },
      options: { 
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    })
  }
}

// Lifecycle
onMounted(() => {
  fetchTeamData()
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
}

/* Team Header */
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

.team-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
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
}

.view-toggle button.active {
  background: var(--primary-color);
  color: white;
}

dark-mode .view-toggle {
  background: var(--primary-color);
  border: 1px solid var(--border-color);

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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.player-card {
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.player-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.player-card.highlight-top::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #FFD700, #FFA500);
}

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
</style>