<template>
  <div class="reset-page">
    <div class="card">
      <h1>{{ $t('password.reset') }}</h1>
      <p class="subtitle">{{ $t('password.resetDescription') }}</p>

      <form @submit.prevent="resetPassword">
        <label for="password">{{ $t('password.newPassword') }}</label>
        <input id="password" v-model="password" type="password" minlength="6" required />

        <label for="confirm">{{ $t('auth.confirmPassword') }}</label>
        <input id="confirm" v-model="confirmPassword" type="password" minlength="6" required />

        <button type="submit" :disabled="loading">
          {{ loading ? 'Saving...' : $t('password.savePassword') }}
        </button>
      </form>

      <p v-if="message" class="message">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <router-link to="/" class="back-link">{{ $t('auth.backToHome') }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import axios from 'axios'

const { t } = useI18n()
const route = useRoute()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

async function resetPassword() {
  const token = route.query.token

  error.value = ''
  message.value = ''

  if (!token || typeof token !== 'string') {
    error.value = 'Reset token is missing or invalid'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    const response = await axios.post('http://localhost:3000/api/auth/reset-password', {
      token,
      password: password.value
    })

    message.value = response.data.message || t('messages.passwordReset')
    password.value = ''
    confirmPassword.value = ''
  } catch (err) {
    error.value = err.response?.data?.error || t('messages.error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--background-color);
  color: var(--text-color);
}

.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.subtitle {
  color: #4b5563;
  margin-bottom: 16px;
}

h1,
label {
  color: #111827;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #9ca3af;
  border-radius: 8px;
  margin-bottom: 14px;
  background: #ffffff;
  color: #111827;
}

input:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 1px;
}

button {
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button:hover {
  background: #1f2937;
  transform: none;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

.message {
  color: #047857;
  margin-top: 12px;
}

.error {
  color: #b91c1c;
  margin-top: 12px;
}

.back-link {
  display: inline-block;
  margin-top: 16px;
  color: #1d4ed8;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

:global(.dark-mode) .card {
  background: #111827;
  color: #f9fafb;
  border: none;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}

:global(.dark-mode) .subtitle {
  color: #d1d5db;
}

:global(.dark-mode) h1,
:global(.dark-mode) label {
  color: #f9fafb;
}

:global(.dark-mode) input {
  background: #1f2937;
  color: #f9fafb;
  border: none;
  box-shadow: inset 0 0 0 1px rgba(100, 116, 139, 0.05);
}

:global(.dark-mode) input:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.15);
}

:global(.dark-mode) input::placeholder {
  color: #9ca3af;
}

:global(.dark-mode) button {
  background: #2563eb;
}

:global(.dark-mode) button:hover {
  background: #1d4ed8;
  transform: none;
}

:global(.dark-mode) .back-link {
  color: #93c5fd;
}
</style>
