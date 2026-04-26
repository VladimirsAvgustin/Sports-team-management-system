<template>
  <div class="admin-page">
    <div class="admin-shell">
      <section class="admin-hero">
        <div class="admin-hero-copy">
          <p class="admin-eyebrow">Pārvaldības centrs</p>
          <h1>Administratora darba vide</h1>
          <div class="admin-pill-row">
            <span class="admin-pill">{{ users.length }} lietotāji</span>
            <span class="admin-pill">{{ teams.length }} komandas</span>
            <span class="admin-pill">{{ assignedUsersCount }} piesaistīti komandai</span>
            <span class="admin-pill accent">{{ totalDirtyCount }} nesaglabātas izmaiņas</span>
          </div>
        </div>

        <div class="admin-side-card">
          <span class="side-label">Pieslēdzies kā</span>
          <strong>{{ adminName }}</strong>
          <p>Šo darba vidi var atvērt tikai lietotāji ar <span>administratora</span> lomu.</p>
        </div>
      </section>

      <section class="summary-grid">
        <article v-for="card in summaryCards" :key="card.label" class="summary-card">
          <span class="summary-label">{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.note }}</small>
        </article>
      </section>

      <section class="workspace-card">
        <div class="workspace-head">
          <div>
            <p class="workspace-kicker">Pārvaldības tabulas</p>
            <h2>{{ activeSectionTitle }}</h2>
          </div>

          <div class="workspace-actions">
            <div class="view-switch" role="tablist" aria-label="Administratora tabulas">
              <button
                type="button"
                :class="{ active: activeSection === 'users' }"
                @click="activeSection = 'users'"
              >
                Lietotāji
              </button>
              <button
                type="button"
                :class="{ active: activeSection === 'teams' }"
                @click="activeSection = 'teams'"
              >
                Komandas
              </button>
            </div>

            <button
              type="button"
              class="toolbar-btn"
              :disabled="activeRefreshPending"
              @click="refreshActiveSection"
            >
              {{ activeRefreshPending ? 'Atjauno...' : 'Atjaunot' }}
            </button>
          </div>
        </div>

        <div v-if="activeSection === 'users'" class="toolbar-grid">
          <label class="field-control field-control--wide">
            <span>{{ $t('admin.name') }} / {{ $t('admin.email') }}</span>
            <input
              v-model="userSearchQuery"
              type="text"
              :placeholder="$t('admin.searchPlaceholder')"
            />
          </label>

          <label class="field-control">
            <span>{{ $t('admin.role') }}</span>
            <select v-model="selectedRole">
              <option value="">{{ $t('admin.allRoles') }}</option>
              <option value="Admin">{{ $t('admin.admin') }}</option>
              <option value="Coach">{{ $t('admin.coach') }}</option>
              <option value="Player">{{ $t('admin.player') }}</option>
            </select>
          </label>
        </div>

        <div v-else class="toolbar-grid toolbar-grid--single">
          <label class="field-control field-control--wide">
            <span>Komandas nosaukums / komandas kods</span>
            <input
              v-model="teamSearchQuery"
              type="text"
              placeholder="Meklēt pēc komandas nosaukuma, koda vai trenera..."
            />
          </label>
        </div>

        <div
          v-if="activeSection === 'users' && userStatus.message"
          class="status-banner"
          :class="userStatus.type"
        >
          {{ userStatus.message }}
        </div>

        <div
          v-if="activeSection === 'teams' && teamStatus.message"
          class="status-banner"
          :class="teamStatus.type"
        >
          {{ teamStatus.message }}
        </div>

        <template v-if="activeSection === 'users'">
          <div v-if="usersLoading" class="state-card">
            <div class="state-spinner"></div>
            <p>{{ $t('admin.loading') }}</p>
          </div>

          <div v-else-if="!filteredUsers.length" class="state-card empty">
            <strong>{{ $t('admin.noUsers') }}</strong>
            <p>Mēģiniet citu meklēšanu vai atiestatiet lomas filtru.</p>
          </div>

          <div v-else class="table-shell">
            <table class="admin-table admin-table--users">
              <thead>
                <tr>
                  <th>Lietotājs</th>
                  <th>{{ $t('admin.name') }}</th>
                  <th>{{ $t('admin.surname') }}</th>
                  <th>{{ $t('admin.email') }}</th>
                  <th>{{ $t('admin.role') }}</th>
                  <th>{{ $t('admin.teamId') }}</th>
                  <th>Statuss</th>
                  <th class="actions-col">Darbības</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="user in paginatedUsers"
                  :key="user.id"
                  :class="{ dirty: hasChanges(user) }"
                >
                  <td class="entity-cell">
                    <div class="entity-chip">
                      <div class="table-avatar">
                        {{ getInitials(user) }}
                      </div>

                      <div class="entity-copy">
                        <strong>{{ displayName(user) }}</strong>
                        <span>#{{ user.id }}</span>
                      </div>
                    </div>

                    <div v-if="isCurrentUser(user)" class="table-badges">
                      <span class="self-badge">Pašreizējais administrators</span>
                    </div>
                  </td>

                  <td>
                    <input
                      v-model="user.name"
                      class="table-input"
                      type="text"
                      autocomplete="off"
                    />
                  </td>

                  <td>
                    <input
                      v-model="user.surname"
                      class="table-input"
                      type="text"
                      autocomplete="off"
                    />
                  </td>

                  <td>
                    <input
                      v-model="user.email"
                      class="table-input"
                      type="email"
                      autocomplete="off"
                    />
                  </td>

                  <td>
                    <select
                      v-model="user.role"
                      class="table-select"
                      :disabled="savingUserId === user.id || deletingUserId === user.id || isCurrentUser(user)"
                    >
                      <option value="Admin">{{ $t('admin.admin') }}</option>
                      <option value="Coach">{{ $t('admin.coach') }}</option>
                      <option value="Player">{{ $t('admin.player') }}</option>
                    </select>
                  </td>

                  <td>
                    <input
                      v-model="user.team_id"
                      class="table-input"
                      type="number"
                      min="1"
                      inputmode="numeric"
                      placeholder="Nav obligāts"
                    />
                  </td>

                  <td>
                    <span class="status-chip" :class="hasChanges(user) ? 'dirty' : 'clean'">
                      {{ hasChanges(user) ? 'Jāsaglabā' : 'Atjaunināts' }}
                    </span>
                  </td>

                  <td class="actions-col">
                    <div class="table-actions">
                      <button
                        type="button"
                        class="action-btn secondary small"
                        :disabled="savingUserId === user.id || deletingUserId === user.id || !hasChanges(user)"
                        @click="resetUser(user)"
                      >
                        Atiestatīt
                      </button>

                      <button
                        type="button"
                        class="action-btn primary small"
                        :disabled="savingUserId === user.id || deletingUserId === user.id || !hasChanges(user)"
                        @click="updateUser(user)"
                      >
                        {{ savingUserId === user.id ? 'Saglabā...' : 'Saglabāt' }}
                      </button>

                      <button
                        type="button"
                        class="action-btn danger small"
                        :disabled="savingUserId === user.id || deletingUserId === user.id || isCurrentUser(user)"
                        @click="deleteUser(user)"
                      >
                        {{ deletingUserId === user.id ? 'Dzēš...' : $t('admin.delete') }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="filteredUsers.length" class="pagination-bar">
            <div class="pagination-summary">
              <strong>{{ userPageStart }}-{{ userPageEnd }}</strong>
              <span>no {{ filteredUsers.length }} lietotājiem</span>
              <small>{{ USERS_PER_PAGE }} lapā</small>
            </div>

            <div
              v-if="userPageCount > 1"
              class="pagination-controls"
              role="navigation"
              aria-label="Lietotāju lapošana"
            >
              <button
                type="button"
                class="pagination-btn nav"
                :disabled="userPage === 1"
                @click="setUserPage(userPage - 1)"
              >
                Iepriekšējā
              </button>

              <button
                v-for="page in visibleUserPages"
                :key="page"
                type="button"
                class="pagination-btn page"
                :class="{ active: page === userPage }"
                @click="setUserPage(page)"
              >
                {{ page }}
              </button>

              <button
                type="button"
                class="pagination-btn nav"
                :disabled="userPage === userPageCount"
                @click="setUserPage(userPage + 1)"
              >
                Nākamā
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="teamsLoading" class="state-card">
            <div class="state-spinner"></div>
            <p>{{ $t('admin.loading') }}</p>
          </div>

          <div v-else-if="!filteredTeams.length" class="state-card empty">
            <strong>Komandas nav atrastas</strong>
            <p>Mēģiniet citu meklēšanas vaicājumu vai atjaunojiet komandu sarakstu.</p>
          </div>

          <div v-else class="table-shell">
            <table class="admin-table admin-table--teams">
              <thead>
                <tr>
                  <th>Komanda</th>
                  <th>Komandas nosaukums</th>
                  <th>Komandas kods</th>
                  <th>Galvenais treneris</th>
                  <th>Dalībnieki</th>
                  <th>Spēlētāji</th>
                  <th>Statuss</th>
                  <th class="actions-col">Darbības</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="team in filteredTeams"
                  :key="team.id"
                  :class="{ dirty: hasTeamChanges(team) }"
                >
                  <td class="entity-cell">
                    <div class="entity-chip">
                      <div class="table-avatar team">
                        {{ getTeamInitials(team) }}
                      </div>

                      <div class="entity-copy">
                        <strong>{{ teamDisplayName(team) }}</strong>
                        <span>#{{ team.id }}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <input
                      v-model="team.name"
                      class="table-input"
                      type="text"
                      autocomplete="off"
                    />
                  </td>

                  <td>
                    <input
                      v-model="team.team_code"
                      class="table-input"
                      type="text"
                      autocomplete="off"
                      spellcheck="false"
                      placeholder="Obligāts"
                    />
                  </td>

                  <td>
                    <span class="static-text">{{ teamCoachLabel(team) }}</span>
                  </td>

                  <td>
                    <span class="metric-badge">{{ team.member_count }}</span>
                  </td>

                  <td>
                    <span class="metric-badge">{{ team.player_count }}</span>
                  </td>

                  <td>
                    <span class="status-chip" :class="hasTeamChanges(team) ? 'dirty' : 'clean'">
                      {{ hasTeamChanges(team) ? 'Jāsaglabā' : 'Atjaunināts' }}
                    </span>
                  </td>

                  <td class="actions-col">
                    <div class="table-actions">
                      <button
                        type="button"
                        class="action-btn secondary small"
                        :disabled="savingTeamId === team.id || !hasTeamChanges(team)"
                        @click="resetTeam(team)"
                      >
                        Atiestatīt
                      </button>

                      <button
                        type="button"
                        class="action-btn primary small"
                        :disabled="savingTeamId === team.id || !hasTeamChanges(team)"
                        @click="updateTeam(team)"
                      >
                        {{ savingTeamId === team.id ? 'Saglabā...' : 'Saglabāt' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import '@/assets/styles/admin-page.css'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const USERS_PER_PAGE = 10

const activeSection = ref('users')

const users = ref([])
const savedUsers = ref({})
const usersLoading = ref(true)
const usersRefreshing = ref(false)
const userSearchQuery = ref('')
const selectedRole = ref('')
const userPage = ref(1)
const savingUserId = ref(null)
const deletingUserId = ref(null)
const userStatus = ref({
  type: '',
  message: ''
})

const teams = ref([])
const savedTeams = ref({})
const teamsLoading = ref(true)
const teamsRefreshing = ref(false)
const teamSearchQuery = ref('')
const savingTeamId = ref(null)
const teamStatus = ref({
  type: '',
  message: ''
})

const isAdmin = computed(() => (authStore.user?.role || '').toLowerCase() === 'admin')

const adminName = computed(() => {
  const fullName = `${authStore.user?.name || ''} ${authStore.user?.surname || ''}`.trim()
  return fullName || authStore.user?.email || 'Administrators'
})

const activeSectionTitle = computed(() => {
  return activeSection.value === 'users' ? 'Lietotāju tabula' : 'Komandu tabula'
})

const activeRefreshPending = computed(() => {
  return activeSection.value === 'users' ? usersRefreshing.value : teamsRefreshing.value
})

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${authStore.token}`
  },
  withCredentials: true
})

const normalizeTeamId = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null
}

const normalizeTeamCode = (value) => {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

const mapUser = (user) => ({
  id: user.id,
  name: user.name || '',
  surname: user.surname || '',
  email: user.email || '',
  role: user.role || 'Player',
  team_id: user.team_id ?? ''
})

const comparableUser = (user) => ({
  name: (user.name || '').trim(),
  surname: (user.surname || '').trim(),
  email: (user.email || '').trim().toLowerCase(),
  role: user.role || 'Player',
  team_id: normalizeTeamId(user.team_id)
})

const captureUsers = (list) => {
  const mappedUsers = (list || []).map(mapUser)
  users.value = mappedUsers
  savedUsers.value = Object.fromEntries(
    mappedUsers.map((user) => [user.id, { ...user }])
  )
}

const buildUserPayload = (user) => ({
  name: (user.name || '').trim(),
  surname: (user.surname || '').trim(),
  email: (user.email || '').trim(),
  role: user.role || 'Player',
  team_id: normalizeTeamId(user.team_id)
})

const mapTeam = (team) => ({
  id: team.id,
  name: team.name || '',
  team_code: normalizeTeamCode(team.team_code),
  coach_id: normalizeTeamId(team.coach_id),
  coach_name: team.coach_name || '',
  member_count: Number(team.member_count) || 0,
  player_count: Number(team.player_count) || 0
})

const comparableTeam = (team) => ({
  name: (team.name || '').trim(),
  team_code: normalizeTeamCode(team.team_code)
})

const captureTeams = (list) => {
  const mappedTeams = (list || []).map(mapTeam)
  teams.value = mappedTeams
  savedTeams.value = Object.fromEntries(
    mappedTeams.map((team) => [team.id, { ...team }])
  )
}

const buildTeamPayload = (team) => ({
  name: (team.name || '').trim(),
  team_code: normalizeTeamCode(team.team_code)
})

const fetchUsers = async ({ silent = false } = {}) => {
  if (silent) {
    usersRefreshing.value = true
  } else {
    usersLoading.value = true
  }

  userStatus.value = { type: '', message: '' }

  try {
    const response = await axios.get('/api/admin/users', getAuthConfig())
    captureUsers(response.data.users)
  } catch (error) {
    console.error('Error loading users:', error)
    userStatus.value = {
      type: 'error',
      message: 'Pašlaik neizdevās ielādēt lietotājus.'
    }
  } finally {
    usersLoading.value = false
    usersRefreshing.value = false
  }
}

const fetchTeams = async ({ silent = false } = {}) => {
  if (silent) {
    teamsRefreshing.value = true
  } else {
    teamsLoading.value = true
  }

  teamStatus.value = { type: '', message: '' }

  try {
    const response = await axios.get('/api/admin/teams', getAuthConfig())
    captureTeams(response.data.teams)
  } catch (error) {
    console.error('Error loading teams:', error)
    teamStatus.value = {
      type: 'error',
      message: 'Pašlaik neizdevās ielādēt komandas.'
    }
  } finally {
    teamsLoading.value = false
    teamsRefreshing.value = false
  }
}

const refreshActiveSection = async () => {
  if (activeSection.value === 'users') {
    await fetchUsers({ silent: true })
    return
  }

  await fetchTeams({ silent: true })
}

const filteredUsers = computed(() => {
  const query = userSearchQuery.value.trim().toLowerCase()
  const role = selectedRole.value.trim().toLowerCase()

  return users.value.filter((user) => {
    const haystack = [
      user.id,
      user.name,
      user.surname,
      user.email,
      user.role,
      normalizeTeamId(user.team_id) || ''
    ]
      .join(' ')
      .toLowerCase()

    const matchesSearch = !query || haystack.includes(query)
    const matchesRole = !role || (user.role || '').toLowerCase() === role

    return matchesSearch && matchesRole
  })
})

const userPageCount = computed(() => {
  return Math.max(1, Math.ceil(filteredUsers.value.length / USERS_PER_PAGE))
})

const paginatedUsers = computed(() => {
  const start = (userPage.value - 1) * USERS_PER_PAGE
  return filteredUsers.value.slice(start, start + USERS_PER_PAGE)
})

const userPageStart = computed(() => {
  if (!filteredUsers.value.length) {
    return 0
  }

  return (userPage.value - 1) * USERS_PER_PAGE + 1
})

const userPageEnd = computed(() => {
  if (!filteredUsers.value.length) {
    return 0
  }

  return Math.min(userPage.value * USERS_PER_PAGE, filteredUsers.value.length)
})

const visibleUserPages = computed(() => {
  const total = userPageCount.value
  const current = userPage.value

  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  start = Math.max(1, end - 4)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const setUserPage = (page) => {
  userPage.value = Math.min(Math.max(1, page), userPageCount.value)
}

const filteredTeams = computed(() => {
  const query = teamSearchQuery.value.trim().toLowerCase()

  return teams.value.filter((team) => {
    const haystack = [
      team.id,
      team.name,
      team.team_code,
      team.coach_name,
      team.member_count,
      team.player_count
    ]
      .join(' ')
      .toLowerCase()

    return !query || haystack.includes(query)
  })
})

const summaryCards = computed(() => [
  {
    label: 'Kopā konti',
    value: users.value.length,
    note: 'Visi reģistrētie lietotāji'
  },
  {
    label: 'Komandas',
    value: teams.value.length,
    note: 'Reģistrētie klubi un komandas'
  },
  {
    label: 'Administratori',
    value: users.value.filter((user) => (user.role || '').toLowerCase() === 'admin').length,
    note: 'Lietotāji ar pilnu piekļuvi'
  },
  {
    label: 'Treneri',
    value: users.value.filter((user) => (user.role || '').toLowerCase() === 'coach').length,
    note: 'Komandu vadītāji un personāls'
  },
  {
    label: 'Spēlētāji',
    value: users.value.filter((user) => (user.role || '').toLowerCase() === 'player').length,
    note: 'Sastāva dalībnieki'
  }
])

const assignedUsersCount = computed(() => {
  return users.value.filter((user) => normalizeTeamId(user.team_id)).length
})

const dirtyUsersCount = computed(() => {
  return users.value.filter((user) => hasChanges(user)).length
})

const dirtyTeamsCount = computed(() => {
  return teams.value.filter((team) => hasTeamChanges(team)).length
})

const totalDirtyCount = computed(() => dirtyUsersCount.value + dirtyTeamsCount.value)

const displayName = (user) => {
  const fullName = `${user.name || ''} ${user.surname || ''}`.trim()
  return fullName || user.email || 'Lietotājs bez vārda'
}

const getInitials = (user) => {
  const source = displayName(user)
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return initials || '?'
}

const isCurrentUser = (user) => Number(user.id) === Number(authStore.user?.id)

const hasChanges = (user) => {
  const savedUser = savedUsers.value[user.id]
  if (!savedUser) return false

  return JSON.stringify(comparableUser(user)) !== JSON.stringify(comparableUser(savedUser))
}

const resetUser = (user) => {
  const savedUser = savedUsers.value[user.id]
  if (!savedUser) return

  Object.assign(user, { ...savedUser })
  userStatus.value = {
    type: '',
    message: ''
  }
}

const syncCurrentAdmin = (payload) => {
  if (!authStore.user || Number(authStore.user.id) !== Number(payload.id)) {
    return
  }

  authStore.user = {
    ...authStore.user,
    name: payload.name,
    surname: payload.surname,
    email: payload.email,
    team_id: payload.team_id
  }
  localStorage.setItem('user', JSON.stringify(authStore.user))
}

const updateUser = async (user) => {
  const payload = buildUserPayload(user)

  if (!payload.email) {
    userStatus.value = {
      type: 'error',
      message: 'Pirms saglabāšanas jānorāda e-pasts.'
    }
    return
  }

  savingUserId.value = user.id
  userStatus.value = { type: '', message: '' }

  try {
    await axios.put(`/api/admin/users/${user.id}`, payload, getAuthConfig())

    const normalizedUser = mapUser({
      ...user,
      ...payload,
      team_id: payload.team_id ?? ''
    })

    Object.assign(user, normalizedUser)
    savedUsers.value = {
      ...savedUsers.value,
      [user.id]: { ...normalizedUser }
    }

    syncCurrentAdmin({ ...payload, id: user.id })
    await fetchTeams({ silent: true })

    userStatus.value = {
      type: 'success',
      message: `${displayName(user)} veiksmīgi atjaunināts.`
    }
  } catch (error) {
    console.error('Error updating user:', error)
    userStatus.value = {
      type: 'error',
      message: error.response?.data?.error || t('admin.errorUpdating')
    }
  } finally {
    savingUserId.value = null
  }
}

const deleteUser = async (user) => {
  if (isCurrentUser(user)) {
    return
  }

  if (!window.confirm(`Dzēst lietotāju ${displayName(user)}?`)) {
    return
  }

  deletingUserId.value = user.id
  userStatus.value = { type: '', message: '' }

  try {
    await axios.delete(`/api/admin/users/${user.id}`, getAuthConfig())

    users.value = users.value.filter((item) => item.id !== user.id)

    const nextSavedUsers = { ...savedUsers.value }
    delete nextSavedUsers[user.id]
    savedUsers.value = nextSavedUsers

    await fetchTeams({ silent: true })

    userStatus.value = {
      type: 'success',
      message: `${displayName(user)} veiksmīgi dzēsts.`
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    userStatus.value = {
      type: 'error',
      message: error.response?.data?.error || t('admin.errorDeleting')
    }
  } finally {
    deletingUserId.value = null
  }
}

const teamDisplayName = (team) => {
  return (team.name || '').trim() || 'Komanda bez nosaukuma'
}

const getTeamInitials = (team) => {
  const initials = teamDisplayName(team)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return initials || 'TM'
}

const teamCoachLabel = (team) => {
  return team.coach_name || 'Treneris nav piesaistīts'
}

const hasTeamChanges = (team) => {
  const savedTeam = savedTeams.value[team.id]
  if (!savedTeam) return false

  return JSON.stringify(comparableTeam(team)) !== JSON.stringify(comparableTeam(savedTeam))
}

const resetTeam = (team) => {
  const savedTeam = savedTeams.value[team.id]
  if (!savedTeam) return

  Object.assign(team, { ...savedTeam })
  teamStatus.value = {
    type: '',
    message: ''
  }
}

const updateTeam = async (team) => {
  const payload = buildTeamPayload(team)

  if (!payload.name) {
    teamStatus.value = {
      type: 'error',
      message: 'Pirms saglabāšanas jānorāda komandas nosaukums.'
    }
    return
  }

  if (!payload.team_code) {
    teamStatus.value = {
      type: 'error',
      message: 'Pirms saglabāšanas jānorāda komandas kods.'
    }
    return
  }

  savingTeamId.value = team.id
  teamStatus.value = { type: '', message: '' }

  try {
    const response = await axios.put(`/api/admin/teams/${team.id}`, payload, getAuthConfig())
    const normalizedTeam = mapTeam(response.data.team || { ...team, ...payload })

    Object.assign(team, normalizedTeam)
    savedTeams.value = {
      ...savedTeams.value,
      [team.id]: { ...normalizedTeam }
    }

    teamStatus.value = {
      type: 'success',
      message: `${teamDisplayName(team)} veiksmīgi atjaunināta.`
    }
  } catch (error) {
    console.error('Error updating team:', error)
    teamStatus.value = {
      type: 'error',
      message: error.response?.data?.error || 'Pašlaik neizdevās atjaunināt komandu.'
    }
  } finally {
    savingTeamId.value = null
  }
}

watch([userSearchQuery, selectedRole], () => {
  userPage.value = 1
})

watch(activeSection, (section) => {
  if (section === 'users') {
    userPage.value = 1
  }
})

watch(userPageCount, (pageCount) => {
  if (userPage.value > pageCount) {
    userPage.value = pageCount
  }
})

onMounted(async () => {
  if (authStore.token && !authStore.user) {
    await authStore.fetchUser()
  }

  if (!isAdmin.value) {
    router.replace('/')
    return
  }

  await Promise.allSettled([fetchUsers(), fetchTeams()])
})
</script>
