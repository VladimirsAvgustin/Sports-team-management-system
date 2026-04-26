<template>
  <div class="register-page">
    <div class="register-card">
      <h1>{{ $t('nav.register') }}</h1>
      <form @submit.prevent="registerUser">
        <div class="form-group">
          <label for="name">{{ $t('auth.name') }}:</label>
          <input v-model="form.name" type="text" id="name" required />
        </div>

        <div class="form-group">
          <label for="surname">{{ $t('auth.surname') }}:</label>
          <input v-model="form.surname" type="text" id="surname" required />
        </div>

        <div class="form-group">
          <label for="email">{{ $t('auth.email') }}:</label>
          <input v-model="form.email" type="email" id="email" required />
        </div>

        <div class="form-group">
          <label for="password">{{ $t('auth.password') }}:</label>
          <input v-model="form.password" type="password" id="password" required />
        </div>

        <div class="form-group">
          <label for="TeamCode">{{ $t('team.teamCode') }} ({{ copy.optional }}):</label>
          <input v-model="form.teamCode" type="text" id="teamCode" :disabled="isCoachRole" />
          <small v-if="isCoachRole" class="field-hint">
            {{ copy.coachHint }}
          </small>
        </div>

        <div class="form-group">
          <label for="role">{{ $t('auth.role') }}:</label>
          <select v-model="form.role" id="role" required>
            <option disabled value="">{{ copy.chooseRole }}</option>
            <option value="Player">{{ copy.player }}</option>
            <option value="Coach">{{ copy.coach }}</option>
          </select>
        </div>

        <button type="submit">{{ $t('nav.register') }}</button>
      </form>

      <div v-if="message" class="status-message" :class="{'success': success, 'error': !success}">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { locale } = useI18n()

const content = {
  en: {
    optional: 'optional',
    coachHint: 'Coaches request team access after registration.',
    chooseRole: 'Choose a role',
    player: 'Player',
    coach: 'Coach',
    registerError: 'Registration error'
  },
  lv: {
    optional: 'nav obligāts',
    coachHint: 'Treneri pēc reģistrācijas pieprasa piekļuvi komandai.',
    chooseRole: 'Izvēlieties lomu',
    player: 'Spēlētājs',
    coach: 'Treneris',
    registerError: 'Kļūda reģistrācijas laikā'
  }
}

const copy = computed(() => content[locale.value === 'en' ? 'en' : 'lv'])

const form = ref({
  name: '',
  surname: '',
  email: '',
  password: '',
  role: '',
  teamCode: ''
})

const message = ref('')
const success = ref(false)
const isCoachRole = computed(() => String(form.value.role || '').toLowerCase() === 'coach')

watch(isCoachRole, (nextValue) => {
  if (nextValue) {
    form.value.teamCode = ''
  }
})

const registerUser = async () => {
  try {
    const response = await axios.post('/api/auth/register', form.value)
    message.value = response.data.message
    success.value = true
    form.value = { name: '', surname: '', email: '', password: '', role: '', teamCode: '' }
    setTimeout(() => {
      router.push('/') 
    }, 1000)
  } catch (error) {
    message.value = error.response?.data?.error || copy.value.registerError
    success.value = false
  }
}
</script>

<style scoped>
.register-page {
  --register-bg: linear-gradient(180deg, #f4efe4 0%, #f9f8f4 44%, #ffffff 100%);
  --register-surface: rgba(255, 255, 255, 0.9);
  --register-input: rgba(255, 255, 255, 0.92);
  --register-border: rgba(15, 23, 42, 0.08);
  --register-text: #0f172a;
  --register-muted: #5f6c7c;
  --register-accent: #0b72e7;
  --register-accent-strong: #084da8;
  --register-accent-soft: rgba(11, 114, 231, 0.16);
  --register-warm: #eb8b2d;
  --register-warm-soft: rgba(235, 139, 45, 0.18);
  --register-shadow: 0 24px 60px rgba(15, 23, 42, 0.1);
  --register-button-shadow: 0 14px 28px rgba(11, 114, 231, 0.22);
  --register-button-shadow-hover: 0 18px 34px rgba(11, 114, 231, 0.28);
  --register-focus-ring: rgba(11, 114, 231, 0.12);
  --register-disabled-bg: rgba(148, 163, 184, 0.12);
  --register-success-text: #047857;
  --register-success-bg: rgba(16, 185, 129, 0.12);
  --register-success-border: rgba(16, 185, 129, 0.18);
  --register-error-text: #b91c1c;
  --register-error-bg: rgba(239, 68, 68, 0.1);
  --register-error-border: rgba(239, 68, 68, 0.16);
  --register-visual-shade: rgba(15, 23, 42, 0.12);
  --register-visual-glow: rgba(255, 255, 255, 0.04);
  --register-visual-opacity: 0.28;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 56px 20px;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 18%, var(--register-warm-soft), transparent 34%),
    radial-gradient(circle at 86% 12%, var(--register-accent-soft), transparent 32%),
    var(--register-bg);
  color: var(--register-text);
}

.register-page::before,
.register-page::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
}

.register-page::before {
  right: max(-180px, -12vw);
  bottom: max(-180px, -14vw);
  width: min(520px, 46vw);
  aspect-ratio: 1;
  background:
    linear-gradient(135deg, var(--register-visual-shade), var(--register-visual-glow)),
    url('@/assets/registration.png') center / cover;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
  opacity: var(--register-visual-opacity);
}

.register-page::after {
  left: -120px;
  top: 18%;
  width: 220px;
  height: 220px;
  background: var(--register-accent-soft);
  filter: blur(8px);
  opacity: 0.7;
}

.register-card {
  position: relative;
  z-index: 1;
  width: min(100%, 460px);
  padding: 32px;
  overflow: hidden;
  border: 1px solid var(--register-border);
  border-radius: 28px;
  background: linear-gradient(180deg, var(--register-surface), rgba(255, 255, 255, 0.82));
  box-shadow: var(--register-shadow);
  backdrop-filter: blur(18px);
}

.register-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: linear-gradient(90deg, var(--register-accent), var(--register-warm));
}

h1 {
  margin: 0 0 24px;
  color: var(--register-text);
  font-size: clamp(2rem, 5vw, 2.6rem);
  line-height: 1;
  text-align: center;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--register-muted);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

input,
select {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid var(--register-border);
  border-radius: 16px;
  background: var(--register-input);
  color: var(--register-text);
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--register-accent);
  box-shadow: 0 0 0 3px var(--register-focus-ring);
}

input:disabled {
  cursor: not-allowed;
  background: var(--register-disabled-bg);
  color: var(--register-muted);
}

button {
  width: 100%;
  margin-top: 0.25rem;
  padding: 0.95rem 1rem;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--register-accent), var(--register-accent-strong));
  color: white;
  cursor: pointer;
  font-weight: 800;
  box-shadow: var(--register-button-shadow);
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: var(--register-button-shadow-hover);
}

.status-message {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: none;
  font-weight: 700;
  text-align: center;
}

.success {
  color: var(--register-success-text);
  background: var(--register-success-bg);
  border: 1px solid var(--register-success-border);
}

.error {
  color: var(--register-error-text);
  background: var(--register-error-bg);
  border: 1px solid var(--register-error-border);
}

.field-hint {
  display: block;
  margin-top: 0.5rem;
  color: var(--register-muted);
  font-size: 0.9rem;
}

:global(html.dark-mode) .register-page,
:global(body.dark-mode) .register-page {
  --register-bg: linear-gradient(180deg, #0f172a 0%, #111827 45%, #182235 100%);
  --register-surface: rgba(15, 23, 42, 0.88);
  --register-input: rgba(31, 41, 55, 0.86);
  --register-border: rgba(148, 163, 184, 0.18);
  --register-text: #e5edf8;
  --register-muted: #9fb0c8;
  --register-accent: #60a5fa;
  --register-accent-strong: #3b82f6;
  --register-accent-soft: rgba(96, 165, 250, 0.18);
  --register-warm: #f6ad55;
  --register-warm-soft: rgba(246, 173, 85, 0.14);
  --register-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
  --register-button-shadow: 0 16px 34px rgba(37, 99, 235, 0.28);
  --register-button-shadow-hover: 0 20px 42px rgba(37, 99, 235, 0.34);
  --register-focus-ring: rgba(96, 165, 250, 0.18);
  --register-disabled-bg: rgba(148, 163, 184, 0.1);
  --register-success-text: #6ee7b7;
  --register-success-bg: rgba(16, 185, 129, 0.14);
  --register-success-border: rgba(110, 231, 183, 0.18);
  --register-error-text: #fca5a5;
  --register-error-bg: rgba(239, 68, 68, 0.14);
  --register-error-border: rgba(252, 165, 165, 0.18);
  --register-visual-shade: rgba(0, 0, 0, 0.34);
  --register-visual-glow: rgba(96, 165, 250, 0.14);
  --register-visual-opacity: 0.2;
}

:global(html.dark-mode) .register-card,
:global(body.dark-mode) .register-card {
  background: linear-gradient(180deg, var(--register-surface), rgba(15, 23, 42, 0.8));
}

:global(html.dark-mode) input:focus,
:global(html.dark-mode) select:focus,
:global(body.dark-mode) input:focus,
:global(body.dark-mode) select:focus {
  box-shadow: 0 0 0 3px var(--register-focus-ring);
}

:global(html.dark-mode) input::placeholder,
:global(body.dark-mode) input::placeholder {
  color: #94a3b8;
}

:global(html.dark-mode) select option,
:global(body.dark-mode) select option {
  background: #111827;
  color: #e5edf8;
}

@media (max-width: 640px) {
  .register-page {
    align-items: flex-start;
    padding: 24px 14px 40px;
  }

  .register-card {
    padding: 26px 18px 22px;
    border-radius: 24px;
  }

  .register-page::before {
    right: -180px;
    bottom: -150px;
    width: 360px;
    opacity: 0.16;
  }

  .register-page::after {
    left: -150px;
    top: 8%;
  }
}
</style>

<style>
html.dark-mode .register-page,
body.dark-mode .register-page {
  --register-bg: linear-gradient(180deg, #0f172a 0%, #111827 45%, #182235 100%);
  --register-surface: rgba(15, 23, 42, 0.9);
  --register-input: rgba(31, 41, 55, 0.9);
  --register-border: rgba(148, 163, 184, 0.2);
  --register-text: #e5edf8;
  --register-muted: #9fb0c8;
  --register-accent: #60a5fa;
  --register-accent-strong: #3b82f6;
  --register-accent-soft: rgba(96, 165, 250, 0.18);
  --register-warm: #f6ad55;
  --register-warm-soft: rgba(246, 173, 85, 0.14);
  --register-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
  --register-button-shadow: 0 16px 34px rgba(37, 99, 235, 0.28);
  --register-button-shadow-hover: 0 20px 42px rgba(37, 99, 235, 0.34);
  --register-focus-ring: rgba(96, 165, 250, 0.18);
  --register-disabled-bg: rgba(148, 163, 184, 0.1);
  --register-success-text: #6ee7b7;
  --register-success-bg: rgba(16, 185, 129, 0.14);
  --register-success-border: rgba(110, 231, 183, 0.18);
  --register-error-text: #fca5a5;
  --register-error-bg: rgba(239, 68, 68, 0.14);
  --register-error-border: rgba(252, 165, 165, 0.18);
  --register-visual-shade: rgba(0, 0, 0, 0.34);
  --register-visual-glow: rgba(96, 165, 250, 0.14);
  --register-visual-opacity: 0.18;
}

html.dark-mode .register-page .register-card,
body.dark-mode .register-page .register-card {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(17, 24, 39, 0.86));
}

html.dark-mode .register-page input,
html.dark-mode .register-page select,
body.dark-mode .register-page input,
body.dark-mode .register-page select {
  background: var(--register-input);
  color: var(--register-text);
  border-color: var(--register-border);
}

html.dark-mode .register-page input:focus,
html.dark-mode .register-page select:focus,
body.dark-mode .register-page input:focus,
body.dark-mode .register-page select:focus {
  border-color: var(--register-accent);
  box-shadow: 0 0 0 3px var(--register-focus-ring);
}

html.dark-mode .register-page input:disabled,
body.dark-mode .register-page input:disabled {
  background: var(--register-disabled-bg);
  color: var(--register-muted);
}

html.dark-mode .register-page input::placeholder,
body.dark-mode .register-page input::placeholder {
  color: #94a3b8;
}

html.dark-mode .register-page select option,
body.dark-mode .register-page select option {
  background: #111827;
  color: #e5edf8;
}
</style>
