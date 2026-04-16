<template>
  <div class="statistics-page">
    <div class="statistics-shell">
      <section class="statistics-hero">
        <div class="hero-main">
          <div class="hero-copy">
            <p class="eyebrow">Performance analytics</p>
            <h1>{{ team.name || 'Team statistics' }}</h1>
           

            <div class="hero-pills">
              <span class="hero-pill">{{ summary.totalGoals }} goals</span>
              <span class="hero-pill">{{ summary.totalAssists }} assists</span>
              <span class="hero-pill">{{ summary.totalMatches }} matches</span>
              <span class="hero-pill accent">{{ summary.avgAttendance }}% attendance</span>
            </div>
          </div>

          <div class="hero-nav">
            <router-link :to="`/team/${teamId}/players`" class="nav-chip">
              Players
            </router-link>
            <router-link :to="`/team/${teamId}/statistics`" class="nav-chip" active-class="active">
              Statistics
            </router-link>
            <router-link :to="`/team-schedule/${teamId}`" class="nav-chip">
              Schedule
            </router-link>
          </div>
        </div>

        <div class="hero-side">
          <div class="summary-card">
            <span class="summary-label">Top scorer</span>
            <strong>{{ topScorer ? fullName(topScorer) : 'No data yet' }}</strong>
            <p>{{ topScorer ? `${topScorer.goals ?? topScorer.stats?.goals ?? 0} goals this cycle` : 'Scoring data will appear here.' }}</p>
          </div>
          <div class="summary-card soft">
            <span class="summary-label">Top creator</span>
            <strong>{{ topCreator ? fullName(topCreator) : 'No data yet' }}</strong>
            <p>{{ topCreator ? `${topCreator.assists ?? topCreator.stats?.assists ?? 0} assists created` : 'Assist trends will appear here.' }}</p>
          </div>
        </div>
      </section>

      <div v-if="isCoach">
        <section class="headline-grid">
          <article v-for="metric in headlineMetrics" :key="metric.label" class="headline-card">
            <span class="headline-label">{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>{{ metric.note }}</small>
          </article>
        </section>

        <section class="chart-grid">
          <article class="chart-panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Output split</p>
                <h2>Goals and assists</h2>
              </div>
            </div>
            <canvas ref="performanceChartRef"></canvas>
          </article>

          <article class="chart-panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Usage</p>
                <h2>Matches played</h2>
              </div>
            </div>
            <canvas ref="matchesChartRef"></canvas>
          </article>
        </section>

        <section class="insights-grid">
          <article class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Leaderboard</p>
                <h2>Top contributors</h2>
              </div>
              <span class="panel-chip">{{ rankedPlayers.length }} tracked players</span>
            </div>

            <div v-if="rankedPlayers.length" class="leaders-list">
              <div v-for="(player, index) in rankedPlayers.slice(0, 5)" :key="player.id" class="leader-row">
                <div class="leader-rank">#{{ index + 1 }}</div>
                <div class="leader-copy">
                  <strong>{{ fullName(player) }}</strong>
                  <small>{{ contributionText(player) }}</small>
                </div>
                <div class="leader-values">
                  <span>{{ player.stats.goals }} G</span>
                  <span>{{ player.stats.assists }} A</span>
                  <span>{{ player.stats.matches }} M</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-card">
              Add player stats to unlock contribution rankings.
            </div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Discipline</p>
                <h2>Card watch</h2>
              </div>
            </div>

            <div v-if="disciplinePlayers.length" class="discipline-list">
              <div v-for="player in disciplinePlayers" :key="player.id" class="discipline-row">
                <div>
                  <strong>{{ fullName(player) }}</strong>
                  <small>{{ player.stats.matches }} matches tracked</small>
                </div>
                <div class="discipline-badges">
                  <span class="badge yellow">{{ player.stats.yellow_cards }} Y</span>
                  <span class="badge red">{{ player.stats.red_cards }} R</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-card">
              No discipline issues recorded for the squad.
            </div>
          </article>
        </section>

        <section class="table-section">
          <article class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Detailed table</p>
                <h2>Full player statistics</h2>
              </div>
              <div class="panel-actions">
                <button
                  type="button"
                  class="export-btn"
                  :disabled="!rankedPlayers.length"
                  @click="exportStatisticsCsv"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  class="export-btn secondary"
                  :disabled="!rankedPlayers.length"
                  @click="exportStatisticsExcel"
                >
                  Export Excel
                </button>
                <span class="panel-chip">{{ rankedPlayers.length }} rows</span>
              </div>
            </div>

            <div v-if="rankedPlayers.length" class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Matches</th>
                    <th>Goals</th>
                    <th>Assists</th>
                    <th>Yellow</th>
                    <th>Red</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(player, index) in rankedPlayers" :key="player.id">
                    <td>{{ index + 1 }}</td>
                    <td>
                      <div class="stats-player-cell">
                        <div class="stats-player-avatar">
                          <img v-if="player.avatar" :src="player.avatar" :alt="fullName(player)" class="stats-player-image">
                          <template v-else>{{ getInitials(fullName(player)) }}</template>
                        </div>
                        <div class="stats-player-copy">
                          <strong>{{ fullName(player) }}</strong>
                          <small>{{ contributionText(player) }}</small>
                        </div>
                      </div>
                    </td>
                    <td>{{ player.stats.matches }}</td>
                    <td>{{ player.stats.goals }}</td>
                    <td>{{ player.stats.assists }}</td>
                    <td>{{ player.stats.yellow_cards }}</td>
                    <td>{{ player.stats.red_cards }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-card">
              Add player stats to unlock the table view.
            </div>
          </article>
        </section>
      </div>

      <section v-else class="access-panel">
        <h2>Coach access required</h2>
        <p>Only coaches who belong to this team can open the analytics workspace.</p>
        <router-link :to="`/team/${teamId}/players`" class="access-link">
          Open players page
        </router-link>
      </section>

      <div v-if="loading" class="loading-panel">
        <div class="loading-spinner"></div>
        <p>{{ $t('messages.loading') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Chart from 'chart.js/auto'
import { useAuthStore } from '../stores/auth'
import { canManageTeam } from '../utils/teamAccess'
import { fetchTeamBundle, fetchTeamSummary } from '../services/teamApi'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const teamId = route.params.id
const team = ref({ name: '', coach_id: null, logo: null })
const players = ref([])
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
const loading = ref(false)
const performanceChartRef = ref(null)
const matchesChartRef = ref(null)
let performanceChart = null
let matchesChart = null
let themeObserver = null

const currentUser = computed(() => authStore.user)
const isCoach = canManageTeam({
  userRef: currentUser,
  teamRef: team,
  teamIdRef: computed(() => teamId)
})

const fullName = (player) => `${player.name || ''} ${player.surname || ''}`.trim()
const getInitials = (name = '') => name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?'

const rankedPlayers = computed(() => [...players.value].sort((a, b) => {
  const goalsDiff = (b.stats?.goals || 0) - (a.stats?.goals || 0)
  if (goalsDiff !== 0) return goalsDiff
  const assistsDiff = (b.stats?.assists || 0) - (a.stats?.assists || 0)
  if (assistsDiff !== 0) return assistsDiff
  const matchesDiff = (b.stats?.matches || 0) - (a.stats?.matches || 0)
  if (matchesDiff !== 0) return matchesDiff
  return fullName(a).localeCompare(fullName(b))
}))

const disciplinePlayers = computed(() => {
  return players.value
    .filter((player) => (player.stats?.yellow_cards || 0) > 0 || (player.stats?.red_cards || 0) > 0)
    .sort((a, b) => {
      const cardScoreA = (a.stats?.red_cards || 0) * 3 + (a.stats?.yellow_cards || 0)
      const cardScoreB = (b.stats?.red_cards || 0) * 3 + (b.stats?.yellow_cards || 0)
      return cardScoreB - cardScoreA
    })
})

const topScorer = computed(() => summary.value.topScorers[0] || rankedPlayers.value[0] || null)
const topCreator = computed(() => summary.value.topAssists[0] || null)

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
    note: `${averageMatches()} average workload`
  },
  {
    label: 'Attendance',
    value: `${summary.value.avgAttendance}%`,
    note: 'Practice participation'
  }
])

const exportRows = computed(() => rankedPlayers.value.map((player, index) => ({
  rank: index + 1,
  player: fullName(player),
  email: player.email || '',
  matches: player.stats.matches,
  goals: player.stats.goals,
  assists: player.stats.assists,
  yellowCards: player.stats.yellow_cards,
  redCards: player.stats.red_cards
})))

const fetchStatistics = async () => {
  loading.value = true
  try {
    const [bundle, stats] = await Promise.all([
      fetchTeamBundle(teamId),
      fetchTeamSummary(teamId)
    ])

    team.value = bundle.team
    players.value = bundle.players
    summary.value = stats

    await nextTick()
    if (isCoach.value) {
      renderCharts()
    }
  } catch (error) {
    console.error('Error fetching team statistics:', error)
  } finally {
    loading.value = false
  }
}

const destroyCharts = () => {
  if (performanceChart) {
    performanceChart.destroy()
    performanceChart = null
  }

  if (matchesChart) {
    matchesChart.destroy()
    matchesChart = null
  }
}

const chartTheme = () => {
  const styles = getComputedStyle(document.documentElement)
  const textColor = styles.getPropertyValue('--text-color').trim() || '#1f2937'
  const borderColor = styles.getPropertyValue('--border-color').trim() || 'rgba(148, 163, 184, 0.3)'
  const accent = '#0b72e7'
  const accentSoft = '#6faeff'
  const assist = '#2456d3'

  return { textColor, borderColor, accent, accentSoft, assist }
}

const renderCharts = () => {
  if (!performanceChartRef.value || !matchesChartRef.value || !players.value.length) return

  destroyCharts()

  const topPlayers = [...rankedPlayers.value].slice(0, 6)
  const labels = topPlayers.map((player) => fullName(player))
  const { textColor, borderColor, accent, accentSoft, assist } = chartTheme()

  performanceChart = new Chart(performanceChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Goals',
          data: topPlayers.map((player) => player.stats.goals),
          backgroundColor: accent
        },
        {
          label: 'Assists',
          data: topPlayers.map((player) => player.stats.assists),
          backgroundColor: accentSoft
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: borderColor }
        },
        y: {
          ticks: { color: textColor, precision: 0 },
          grid: { color: borderColor }
        }
      }
    }
  })

  matchesChart = new Chart(matchesChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Matches',
          data: topPlayers.map((player) => player.stats.matches),
          borderColor: assist,
          backgroundColor: 'rgba(36, 86, 211, 0.16)',
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: borderColor }
        },
        y: {
          ticks: { color: textColor, precision: 0 },
          grid: { color: borderColor }
        }
      }
    }
  })
}

const perPlayer = (value) => {
  if (!summary.value.totalPlayers) return '0.0'
  return (value / summary.value.totalPlayers).toFixed(1)
}

const averageMatches = () => {
  if (!players.value.length) return '0.0'
  const totalMatches = players.value.reduce((sum, player) => sum + (player.stats?.matches || 0), 0)
  return (totalMatches / players.value.length).toFixed(1)
}

const contributionText = (player) => {
  return `${player.stats.matches} matches, ${player.stats.goals} goals, ${player.stats.assists} assists`
}

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? '')
  if (/[";\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

const escapeXmlValue = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const createFilename = (extension) => {
  const safeTeamName = (team.value?.name || 'team')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'team'

  return `${safeTeamName}-statistics.${extension}`
}

const downloadBlob = (content, mimeType, filename) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const exportStatisticsCsv = () => {
  const delimiter = ';'
  const headers = ['Rank', 'Player', 'Email', 'Matches', 'Goals', 'Assists', 'Yellow Cards', 'Red Cards']
  const lines = [
    `sep=${delimiter}`,
    headers.join(delimiter),
    ...exportRows.value.map((row) => [
      row.rank,
      row.player,
      row.email,
      row.matches,
      row.goals,
      row.assists,
      row.yellowCards,
      row.redCards
    ].map(escapeCsvValue).join(delimiter))
  ]

  downloadBlob(`\uFEFF${lines.join('\n')}`, 'text/csv;charset=utf-8;', createFilename('csv'))
}

const exportStatisticsExcel = () => {
  const rowsXml = exportRows.value.map((row) => `
    <Row>
      <Cell><Data ss:Type="Number">${row.rank}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXmlValue(row.player)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXmlValue(row.email)}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.matches}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.goals}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.assists}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.yellowCards}</Data></Cell>
      <Cell><Data ss:Type="Number">${row.redCards}</Data></Cell>
    </Row>
  `).join('')

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:html="http://www.w3.org/TR/REC-html40">
      <Worksheet ss:Name="Statistics">
        <Table>
          <Row>
            <Cell><Data ss:Type="String">Rank</Data></Cell>
            <Cell><Data ss:Type="String">Player</Data></Cell>
            <Cell><Data ss:Type="String">Email</Data></Cell>
            <Cell><Data ss:Type="String">Matches</Data></Cell>
            <Cell><Data ss:Type="String">Goals</Data></Cell>
            <Cell><Data ss:Type="String">Assists</Data></Cell>
            <Cell><Data ss:Type="String">Yellow Cards</Data></Cell>
            <Cell><Data ss:Type="String">Red Cards</Data></Cell>
          </Row>
          ${rowsXml}
        </Table>
      </Worksheet>
    </Workbook>`

  downloadBlob(`\uFEFF${workbook}`, 'application/vnd.ms-excel;charset=utf-8;', createFilename('xls'))
}

onMounted(async () => {
  await fetchStatistics()

  themeObserver = new MutationObserver(async () => {
    if (!isCoach.value) return
    await nextTick()
    renderCharts()
  })

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onBeforeUnmount(() => {
  destroyCharts()
  themeObserver?.disconnect()
})
</script>

<style scoped>
.statistics-page {
  --page-bg: var(--bg-color, var(--background-color));
  --page-surface: var(--bg-color-secondary, var(--card-bg));
  --page-border: var(--border-color);
  --page-text: var(--text-color);
  --page-muted: var(--text-color-secondary, var(--text-secondary));
  --page-accent: #0b72e7;
  --page-accent-soft: rgba(11, 114, 231, 0.14);
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 24%),
    var(--page-bg);
  color: var(--page-text);
}

html.dark-mode .statistics-page {
  --page-accent: #6fb2ff;
  --page-accent-soft: rgba(74, 144, 226, 0.2);
  background:
    radial-gradient(circle at top left, rgba(74, 144, 226, 0.2), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 18%),
    var(--page-bg);
}

.statistics-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem;
}

.statistics-hero,
.headline-card,
.chart-panel,
.panel,
.access-panel {
  background: var(--page-surface);
  border: 1px solid var(--page-border);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
}

.statistics-hero {
  display: grid;
  grid-template-columns: 1.25fr 320px;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 28px;
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 65%), var(--page-surface);
}

.hero-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.eyebrow,
.headline-label,
.summary-label,
.panel-kicker {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
  color: var(--page-muted);
}

.hero-copy h1 {
  margin: 0.35rem 0 0.65rem;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1;
}

.hero-description,
.summary-card p,
.headline-card small,
.leader-copy small,
.access-panel p,
.empty-card {
  color: var(--page-muted);
}

.hero-pills,
.hero-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hero-pill,
.nav-chip,
.panel-chip,
.leader-values span,
.badge,
.access-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.9rem;
  border-radius: 999px;
  font-weight: 700;
}

.hero-pill,
.nav-chip {
  border: 1px solid var(--page-border);
  background: var(--page-surface);
  color: var(--page-muted);
  text-decoration: none;
}

.hero-pill.accent,
.nav-chip.active,
.panel-chip,
.leader-values span,
.access-link {
  background: var(--page-accent-soft);
  color: var(--page-accent);
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-card {
  border: 1px solid var(--page-border);
  border-radius: 22px;
  padding: 1rem 1.1rem;
  background: var(--page-surface);
}

.summary-card.soft {
  background: linear-gradient(135deg, var(--page-accent-soft), transparent 70%), var(--page-surface);
}

.summary-card strong {
  display: block;
  margin: 0.35rem 0;
  font-size: 1.1rem;
}

.headline-grid,
.chart-grid,
.insights-grid,
.table-section {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.headline-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.chart-grid,
.insights-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.headline-card,
.chart-panel,
.panel,
.access-panel {
  border-radius: 24px;
  padding: 1.2rem;
}

.headline-card strong {
  display: block;
  font-size: 2rem;
  line-height: 1;
  margin: 0.3rem 0;
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
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.export-btn {
  border: none;
  border-radius: 999px;
  padding: 0.65rem 0.95rem;
  background: var(--page-accent);
  color: white;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 10px 22px rgba(11, 114, 231, 0.18);
}

.export-btn.secondary {
  background: rgba(11, 114, 231, 0.08);
  color: var(--page-accent);
  border: 1px solid rgba(11, 114, 231, 0.12);
  box-shadow: none;
}

.export-btn:hover {
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.chart-panel canvas {
  width: 100% !important;
  height: 320px !important;
}

.leaders-list,
.discipline-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.stats-table-wrap {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 0.9rem 0.8rem;
  text-align: left;
  border-bottom: 1px solid var(--page-border);
  vertical-align: middle;
}

.stats-table th {
  color: var(--page-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
}

.stats-player-cell {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 240px;
}

.stats-player-avatar {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: var(--page-accent-soft);
  color: var(--page-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
  overflow: hidden;
}

.stats-player-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.stats-player-copy {
  display: grid;
  gap: 0.2rem;
}

.stats-player-copy strong {
  display: block;
}

.stats-player-copy small {
  color: var(--page-muted);
}


.leader-row,
.discipline-row,
.empty-card {
  border: 1px solid var(--page-border);
  border-radius: 18px;
  padding: 0.95rem 1rem;
}

.leader-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
}

.leader-rank {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--page-accent-soft);
  color: var(--page-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.leader-copy strong,
.discipline-row strong {
  display: block;
}

.leader-values,
.discipline-badges {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.discipline-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.badge.yellow {
  background: rgba(234, 179, 8, 0.16);
  color: #a16207;
}

.badge.red {
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
}

html.dark-mode .badge.yellow {
  color: #fde68a;
}

html.dark-mode .badge.red {
  color: #fca5a5;
}

.access-panel {
  margin-top: 1rem;
  text-align: center;
}

.access-panel h2 {
  margin-top: 0;
}

.access-link {
  margin-top: 0.75rem;
  text-decoration: none;
}

.loading-panel {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
  color: var(--page-muted);
}

.loading-spinner {
  width: 42px;
  height: 42px;
  border: 3px solid var(--page-border);
  border-top-color: var(--page-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .statistics-hero,
  .chart-grid,
  .insights-grid {
    grid-template-columns: 1fr;
  }

  .hero-side {
    flex-direction: row;
  }

  .headline-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .statistics-shell {
    padding: 1rem;
  }

  .statistics-hero,
  .headline-card,
  .chart-panel,
  .panel,
  .access-panel {
    border-radius: 20px;
  }

  .hero-side {
    flex-direction: column;
  }

  .headline-grid {
    grid-template-columns: 1fr;
  }

  .leader-row,
  .discipline-row {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .leader-values,
  .discipline-badges {
    justify-content: flex-start;
  }

  .chart-panel canvas {
    height: 260px !important;
  }
}

@media (max-width: 540px) {
  .statistics-shell {
    padding: 0.75rem;
  }

  .statistics-hero,
  .headline-card,
  .chart-panel,
  .panel,
  .access-panel {
    padding: 1rem;
  }

  .hero-copy h1 {
    font-size: 1.85rem;
  }
}
</style>
