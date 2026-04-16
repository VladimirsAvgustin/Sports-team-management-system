<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { removeUserAvatar, uploadUserAvatar } from '@/services/teamApi'

const { t } = useI18n()
const auth = useAuthStore()

const loading = ref(true)
const team = ref(null)
const showEmail = ref(false)
const showTeamCode = ref(false)
const passwordLoading = ref(false)
const passwordMessage = ref('')
const passwordError = ref('')
const avatarLoading = ref(false)
const avatarMessage = ref('')
const avatarError = ref('')
const avatarInput = ref(null)

const user = computed(() => auth.user)

const fullName = computed(() => {
  if (!user.value) return ''
  return `${user.value.name || ''} ${user.value.surname || ''}`.trim()
})

const initials = computed(() => {
  if (!fullName.value) return '?'
  return fullName.value
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const roleVariant = computed(() => {
  return user.value?.role === 'Coach' ? 'coach' : 'player'
})

const maskedEmail = computed(() => {
  const email = user.value?.email
  if (!email || !email.includes('@')) return 'Hidden'

  if (showEmail.value) return email

  const [name, domain] = email.split('@')
  const safeName = `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 4))}`
  return `${safeName}@${domain}`
})

const maskedTeamCode = computed(() => {
  const code = team.value?.team_code
  if (!code) return 'No team code'

  if (showTeamCode.value) return code

  return `${code.slice(0, 1)}${'*'.repeat(Math.max(code.length - 2, 4))}${code.slice(-1)}`
})

const loadProfile = async () => {
  loading.value = true

  try {
    if (auth.token) {
      await auth.fetchUser()
    }

    const response = await fetch('/api/auth/my-team', {
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    if (response.ok) {
      const data = await response.json()
      team.value = data.team || data
    } else {
      team.value = null
    }
  } catch (error) {
    console.error('Error loading profile:', error)
    team.value = null
  } finally {
    loading.value = false
  }
}

const sendPasswordReset = async () => {
  passwordLoading.value = true
  passwordMessage.value = ''
  passwordError.value = ''

  try {
    const response = await axios.post('/api/auth/forgot-password', {
      email: user.value?.email
    })

    passwordMessage.value = response.data.message || 'Password reset link sent.'
  } catch (error) {
    passwordError.value = error.response?.data?.error || 'Failed to send reset email.'
  } finally {
    passwordLoading.value = false
  }
}

const syncUserAvatar = (avatar) => {
  auth.user = {
    ...(auth.user || {}),
    avatar: avatar || null
  }
  localStorage.setItem('user', JSON.stringify(auth.user))
}

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''

  if (!file) return

  avatarMessage.value = ''
  avatarError.value = ''

  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Choose an image file.'
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = 'Image must be smaller than 2 MB.'
    return
  }

  avatarLoading.value = true

  try {
    const avatar = await uploadUserAvatar(file)
    syncUserAvatar(avatar)
    avatarMessage.value = 'Avatar updated successfully.'
  } catch (error) {
    console.error('Error uploading avatar:', error)
    avatarError.value = error.response?.data?.error || 'Failed to update avatar.'
  } finally {
    avatarLoading.value = false
  }
}

const deleteAvatar = async () => {
  avatarMessage.value = ''
  avatarError.value = ''
  avatarLoading.value = true

  try {
    await removeUserAvatar()
    syncUserAvatar(null)
    avatarMessage.value = 'Avatar removed successfully.'
  } catch (error) {
    console.error('Error deleting avatar:', error)
    avatarError.value = error.response?.data?.error || 'Failed to remove avatar.'
  } finally {
    avatarLoading.value = false
  }
}

const handleLogout = () => {
  auth.logout()
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-page">
    <div v-if="loading" class="profile-loading">
      <div class="profile-spinner"></div>
      <p>{{ $t('profile.loadingProfile') }}</p>
    </div>

    <div v-else class="profile-layout">
      <section class="profile-hero">
        <div class="profile-identity">
          <div class="profile-avatar" :class="`profile-avatar--${roleVariant}`">
            <img v-if="user?.avatar" :src="user.avatar" :alt="fullName || 'Profile avatar'" class="profile-avatar-image">
            <template v-else>{{ initials }}</template>
          </div>

          <div class="profile-copy">
            <span class="profile-role" :class="`profile-role--${roleVariant}`">
              {{ user?.role || 'Member' }}
            </span>
            <h1>{{ fullName || t('profile.profile') }}</h1>
            <p>{{ team?.name || t('profile.noTeamYet') }}</p>
            <div class="profile-avatar-tools">
              <button type="button" class="profile-btn profile-btn--ghost" :disabled="avatarLoading" @click="triggerAvatarUpload">
                {{ avatarLoading ? 'Uploading...' : 'Change avatar' }}
              </button>
              <button
                v-if="user?.avatar"
                type="button"
                class="profile-btn profile-btn--ghost danger"
                :disabled="avatarLoading"
                @click="deleteAvatar"
              >
                Remove avatar
              </button>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="profile-hidden-input"
              @change="handleAvatarUpload"
            >
          </div>
        </div>

        <button type="button" class="profile-btn profile-btn--logout" @click="handleLogout">
          {{ $t('profile.logout') }}
        </button>
      </section>

      <p v-if="avatarMessage" class="profile-status profile-status--success">
        {{ avatarMessage }}
      </p>
      <p v-if="avatarError" class="profile-status profile-status--error">
        {{ avatarError }}
      </p>

      <section class="profile-secure">
        <div class="profile-secure-head">
          <p class="profile-kicker">Secure info</p>
          <h2>Hidden user data</h2>
        </div>

        <div class="profile-secure-list">
          <article class="profile-secure-row">
            <div class="profile-row-copy">
              <span class="profile-row-label">Email</span>
              <strong>{{ maskedEmail }}</strong>
            </div>
            <button type="button" class="profile-btn profile-btn--ghost" @click="showEmail = !showEmail">
              {{ showEmail ? 'Hide' : 'Show' }}
            </button>
          </article>

          <article class="profile-secure-row">
            <div class="profile-row-copy">
              <span class="profile-row-label">Password</span>
              <strong>********</strong>
              <small>Password cannot be viewed</small>
            </div>
            <button
              type="button"
              class="profile-btn profile-btn--primary"
              :disabled="passwordLoading || !user?.email"
              @click="sendPasswordReset"
            >
              {{ passwordLoading ? 'Sending...' : 'Change password' }}
            </button>
          </article>

          <article class="profile-secure-row">
            <div class="profile-row-copy">
              <span class="profile-row-label">Team code</span>
              <strong>{{ maskedTeamCode }}</strong>
            </div>
            <button
              type="button"
              class="profile-btn profile-btn--ghost"
              :disabled="!team?.team_code"
              @click="showTeamCode = !showTeamCode"
            >
              {{ showTeamCode ? 'Hide' : 'Show' }}
            </button>
          </article>
        </div>

        <p v-if="passwordMessage" class="profile-status profile-status--success">
          {{ passwordMessage }}
        </p>
        <p v-if="passwordError" class="profile-status profile-status--error">
          {{ passwordError }}
        </p>
      </section>
    </div>
  </div>
</template>

<style>
.profile-page {
  --profile-surface: var(--card-bg);
  --profile-border: var(--border-color);
  --profile-text: var(--text-color);
  --profile-muted: var(--text-secondary);
  --profile-blue: #0b72e7;
  --profile-blue-strong: #0857b8;
  min-height: calc(100vh - 40px);
  background:
    radial-gradient(circle at top left, rgba(11, 114, 231, 0.12), transparent 30%),
    var(--background-color);
  color: var(--profile-text);
}

.dark-mode .profile-page {
  --profile-blue: #69b3ff;
  --profile-blue-strong: #2e7fe0;
  background:
    radial-gradient(circle at top left, rgba(105, 179, 255, 0.18), transparent 34%),
    var(--background-color);
}

.profile-layout {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  gap: 18px;
}

.profile-loading {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--profile-muted);
}

.profile-spinner {
  width: 42px;
  height: 42px;
  border: 3px solid rgba(11, 114, 231, 0.16);
  border-top-color: var(--profile-blue);
  border-radius: 50%;
  animation: profile-spin 0.85s linear infinite;
}

@keyframes profile-spin {
  to {
    transform: rotate(360deg);
  }
}

.profile-hero,
.profile-secure {
  background: var(--profile-surface);
  border: 1px solid var(--profile-border);
  border-radius: 28px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.profile-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(11, 114, 231, 0.14), transparent 72%), var(--profile-surface);
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.profile-avatar {
  width: 86px;
  height: 86px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  font-size: 1.9rem;
  font-weight: 800;
  box-shadow: 0 14px 30px rgba(11, 114, 231, 0.2);
}

.profile-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}

.profile-avatar--coach,
.profile-role--coach {
  background: linear-gradient(135deg, #0b72e7, #0857b8);
}

.profile-avatar--player,
.profile-role--player {
  background: linear-gradient(135deg, #18a0fb, #0b72e7);
}

.profile-copy {
  min-width: 0;
}

.profile-copy h1 {
  margin: 10px 0 4px;
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  line-height: 1.05;
}

.profile-copy p {
  margin: 0;
  color: var(--profile-muted);
  font-size: 1rem;
}

.profile-avatar-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.profile-role {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.profile-secure {
  padding: 24px;
}

.profile-secure-head h2 {
  margin: 6px 0 0;
  font-size: 1.6rem;
}

.profile-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
  color: var(--profile-muted);
}

.profile-secure-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.profile-secure-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(11, 114, 231, 0.05);
  border: 1px solid rgba(11, 114, 231, 0.08);
}

.dark-mode .profile-secure-row {
  background: rgba(105, 179, 255, 0.08);
  border-color: rgba(105, 179, 255, 0.12);
}

.profile-row-copy {
  display: grid;
  gap: 3px;
}

.profile-row-label {
  font-size: 0.8rem;
  color: var(--profile-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.profile-row-copy strong {
  font-size: 1.02rem;
  color: var(--profile-text);
}

.profile-row-copy small {
  color: var(--profile-muted);
  font-size: 0.86rem;
}

.profile-page .profile-btn {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  outline: none;
  border-radius: 16px;
  padding: 12px 18px;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.profile-page .profile-btn:hover {
  transform: translateY(-1px);
}

.profile-page .profile-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
}

.profile-btn--primary {
  color: white;
  background: linear-gradient(135deg, var(--profile-blue), var(--profile-blue-strong));
  box-shadow: 0 14px 28px rgba(11, 114, 231, 0.24);
}

.profile-btn--ghost {
  color: var(--profile-blue-strong);
  background: rgba(11, 114, 231, 0.08);
  border: 1px solid rgba(11, 114, 231, 0.16);
}

.dark-mode .profile-btn--ghost {
  color: #dbeeff;
  background: rgba(105, 179, 255, 0.14);
  border-color: rgba(105, 179, 255, 0.18);
}

.profile-btn--ghost.danger {
  color: #b63449;
  background: rgba(182, 52, 73, 0.08);
  border-color: rgba(182, 52, 73, 0.18);
}

.profile-btn--logout {
  color: #b63449;
  background: rgba(182, 52, 73, 0.08);
  border: 1px solid rgba(182, 52, 73, 0.18);
}

.profile-status {
  margin: 14px 0 0;
  padding: 14px 16px;
  border-radius: 16px;
  font-weight: 600;
}

.profile-status--success {
  color: #157347;
  background: rgba(21, 115, 71, 0.12);
}

.profile-status--error {
  color: #c53939;
  background: rgba(197, 57, 57, 0.12);
}

.profile-hidden-input {
  display: none;
}

@media (max-width: 720px) {
  .profile-layout {
    padding: 16px;
  }

  .profile-hero,
  .profile-secure-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-identity {
    width: 100%;
  }

  .profile-page .profile-btn {
    width: 100%;
  }
}
</style>
