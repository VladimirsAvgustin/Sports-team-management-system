<template>
  <div class="team-container">
    <!-- Hero Section (Minimal) -->
    <div class="team-hero-minimal">
      <div class="hero-minimal-content">
        <img v-if="team.logo" :src="team.logo" :alt="team.name" class="logo-image-small" />
        <div class="team-info">
          <h1 class="team-name">{{ team.name }}</h1>
          <p class="team-meta">{{ $t('teamPage.teamSettings') }}</p>
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

    <!-- Iestatījumu saturs -->
    <div v-if="isCoach" class="settings-content">
      <div class="settings-section">
        <h2>{{ $t('teamPage.teamSettings') }}</h2>

        <!-- Logo Management -->
        <div class="settings-group">
          <h3>{{ $t('teamPage.changeLogo') }}</h3>
          <p class="description">{{ $t('teamPage.changeLogo') }} - {{ $t('messages.selectImage') }}</p>
          
          <div class="logo-management">
            <div class="logo-display">
              <img v-if="team.logo" :src="team.logo" :alt="team.name" class="current-logo" />
              <div v-else class="logo-placeholder">
                <div class="logo-initials">{{ getTeamInitials(team.name) }}</div>
              </div>
            </div>

            <div class="logo-controls">
              <button @click="triggerLogoUpload" class="btn btn-primary">
                {{ $t('teamPage.changeLogo') }}
              </button>
              <button v-if="team.logo" @click="deleteLogo" class="btn btn-danger">
                {{ $t('teamPage.removeLogo') }}
              </button>
            </div>
          </div>

          <input 
            type="file" 
            ref="logoInput" 
            @change="handleLogoUpload" 
            accept="image/*" 
            style="display: none"
          />

          <p v-if="uploadingLogo" class="status loading">
            {{ $t('messages.loading') }}
          </p>
          <p v-if="logoError" class="status error">
            {{ logoError }}
          </p>
        </div>

        <!-- Team Info -->
        <div class="settings-group">
          <h3>{{ $t('team.teamName') }}</h3>
          <div class="info-item">
            <label>{{ $t('team.teamName') }}:</label>
            <p>{{ team.name }}</p>
          </div>
          <div class="info-item">
            <label>{{ $t('teamPage.teamCode') }}:</label>
            <p class="code-display">{{ team.team_code }}</p>
          </div>
        </div>

        <!-- Coach Tools -->
        <div class="settings-group danger-zone">
          <h3>Trenera rīki</h3>
          <p class="description">
            Šeit var atjaunināt logotipu. Komandas dzēšana vai nodošana šajā lapā vēl nav pieejama.
          </p>
          <router-link :to="`/team/${teamId}/overview`" class="btn btn-secondary">
            Atgriezties pārskatā
          </router-link>
        </div>
      </div>
    </div>

    <div v-else class="settings-content">
      <div class="settings-section access-card">
        <h2>Nepieciešama trenera piekļuve</h2>
        <p class="description">
          Komandas iestatījumi ir pieejami tikai šīs komandas aktīvajam trenerim.
        </p>
        <router-link :to="`/team/${teamId}/overview`" class="btn btn-secondary">
          Atgriezties pārskatā
        </router-link>
      </div>
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
import { canManageTeam } from '../utils/teamAccess'
import { fetchTeamBundle, removeTeamLogo, uploadTeamLogo } from '../services/teamApi'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const teamId = route.params.id
const team = ref({ name: '', coach_id: null, team_code: '', logo: null })
const logoInput = ref(null)
const uploadingLogo = ref(false)
const logoError = ref('')
const toastMessage = ref('')
const toastType = ref('')

const currentUser = computed(() => authStore.user)
const isCoach = canManageTeam({
  userRef: currentUser,
  teamRef: team,
  teamIdRef: computed(() => teamId)
})

const getTeamInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

const fetchTeamData = async () => {
  try {
    const response = await fetchTeamBundle(teamId)
    team.value = response.team
  } catch (error) {
    console.error('Error fetching team:', error)
    showToast(t('messages.error'), 'error')
  }
}

const triggerLogoUpload = () => logoInput.value?.click()

const handleLogoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  logoError.value = ''

  if (file.size > 2 * 1024 * 1024) {
    logoError.value = t('messages.imageSizeTooLarge')
    return
  }

  uploadingLogo.value = true
  try {
    team.value.logo = await uploadTeamLogo(teamId, file)
    showToast(t('teamPage.logoUpdated'), 'success')
  } catch (error) {
    console.error('Error uploading logo:', error)
    logoError.value = t('messages.uploadError')
    showToast(t('messages.uploadError'), 'error')
  } finally {
    uploadingLogo.value = false
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

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  setTimeout(() => toastMessage.value = '', 3000)
}

onMounted(() => {
  fetchTeamData()
})
</script>

<style scoped>
@import url('../assets/styles/team-shared.css');

.team-hero-minimal {
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.05), transparent);
  border-bottom: 1px solid var(--border-color);
}

.hero-minimal-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.logo-image-small {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
}

.team-info {
  flex: 1;
}

.team-info .team-name {
  margin: 0;
  font-size: 1.5rem;
}

.team-meta {
  margin: 0.25rem 0 0 0;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

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

.settings-content {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 2rem;
}

.settings-section {
  background: var(--bg-color-secondary);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid var(--border-color);
}

.settings-section h2 {
  margin-top: 0;
  margin-bottom: 2rem;
  color: var(--text-color);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 1rem;
}

.settings-group {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
}

.settings-group:last-child {
  border-bottom: none;
}

.settings-group h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1.1rem;
}

.description {
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.logo-management {
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
}

.logo-display {
  flex: 0 0 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.current-logo {
  max-width: 200px;
  max-height: 200px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.logo-placeholder {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.05));
  border: 2px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-initials {
  font-size: 3rem;
  color: var(--primary-color);
  font-weight: bold;
}

.logo-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-width: 200px;
}

.btn {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-danger {
  background: #ff4757;
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: rgba(var(--primary-rgb), 0.12);
  color: var(--primary-color);
}

.btn-secondary:hover {
  background: rgba(var(--primary-rgb), 0.18);
  transform: translateY(-2px);
}

.info-item {
  background: rgba(var(--primary-rgb), 0.05);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 3px solid var(--primary-color);
}

.info-item label {
  display: block;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.info-item p {
  margin: 0;
  color: var(--text-color);
  font-size: 1.1rem;
  font-weight: 500;
}

.code-display {
  font-family: 'Courier New', monospace;
  background: var(--bg-color);
  padding: 0.5rem;
  border-radius: 4px;
  letter-spacing: 1px;
}

.danger-zone {
  background: rgba(255, 71, 87, 0.05);
  border: 1px solid rgba(255, 71, 87, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 71, 87, 0.2);
}

.status {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.status.loading {
  background: rgba(var(--primary-rgb), 0.1);
  color: var(--primary-color);
}

.status.error {
  background: rgba(255, 71, 87, 0.1);
  color: #ff4757;
}

.access-card {
  text-align: center;
}

.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
}

.toast.error {
  background: #ff4757;
}

@keyframes slideIn {
  from { transform: translateX(400px); }
  to { transform: translateX(0); }
}

@media (max-width: 768px) {
  .settings-content {
    padding: 0 1rem;
  }

  .settings-section {
    padding: 1.5rem;
  }

  .logo-management {
    flex-direction: column;
    gap: 1rem;
  }

  .logo-display {
    flex: 1 0 auto;
  }

  .logo-controls {
    width: 100%;
  }
}
</style>
