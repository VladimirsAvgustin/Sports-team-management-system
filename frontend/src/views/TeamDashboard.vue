<template>
  <div class="team-dashboard">
    <div class="dashboard-shell">
      <section class="dashboard-hero">
        <div class="hero-grid">
          <div class="hero-brand">
            <button
              type="button"
              class="logo-frame"
              :class="{ interactive: isCoach }"
              :disabled="!isCoach"
              @click="triggerLogoUpload"
            >
              <img v-if="team.logo" :src="team.logo" :alt="team.name" class="team-logo-image" />
              <div v-else class="logo-fallback">{{ teamInitials }}</div>
              <span v-if="isCoach" class="logo-edit-badge">Update crest</span>
            </button>

            <div v-if="isCoach" class="logo-actions">
              <button type="button" class="hero-button secondary" @click="triggerLogoUpload">
                Change logo
              </button>
              <button v-if="team.logo" type="button" class="hero-button danger" @click="deleteLogo">
                Remove logo
              </button>
            </div>

            <input
              ref="logoInput"
              type="file"
              accept="image/*"
              class="hidden-input"
              @change="handleLogoUpload"
            />
          </div>

          <div class="hero-copy">
            <p class="eyebrow">Team dashboard</p>
            <h1>{{ team.name || 'Team space' }}</h1>
            <p class="hero-description">
              Central hub for your squad, recent performance and upcoming workload.
            </p>

            <div class="hero-pills">
              <span class="hero-pill code">Code: {{ team.team_code || 'N/A' }}</span>
              <span class="hero-pill">{{ summary.totalPlayers }} players</span>
              <span class="hero-pill">{{ upcomingEvents.length }} upcoming events</span>
              <span v-if="isCoach" class="hero-pill accent">
                {{ isMainCoach ? 'Main coach access' : 'Assistant coach access' }}
              </span>
              <span v-if="isMainCoach && coachRequests.length" class="hero-pill attention">
                {{ coachRequests.length }} coach request{{ coachRequests.length === 1 ? '' : 's' }}
              </span>
            </div>

            <div class="hero-actions">
              <router-link
                v-for="link in quickLinks"
                :key="link.to"
                :to="link.to"
                class="hero-link"
              >
                <span class="link-title">{{ link.label }}</span>
                <span class="link-subtitle">{{ link.description }}</span>
              </router-link>
            </div>
          </div>

          <div class="hero-highlight">
            <div class="highlight-card">
              <span class="highlight-label">Next event</span>
              <strong>{{ nextEventTitle }}</strong>
              <p>{{ nextEventMeta }}</p>
            </div>
            <div class="highlight-card soft">
              <span class="highlight-label">Team pulse</span>
              <strong>{{ readinessLabel }}</strong>
              <p>{{ readinessText }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="metrics-grid">
        <article v-for="metric in headlineMetrics" :key="metric.label" class="metric-card">
          <span class="metric-label">{{ metric.label }}</span>
          <strong class="metric-value">{{ metric.value }}</strong>
          <span class="metric-note">{{ metric.note }}</span>
        </article>
      </section>

      <section v-if="isMainCoach" class="panel coach-requests-panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Coach inbox</p>
            <h2>Assistant coach requests</h2>
          </div>
          <span class="panel-chip">{{ coachRequests.length }} pending</span>
        </div>

        <div v-if="coachRequestsLoading" class="empty-card">
          Loading assistant coach requests...
        </div>
        <div v-else-if="coachRequests.length" class="coach-request-list">
          <article v-for="request in coachRequests" :key="request.id" class="coach-request-card">
            <div class="coach-request-main">
              <div class="coach-request-avatar">
                <img v-if="request.avatar" :src="request.avatar" :alt="coachRequestName(request)" class="coach-request-image">
                <template v-else>{{ getInitials(coachRequestName(request)) }}</template>
              </div>
              <div class="coach-request-copy">
                <strong>{{ coachRequestName(request) }}</strong>
                <p>{{ request.email }}</p>
                <small>Requested {{ formatRequestDate(request.created_at) }}</small>
              </div>
            </div>
            <div class="coach-request-actions">
              <button type="button" class="hero-button secondary" @click="reviewCoachRequest(request, 'reject')">
                Reject
              </button>
              <button type="button" class="hero-button primary" @click="reviewCoachRequest(request, 'approve')">
                Approve
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-card">
          New assistant coach requests will appear here for the main coach only.
        </div>
      </section>

      <section class="section-grid">
        <article class="panel panel-large">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">Performance</p>
              <h2>Leaders board</h2>
            </div>
            <span class="panel-chip">{{ rankedPlayers.length }} tracked players</span>
          </div>

          <div v-if="topPlayers.length" class="leaderboard">
            <div
              v-for="(player, index) in topPlayers"
              :key="player.id"
              class="leader-card"
              :class="`rank-${index + 1}`"
            >
              <div class="leader-rank">#{{ index + 1 }}</div>
              <div class="leader-main">
                <div class="leader-avatar">{{ getInitials(fullName(player)) }}</div>
                <div>
                  <h3>{{ fullName(player) }}</h3>
                  <p>{{ performanceLabel(player) }}</p>
                </div>
              </div>
              <div class="leader-stats">
                <span>{{ player.stats.goals }} G</span>
                <span>{{ player.stats.assists }} A</span>
                <span>{{ player.stats.matches }} M</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-card">
            No player statistics yet. Start tracking matches to populate the board.
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">Schedule</p>
              <h2>Upcoming</h2>
            </div>
            <router-link :to="`/team-schedule/${teamId}`" class="panel-link">Open schedule</router-link>
          </div>

          <div v-if="upcomingEvents.length" class="event-list">
            <div v-for="event in upcomingEvents.slice(0, 4)" :key="event.id" class="event-item">
              <div class="event-date">
                <strong>{{ formatShortDay(event.event_date) }}</strong>
                <span>{{ formatDayNumber(event.event_date) }}</span>
              </div>
              <div class="event-copy">
                <h3>{{ event.event_name }}</h3>
                <p>{{ event.location || 'Location to be confirmed' }}</p>
              </div>
              <div class="event-meta">
                <span class="event-badge" :class="event.event_type || 'other'">{{ eventTypeLabel(event.event_type) }}</span>
                <span>{{ formatEventTime(event.event_time) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-card">
            No upcoming events yet. The schedule page is ready for the next practice or match.
          </div>
        </article>
      </section>

      <section class="section-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">Insights</p>
              <h2>Team stats</h2>
            </div>
          </div>

          <div class="insight-list">
            <div v-for="item in insightCards" :key="item.label" class="insight-item">
              <span class="insight-label">{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.note }}</small>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="panel-kicker">Roster</p>
              <h2>Squad snapshot</h2>
            </div>
            <router-link :to="`/team/${teamId}/players`" class="panel-link">Manage players</router-link>
          </div>

          <div v-if="rosterPreview.length" class="roster-list">
            <div v-for="player in rosterPreview" :key="player.id" class="roster-item">
              <div class="roster-avatar">{{ getInitials(fullName(player)) }}</div>
              <div class="roster-copy">
                <h3>{{ fullName(player) }}</h3>
                <p>{{ player.email }}</p>
              </div>
              <div class="roster-bars">
                <div class="bar-row">
                  <span>Goals</span>
                  <div class="bar-track"><div class="bar-fill goals" :style="{ width: statWidth(player.stats.goals, maxGoals) }"></div></div>
                </div>
                <div class="bar-row">
                  <span>Assists</span>
                  <div class="bar-track"><div class="bar-fill assists" :style="{ width: statWidth(player.stats.assists, maxAssists) }"></div></div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-card">
            The roster is empty right now. Once players join, this area becomes your squad overview.
          </div>
        </article>
      </section>

      <div v-if="toastMessage" class="toast" :class="toastType">{{ toastMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { canManageTeam, isTeamOwner } from '../utils/teamAccess'
import {
  approveCoachJoinRequest,
  fetchCoachJoinRequests,
  fetchTeamBundle,
  rejectCoachJoinRequest,
  fetchTeamSchedule,
  fetchTeamSummary,
  removeTeamLogo,
  uploadTeamLogo
} from '../services/teamApi'

const route = useRoute()
const authStore = useAuthStore()

const teamId = route.params.id
const team = ref({ name: '', coach_id: null, team_code: '', logo: null })
const players = ref([])
const schedule = ref([])
const summary = ref({
  totalPlayers: 0,
  totalMatches: 0,
  totalGoals: 0,
  totalAssists: 0,
  totalYellowCards: 0,
  totalRedCards: 0,
  avgAttendance: 0,
  topScorers: [],
  topAssists: []
})
const toastMessage = ref('')
const toastType = ref('success')
const logoInput = ref(null)
const coachRequests = ref([])
const coachRequestsLoading = ref(false)

const currentUser = computed(() => authStore.user)
const isCoach = canManageTeam({
  userRef: currentUser,
  teamRef: team,
  teamIdRef: computed(() => teamId)
})
const isMainCoach = isTeamOwner({
  userRef: currentUser,
  teamRef: team
})

const fullName = (player) => `${player.name || ''} ${player.surname || ''}`.trim()
const getInitials = (name) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'
const teamInitials = computed(() => getInitials(team.value.name || 'Team'))

const playerScore = (player) => (
  (player.stats?.goals || 0) * 4 +
  (player.stats?.assists || 0) * 3 +
  (player.stats?.matches || 0)
)

const rankedPlayers = computed(() => [...players.value].sort((a, b) => {
  const scoreDiff = playerScore(b) - playerScore(a)
  if (scoreDiff !== 0) return scoreDiff
  return fullName(a).localeCompare(fullName(b))
}))

const topPlayers = computed(() => rankedPlayers.value.slice(0, 3))
const rosterPreview = computed(() => rankedPlayers.value.slice(0, 6))
const maxGoals = computed(() => Math.max(1, ...players.value.map((player) => player.stats?.goals || 0)))
const maxAssists = computed(() => Math.max(1, ...players.value.map((player) => player.stats?.assists || 0)))

const sortEvents = (events) => [...events].sort((a, b) => {
  const aStamp = new Date(`${a.event_date}T${a.event_time || '00:00'}`).getTime()
  const bStamp = new Date(`${b.event_date}T${b.event_time || '00:00'}`).getTime()
  return aStamp - bStamp
})

const upcomingEvents = computed(() => {
  const now = Date.now()

  return sortEvents(schedule.value).filter((event) => {
    const eventStamp = new Date(`${event.event_date}T${event.event_time || '00:00'}`).getTime()
    return eventStamp >= now
  })
})

const nextEventTitle = computed(() => upcomingEvents.value[0]?.event_name || 'No event booked')
const nextEventMeta = computed(() => {
  const nextEvent = upcomingEvents.value[0]

  if (!nextEvent) {
    return 'The calendar is clear. Add the next session from the schedule page.'
  }

  return `${formatFullDate(nextEvent.event_date)} at ${formatEventTime(nextEvent.event_time)}`
})

const readinessScore = computed(() => {
  const attendance = summary.value.avgAttendance || 0
  const disciplinePenalty = (summary.value.totalRedCards * 10) + (summary.value.totalYellowCards * 2)
  return Math.max(0, Math.min(100, Math.round(attendance + 15 - disciplinePenalty)))
})

const readinessLabel = computed(() => {
  if (readinessScore.value >= 80) return 'High readiness'
  if (readinessScore.value >= 60) return 'Good rhythm'
  if (readinessScore.value >= 40) return 'Building momentum'
  return 'Needs structure'
})

const readinessText = computed(() => {
  return `${summary.value.avgAttendance}% practice attendance with ${summary.value.totalRedCards} red cards this cycle.`
})

const headlineMetrics = computed(() => [
  {
    label: 'Goals',
    value: summary.value.totalGoals,
    note: `${perPlayer(summary.value.totalGoals)} per player`
  },
  {
    label: 'Assists',
    value: summary.value.totalAssists,
    note: `${perPlayer(summary.value.totalAssists)} per player`
  },
  {
    label: 'Matches',
    value: summary.value.totalMatches,
    note: `${upcomingEvents.value.length} upcoming`
  },
  {
    label: 'Attendance',
    value: `${summary.value.avgAttendance}%`,
    note: 'Practice availability'
  }
])

const topScorer = computed(() => summary.value.topScorers[0] || rankedPlayers.value[0] || null)
const topCreator = computed(() => summary.value.topAssists[0] || null)
const everPresent = computed(() => rankedPlayers.value[0] || null)
const disciplineLeader = computed(() => {
  if (!players.value.length) return null
  return [...players.value].sort((a, b) => {
    const aCards = (a.stats?.yellow_cards || 0) + ((a.stats?.red_cards || 0) * 3)
    const bCards = (b.stats?.yellow_cards || 0) + ((b.stats?.red_cards || 0) * 3)
    return aCards - bCards
  })[0]
})

const insightCards = computed(() => [
  {
    label: 'Top scorer',
    value: topScorer.value ? fullName(topScorer.value) : 'No data yet',
    note: topScorer.value ? `${topScorer.value.goals ?? topScorer.value.stats?.goals ?? 0} goals scored` : 'Waiting for first goal'
  },
  {
    label: 'Top creator',
    value: topCreator.value ? fullName(topCreator.value) : 'No data yet',
    note: topCreator.value ? `${topCreator.value.assists ?? topCreator.value.stats?.assists ?? 0} assists delivered` : 'Waiting for first assist'
  },
  {
    label: 'Workhorse',
    value: everPresent.value ? fullName(everPresent.value) : 'No data yet',
    note: everPresent.value ? `${everPresent.value.stats?.matches || 0} appearances tracked` : 'Matches are not tracked yet'
  },
  {
    label: 'Best discipline',
    value: disciplineLeader.value ? fullName(disciplineLeader.value) : 'No data yet',
    note: disciplineLeader.value
      ? `${disciplineLeader.value.stats?.yellow_cards || 0} yellow, ${disciplineLeader.value.stats?.red_cards || 0} red`
      : 'Roster is still empty'
  }
])

const quickLinks = computed(() => {
  const links = [
    {
      to: `/team/${teamId}/players`,
      label: 'Players',
      description: 'Open the roster and player stats'
    },
    {
      to: `/team-schedule/${teamId}`,
      label: 'Schedule',
      description: 'Practices, matches and meetings'
    }
  ]

  if (isCoach.value) {
    links.unshift({
      to: `/team/${teamId}/statistics`,
      label: 'Statistics',
      description: 'Coach analytics and distributions'
    })
  }

  return links
})

const coachRequestName = (request) => `${request.name || ''} ${request.surname || ''}`.trim() || 'Coach request'

const loadCoachRequests = async () => {
  if (!isMainCoach.value) {
    coachRequests.value = []
    return
  }

  coachRequestsLoading.value = true

  try {
    coachRequests.value = await fetchCoachJoinRequests(teamId)
  } catch (error) {
    console.error('Error loading coach requests:', error)
    showToast('Could not load assistant coach requests.', 'error')
  } finally {
    coachRequestsLoading.value = false
  }
}

const fetchDashboard = async () => {
  try {
    const [bundle, nextSummary, nextSchedule] = await Promise.all([
      fetchTeamBundle(teamId),
      fetchTeamSummary(teamId),
      fetchTeamSchedule(teamId)
    ])

    team.value = bundle.team
    players.value = bundle.players
    summary.value = nextSummary
    schedule.value = nextSchedule
    await loadCoachRequests()

    if (isMainCoach.value && coachRequests.value.length) {
      showToast(
        `${coachRequests.value.length} assistant coach request${coachRequests.value.length === 1 ? '' : 's'} waiting for review.`,
        'info'
      )
    }
  } catch (error) {
    console.error('Error loading team dashboard:', error)
    showToast('Failed to load the team dashboard.', 'error')
  }
}

const triggerLogoUpload = () => {
  if (!isCoach.value) return
  logoInput.value?.click()
}

const handleLogoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    showToast('Image must be smaller than 2 MB.', 'error')
    return
  }

  try {
    team.value.logo = await uploadTeamLogo(teamId, file)
    showToast('Team logo updated.')
  } catch (error) {
    console.error('Error uploading team logo:', error)
    showToast('Could not update the team logo.', 'error')
  } finally {
    event.target.value = ''
  }
}

const deleteLogo = async () => {
  if (!confirm(`Remove ${team.value.name || 'team'} logo?`)) return

  try {
    await removeTeamLogo(teamId)
    team.value.logo = null
    showToast('Team logo removed.')
  } catch (error) {
    console.error('Error deleting team logo:', error)
    showToast('Could not remove the team logo.', 'error')
  }
}

const reviewCoachRequest = async (request, decision) => {
  const actionLabel = decision === 'approve' ? 'approve' : 'reject'

  if (!confirm(`${actionLabel === 'approve' ? 'Approve' : 'Reject'} ${coachRequestName(request)}?`)) {
    return
  }

  try {
    if (decision === 'approve') {
      await approveCoachJoinRequest(teamId, request.id)
      showToast(`${coachRequestName(request)} is now an assistant coach.`)
    } else {
      await rejectCoachJoinRequest(teamId, request.id)
      showToast(`${coachRequestName(request)} request was rejected.`)
    }

    coachRequests.value = coachRequests.value.filter((entry) => entry.id !== request.id)
  } catch (error) {
    console.error(`Error trying to ${actionLabel} coach request:`, error)
    showToast(error.response?.data?.error || `Could not ${actionLabel} this request.`, 'error')
  }
}

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

const perPlayer = (value) => {
  if (!summary.value.totalPlayers) return '0.0'
  return (value / summary.value.totalPlayers).toFixed(1)
}

const performanceLabel = (player) => {
  const score = playerScore(player)
  if (score >= 25) return 'Driving the squad'
  if (score >= 15) return 'Reliable contributor'
  if (score >= 8) return 'Growing influence'
  return 'Building up'
}

const statWidth = (value, maxValue) => `${Math.max(10, (value / maxValue) * 100)}%`
const formatFullDate = (value) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
const formatShortDay = (value) => new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${value}T00:00:00`))
const formatDayNumber = (value) => new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`))
const formatEventTime = (value) => (value ? value.slice(0, 5) : 'TBD')
const formatRequestDate = (value) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

const eventTypeLabel = (value) => {
  const normalized = (value || '').toLowerCase()
  if (normalized === 'practice') return 'Practice'
  if (normalized === 'game') return 'Game'
  if (normalized === 'meeting') return 'Meeting'
  return 'Event'
}

onMounted(() => {
  fetchDashboard()
})
</script>

<style scoped>
.team-dashboard {
  --team-page-bg: var(--bg-color, var(--background-color));
  --team-surface: var(--bg-color-secondary, var(--card-bg));
  --team-border: var(--border-color);
  --team-text: var(--text-color);
  --team-muted: var(--text-color-secondary, var(--text-secondary));
  --team-accent: #0b72e7;
  --team-accent-soft: rgba(11, 114, 231, 0.14);
  --team-danger-soft: rgba(220, 53, 69, 0.12);
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 22%),
    var(--team-page-bg);
  color: var(--team-text);
}

html.dark-mode .team-dashboard {
  --team-accent: #6fb2ff;
  --team-accent-soft: rgba(74, 144, 226, 0.2);
  --team-danger-soft: rgba(255, 107, 107, 0.18);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.22), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    var(--team-page-bg);
}

.dashboard-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
}

.dashboard-hero,
.panel,
.metric-card {
  background: var(--team-surface);
  border: 1px solid var(--team-border);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.dashboard-hero {
  border-radius: 28px;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--team-accent-soft), transparent 65%), var(--team-surface);
}

.hero-grid {
  display: grid;
  grid-template-columns: auto 1.4fr minmax(240px, 320px);
  gap: 1.5rem;
}

.hero-brand {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.logo-frame {
  width: 160px;
  height: 160px;
  border: 1px solid var(--team-border);
  border-radius: 28px;
  padding: 0;
  background: linear-gradient(145deg, var(--team-surface), rgba(255, 255, 255, 0.05));
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--team-accent);
  font-size: 2.75rem;
  font-weight: 800;
  cursor: default;
}

.logo-frame.interactive {
  cursor: pointer;
}

.logo-frame:disabled {
  opacity: 1;
}

.logo-frame.interactive:hover {
  transform: translateY(-2px);
}

.team-logo-image,
.logo-fallback {
  width: 100%;
  height: 100%;
}

.team-logo-image {
  object-fit: cover;
}

.logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--team-accent-soft), transparent);
}

.logo-edit-badge {
  position: absolute;
  inset: auto 0 0 0;
  padding: 0.65rem 0.8rem;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.72));
  color: white;
  font-size: 0.8rem;
}

.logo-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.hidden-input {
  display: none;
}

.hero-copy h1 {
  margin: 0.25rem 0 0.9rem;
  font-size: clamp(2rem, 3vw, 3.2rem);
  line-height: 1;
}

.eyebrow,
.panel-kicker {
  margin: 0;
  color: var(--team-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
}

.hero-description {
  max-width: 58ch;
  margin: 0;
  color: var(--team-muted);
}

.hero-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 1.2rem 0 1.5rem;
}

.hero-pill,
.panel-link,
.panel-chip,
.leader-stats span,
.event-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
}

.hero-pill {
  border: 1px solid var(--team-border);
  background: var(--team-surface);
  color: var(--team-muted);
}

.hero-pill.code {
  color: var(--team-text);
}

.hero-pill.accent,
.panel-link,
.panel-chip,
.leader-stats span {
  background: var(--team-accent-soft);
  color: var(--team-accent);
}

.hero-pill.attention {
  background: rgba(11, 114, 231, 0.18);
  color: var(--team-accent);
  border-color: rgba(11, 114, 231, 0.28);
}

.hero-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.hero-link {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid var(--team-border);
  background: var(--team-surface);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.hero-link:hover {
  transform: translateY(-2px);
  border-color: var(--team-accent);
}

.link-title {
  font-weight: 700;
}

.link-subtitle {
  color: var(--team-muted);
  font-size: 0.86rem;
}

.hero-highlight {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.highlight-card {
  min-height: 132px;
  padding: 1.1rem 1.15rem;
  border: 1px solid var(--team-border);
  border-radius: 22px;
  background: var(--team-surface);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.highlight-card.soft {
  background: linear-gradient(135deg, var(--team-accent-soft), transparent 70%), var(--team-surface);
}

.highlight-label,
.metric-label,
.insight-label {
  color: var(--team-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.82rem;
}

.highlight-card strong {
  margin: 0.35rem 0;
  font-size: 1.2rem;
}

.highlight-card p {
  margin: 0;
  color: var(--team-muted);
}

.hero-button {
  border: 1px solid var(--team-border);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  background: var(--team-surface);
  color: var(--team-text);
  cursor: pointer;
  font-weight: 700;
}

.hero-button.primary {
  background: var(--team-accent);
  border-color: var(--team-accent);
  color: white;
}

.hero-button.secondary:hover,
.hero-button.secondary:focus-visible {
  border-color: var(--team-accent);
}

.hero-button.danger {
  background: var(--team-danger-soft);
  color: #b42318;
}

html.dark-mode .hero-button.danger {
  color: #ff8b8b;
}

.metrics-grid,
.section-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.metrics-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.section-grid {
  grid-template-columns: 1.2fr 0.95fr;
}

.panel,
.metric-card {
  border-radius: 24px;
  padding: 1.25rem;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.metric-value {
  font-size: 2rem;
  line-height: 1;
}

.metric-note {
  color: var(--team-muted);
  font-size: 0.88rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0.25rem 0 0;
  font-size: 1.35rem;
}

.leaderboard,
.event-list,
.roster-list,
.coach-request-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.leader-card,
.event-item,
.roster-item,
.coach-request-card,
.insight-item,
.empty-card {
  border: 1px solid var(--team-border);
  border-radius: 18px;
  padding: 0.95rem 1rem;
}

.coach-requests-panel {
  margin-top: 1rem;
}

.coach-request-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  background: linear-gradient(135deg, rgba(11, 114, 231, 0.06), transparent 75%);
}

.coach-request-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.coach-request-avatar {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: var(--team-accent-soft);
  color: var(--team-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  overflow: hidden;
  flex-shrink: 0;
}

.coach-request-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.coach-request-copy {
  min-width: 0;
}

.coach-request-copy strong,
.coach-request-copy p,
.coach-request-copy small {
  display: block;
}

.coach-request-copy p,
.coach-request-copy small {
  margin: 0.2rem 0 0;
  color: var(--team-muted);
  overflow: hidden;
  text-overflow: ellipsis;
}

.coach-request-actions {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.leader-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
}

.leader-card.rank-1 {
  background: linear-gradient(135deg, var(--team-accent-soft), transparent 60%);
}

.leader-rank,
.leader-avatar,
.roster-avatar,
.event-date {
  background: var(--team-accent-soft);
  color: var(--team-accent);
}

.leader-rank {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.leader-main {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.leader-main h3,
.event-copy h3,
.roster-copy h3 {
  margin: 0;
}

.leader-main p,
.event-copy p,
.roster-copy p,
.empty-card,
.insight-item small {
  margin: 0.2rem 0 0;
  color: var(--team-muted);
}

.leader-avatar,
.roster-avatar {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.leader-stats {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.event-badge.game {
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
}

.event-badge.practice {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}

.event-badge.meeting {
  background: rgba(168, 85, 247, 0.14);
  color: #7c3aed;
}

html.dark-mode .event-badge.game {
  color: #ff9a9a;
}

html.dark-mode .event-badge.practice {
  color: #86efac;
}

html.dark-mode .event-badge.meeting {
  color: #d8b4fe;
}

.event-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
}

.event-date {
  min-width: 68px;
  border-radius: 16px;
  padding: 0.75rem 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.event-date strong {
  font-size: 0.82rem;
  text-transform: uppercase;
}

.event-date span {
  font-size: 1rem;
  font-weight: 700;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  align-items: flex-end;
  color: var(--team-muted);
  font-size: 0.88rem;
}

.roster-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(180px, 240px);
  gap: 1rem;
  align-items: center;
}

.roster-bars {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 0.7rem;
  align-items: center;
}

.bar-row span {
  color: var(--team-muted);
  font-size: 0.82rem;
}

.bar-track {
  height: 9px;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.14);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
}

.bar-fill.goals {
  background: linear-gradient(90deg, #0b72e7, #4aa4ff);
}

.bar-fill.assists {
  background: linear-gradient(90deg, #2456d3, #6fa3ff);
}

html.dark-mode .bar-fill.goals {
  background: linear-gradient(90deg, #4b8fff, #8dc0ff);
}

html.dark-mode .bar-fill.assists {
  background: linear-gradient(90deg, #3266e4, #8eb7ff);
}

.insight-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.insight-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.empty-card {
  background: rgba(255, 255, 255, 0.02);
}

.toast {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  padding: 0.9rem 1.15rem;
  border-radius: 14px;
  color: white;
  background: #1f8f5a;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
  z-index: 20;
}

.toast.error {
  background: #c43d3d;
}

.toast.info {
  background: #0b72e7;
}

@media (max-width: 1180px) {
  .hero-grid,
  .section-grid {
    grid-template-columns: 1fr;
  }

  .hero-highlight {
    flex-direction: row;
  }

  .hero-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-shell {
    padding: 1rem;
  }

  .dashboard-hero,
  .panel,
  .metric-card {
    border-radius: 20px;
  }

  .hero-grid {
    gap: 1rem;
  }

  .hero-brand {
    align-items: center;
  }

  .logo-frame {
    width: 122px;
    height: 122px;
    border-radius: 22px;
  }

  .hero-copy {
    text-align: center;
  }

  .hero-pills {
    justify-content: center;
  }

  .hero-actions,
  .metrics-grid,
  .insight-list {
    grid-template-columns: 1fr;
  }

  .hero-highlight {
    flex-direction: column;
  }

  .leader-card,
  .event-item,
  .roster-item,
  .coach-request-card {
    grid-template-columns: 1fr;
  }

  .leader-stats,
  .event-meta {
    justify-content: flex-start;
    align-items: flex-start;
  }

  .roster-bars {
    width: 100%;
  }

  .coach-request-card,
  .coach-request-main,
  .coach-request-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .coach-request-copy {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .dashboard-shell {
    padding: 0.75rem;
  }

  .dashboard-hero {
    padding: 1rem;
  }

  .hero-copy h1 {
    font-size: 1.8rem;
  }

  .panel,
  .metric-card {
    padding: 1rem;
  }

  .hero-link {
    padding: 0.9rem;
  }

  .event-date {
    min-width: 0;
    width: fit-content;
  }

  .toast {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
  }
}
</style>
