<template>
  <div class="forgot-page">
    <div class="card">
      <h1>{{ $t('password.forgot') }}</h1>
      <p class="subtitle">{{ $t('password.forgotDescription') }}</p>

      <form @submit.prevent="sendResetLink">
        <label for="email">{{ $t('auth.email') }}</label>
        <input id="email" v-model="email" type="email" :placeholder="$t('auth.enterEmail')" required />

        <button type="submit" :disabled="loading">
          {{ loading ? 'Sending...' : $t('password.sendReset') }}
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
import axios from 'axios'

const email = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

async function sendResetLink() {
  loading.value = true
  error.value = ''
  message.value = ''

  try {
    const response = await axios.post('http://localhost:3000/api/auth/forgot-password', {
      email: email.value
    })
    message.value = response.data.message || 'If the account exists, a reset link has been sent to email.'
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to request password reset'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-page {
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
