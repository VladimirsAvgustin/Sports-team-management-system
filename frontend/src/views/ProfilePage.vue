<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import axios from 'axios'

const auth = useAuthStore()
const router = useRouter()

const team = ref(null)
const stats = ref(null)
const attendanceRate = ref(null)
const loading = ref(true)
const activeTab = ref('overview')

const isDark = computed(() => document.documentElement.classList.contains('dark-mode'))

const user = computed(() => auth.user)
const isPlayer = computed(() => user.value?.role === 'Player')
const isCoach = computed(() => user.value?.role === 'Coach')

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const getRoleBadgeClass = (role) => {
  return role === 'Coach' ? 'role-coach' : 'role-player'
}

const fetchProfileData = async () => {
  loading.value = true
  try {
    // Fetch team info
    const teamRes = await fetch('/api/auth/my-team', {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    if (teamRes.ok) {
      const teamData = await teamRes.json()
      team.value = teamData.team || teamData
    }

    // Fetch player stats if player
    if (isPlayer.value && user.value?.id) {
      const statsRes = await axios.get(`/api/auth/players/${user.value.id}/stats`)
      stats.value = statsRes.data.stats
    }

    // Fetch attendance rate for player
    if (isPlayer.value && team.value?.id) {
      try {
        const attRes = await axios.get(`/api/teams/${team.value.id}/attendance/stats`)
        const myStats = attRes.data.find(s => s.user_id === user.value.id)
        if (myStats) {
          attendanceRate.value = myStats.attendance_rate
        }
      } catch (e) {
        // No attendance data yet
      }
    }

    // Fetch team stats for coach
    if (isCoach.value && team.value?.id) {
      try {
        const teamStatsRes = await axios.get(`/api/auth/teams/${team.value.id}/stats`)
        stats.value = teamStatsRes.data
      } catch (e) {
        console.error('Error fetching team stats:', e)
      }
    }
  } catch (err) {
    console.error('Error loading profile:', err)
  } finally {
    loading.value = false
  }
}

const memberSince = computed(() => {
  // Approximate from user ID or just show current year
  return 'Member'
})

const statCards = computed(() => {
  if (!stats.value) return []
  
  if (isPlayer.value) {
    return [
      { label: 'Matches', value: stats.value.matches || 0, icon: '⚽', color: '#667eea' },
      { label: 'Goals', value: stats.value.goals || 0, icon: '🥅', color: '#4caf50' },
      { label: 'Assists', value: stats.value.assists || 0, icon: '🤝', color: '#ff9800' },
      { label: 'Yellow Cards', value: stats.value.yellow_cards || 0, icon: '🟨', color: '#ffc107' },
      { label: 'Red Cards', value: stats.value.red_cards || 0, icon: '🟥', color: '#f44336' },
    ]
  }
  
  if (isCoach.value) {
    return [
      { label: 'Players', value: stats.value.totalPlayers || 0, icon: '👥', color: '#667eea' },
      { label: 'Matches', value: stats.value.totalMatches || 0, icon: '⚽', color: '#4caf50' },
      { label: 'Total Goals', value: stats.value.totalGoals || 0, icon: '🥅', color: '#ff9800' },
      { label: 'Total Assists', value: stats.value.totalAssists || 0, icon: '🤝', color: '#42a5f5' },
      { label: 'Avg Attendance', value: (stats.value.avgAttendance || 0) + '%', icon: '📊', color: '#ab47bc' },
    ]
  }
  
  return []
})

const handleLogout = () => {
  auth.logout()
}

onMounted(() => {
  fetchProfileData()
})
</script>

<template>
  <div class="profile-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading profile...</p>
    </div>

    <div v-else class="profile-content">
      <!-- Profile Header Card -->
      <div class="profile-header-card">
        <div class="profile-bg-pattern"></div>
        <div class="profile-header-inner">
          <div class="avatar-section">
            <div class="profile-avatar" :class="getRoleBadgeClass(user?.role)">
              {{ getInitials(user?.username) }}
            </div>
            <div class="role-badge" :class="getRoleBadgeClass(user?.role)">
              {{ user?.role }}
            </div>
          </div>
          
          <div class="profile-info">
            <h1 class="profile-name">{{ user?.username }}</h1>
            <p class="profile-email" v-if="user?.email">{{ user.email }}</p>
            <div class="profile-meta">
              <span v-if="team" class="meta-item team-meta">
                🏟️ {{ team.name }}
              </span>
              <span v-else class="meta-item no-team">
                No team yet
              </span>
            </div>
          </div>

          <div class="header-actions">
            <button @click="handleLogout" class="logout-btn">
              <span class="btn-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Info Bar -->
      <div class="info-bar" v-if="team">
        <div class="info-bar-item">
          <span class="info-label">Team</span>
          <span class="info-value">{{ team.name }}</span>
        </div>
        <div class="info-bar-item" v-if="team.team_code">
          <span class="info-label">Team Code</span>
          <span class="info-value code">{{ team.team_code }}</span>
        </div>
        <div class="info-bar-item" v-if="attendanceRate !== null">
          <span class="info-label">Attendance</span>
          <span class="info-value" :class="{ 'good': attendanceRate >= 75, 'mid': attendanceRate >= 50 && attendanceRate < 75, 'low': attendanceRate < 50 }">
            {{ attendanceRate }}%
          </span>
        </div>
      </div>

      <!-- Stats Cards -->
      <div v-if="statCards.length > 0" class="stats-section">
        <h2 class="section-title">
          {{ isPlayer ? '📊 My Statistics' : '📊 Team Overview' }}
        </h2>
        <div class="stats-grid">
          <div 
            v-for="(stat, i) in statCards" 
            :key="i" 
            class="stat-card"
            :style="{ '--accent': stat.color }"
          >
            <div class="stat-icon">{{ stat.icon }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-accent-bar"></div>
          </div>
        </div>
      </div>

      <!-- Top Scorers (Coach only) -->
      <div v-if="isCoach && stats?.topScorers?.length > 0" class="leaderboard-section">
        <h2 class="section-title">🏆 Top Scorers</h2>
        <div class="leaderboard-list">
          <div v-for="(player, i) in stats.topScorers" :key="player.user_id" class="leaderboard-item">
            <span class="rank" :class="{ gold: i === 0, silver: i === 1, bronze: i === 2 }">
              {{ i + 1 }}
            </span>
            <div class="lb-avatar">{{ getInitials(player.username) }}</div>
            <span class="lb-name">{{ player.username }}</span>
            <span class="lb-value">{{ player.goals }} goals</span>
          </div>
        </div>
      </div>

      <!-- No team state -->
      <div v-if="!team" class="no-team-card">
        <div class="no-team-icon">🏟️</div>
        <h3>No Team Yet</h3>
        <p>Join a team with a code or create your own to get started.</p>
      </div>
    </div>
  </div>
</template>

<style>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
  min-height: 80vh;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 15px;
  color: var(--text-color, #666);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #eee;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Profile Header */
.profile-header-card {
  background: var(--card-bg, white);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  margin-bottom: 20px;
}

.profile-bg-pattern {
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.profile-bg-pattern::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.profile-header-inner {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  padding: 0 30px 25px;
  margin-top: -50px;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}

.avatar-section {
  position: relative;
  flex-shrink: 0;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: white;
  border: 4px solid var(--card-bg, white);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.profile-avatar.role-coach {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.profile-avatar.role-player {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
}

.role-badge {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 14px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
  white-space: nowrap;
}

.role-badge.role-coach {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.role-badge.role-player {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
}

.profile-info {
  flex: 1;
  min-width: 0;
  padding-bottom: 5px;
}

.profile-name {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-color, #1a1a2e);
}

.profile-email {
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
  margin: 0 0 8px;
}

.profile-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.85rem;
  color: var(--text-secondary, #888);
}

.team-meta {
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  color: #667eea;
  font-weight: 600;
}

.no-team {
  background: rgba(255, 152, 0, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  color: #ff9800;
  font-weight: 600;
}

.header-actions {
  flex-shrink: 0;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background: transparent;
  border: 2px solid #ff4d4f;
  color: #ff4d4f;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
}

.logout-btn:hover {
  background: #ff4d4f;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
}

/* Info Bar */
.info-bar {
  display: flex;
  gap: 1px;
  background: var(--border-color, #e0e0e0);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.info-bar-item {
  flex: 1;
  padding: 16px 20px;
  background: var(--card-bg, white);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #999);
  font-weight: 600;
}

.info-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-color, #333);
}

.info-value.code {
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
  color: #667eea;
}

.info-value.good { color: #4caf50; }
.info-value.mid { color: #ff9800; }
.info-value.low { color: #f44336; }

/* Section Title */
.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 18px;
  color: var(--text-color, #1a1a2e);
}

/* Stats Grid */
.stats-section {
  margin-bottom: 25px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat-card {
  background: var(--card-bg, white);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 1.8rem;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-color, #1a1a2e);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary, #888);
  font-weight: 600;
  margin-top: 4px;
}

.stat-accent-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--accent);
  border-radius: 0 0 16px 16px;
}

/* Leaderboard */
.leaderboard-section {
  margin-bottom: 25px;
}

.leaderboard-list {
  background: var(--card-bg, white);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  transition: background 0.15s;
}

.leaderboard-item:last-child {
  border-bottom: none;
}

.leaderboard-item:hover {
  background: rgba(102, 126, 234, 0.04);
}

.rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  background: var(--card-bg-alt, #f5f5f5);
  color: var(--text-color, #666);
  flex-shrink: 0;
}

.rank.gold { background: #fff3cd; color: #856404; }
.rank.silver { background: #e2e8f0; color: #4a5568; }
.rank.bronze { background: #fde8d0; color: #8b5e34; }

.lb-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.lb-name {
  flex: 1;
  font-weight: 600;
  color: var(--text-color, #333);
}

.lb-value {
  font-weight: 700;
  color: #667eea;
  font-size: 0.9rem;
}

/* No Team Card */
.no-team-card {
  text-align: center;
  padding: 60px 30px;
  background: var(--card-bg, white);
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.no-team-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.no-team-card h3 {
  font-size: 1.3rem;
  margin-bottom: 8px;
  color: var(--text-color, #333);
}

.no-team-card p {
  color: var(--text-secondary, #888);
  font-size: 0.95rem;
}

/* Dark mode */
.dark-mode .profile-page {
  color: #f4f4f4;
}

.dark-mode .profile-header-card {
  background: #1e1e1e;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.dark-mode .profile-name {
  color: #f4f4f4;
}

.dark-mode .profile-email {
  color: #aaa;
}

.dark-mode .info-bar {
  background: #333;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.dark-mode .info-bar-item {
  background: #1e1e1e;
}

.dark-mode .info-label {
  color: #888;
}

.dark-mode .info-value {
  color: #f4f4f4;
}

.dark-mode .section-title {
  color: #f4f4f4;
}

.dark-mode .stat-card {
  background: #1e1e1e;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.dark-mode .stat-value {
  color: #f4f4f4;
}

.dark-mode .stat-label {
  color: #aaa;
}

.dark-mode .leaderboard-list {
  background: #1e1e1e;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.dark-mode .leaderboard-item {
  border-bottom-color: #333;
}

.dark-mode .leaderboard-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.dark-mode .lb-name {
  color: #f4f4f4;
}

.dark-mode .rank {
  background: #333;
  color: #ccc;
}

.dark-mode .no-team-card {
  background: #1e1e1e;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.dark-mode .no-team-card h3 {
  color: #f4f4f4;
}

.dark-mode .no-team-card p {
  color: #aaa;
}

.dark-mode .loading-state {
  color: #aaa;
}

.dark-mode .spinner {
  border-color: #333;
  border-top-color: #667eea;
}

.dark-mode .logout-btn {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.dark-mode .logout-btn:hover {
  background: #ff4d4f;
  color: white;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.2);
}

.dark-mode .meta-item.no-team {
  background: rgba(255, 152, 0, 0.15);
}

.dark-mode .team-meta {
  background: rgba(102, 126, 234, 0.15);
}

/* Responsive */
@media (max-width: 640px) {
  .profile-header-inner {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 20px 20px;
  }

  .profile-meta {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .info-bar {
    flex-direction: column;
    gap: 1px;
  }
}
</style>
