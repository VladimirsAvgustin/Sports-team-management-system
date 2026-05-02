<template>
  <div class="forgot-password-page">
    <main class="forgot-card">
      <header class="forgot-heading">
        <p class="forgot-kicker">{{ copy.eyebrow }}</p>
        <h1>{{ $t('password.forgot') }}</h1>
        <p>{{ copy.description }}</p>
      </header>

      <form class="forgot-form" novalidate @submit.prevent="sendResetLink">
        <label class="field-group" for="email">
          <span>{{ $t('auth.email') }}</span>
          <div class="input-shell" :class="{ invalid: emailTouched && !isEmailValid }">
            <input
              id="email"
              v-model.trim="email"
              type="email"
              autocomplete="email"
              :placeholder="copy.emailPlaceholder"
              :disabled="loading"
              required
              @blur="emailTouched = true"
            />
          </div>
        </label>

        <p v-if="emailTouched && !isEmailValid" class="field-error">
          {{ copy.invalidEmail }}
        </p>

        <div v-if="message" class="status-box success" role="status">
          {{ message }}
        </div>
        <div v-if="error" class="status-box error" role="alert">
          {{ error }}
        </div>

        <div class="form-actions">
          <button type="submit" class="primary-action" :disabled="!canSubmit">
            <span v-if="loading" class="spinner" aria-hidden="true"></span>
            {{ loading ? copy.sending : $t('password.sendReset') }}
          </button>
          <router-link to="/" class="secondary-action">
            {{ $t('auth.backToHome') }}
          </router-link>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { locale } = useI18n()

const email = ref('')
const emailTouched = ref(false)
const loading = ref(false)
const message = ref('')
const error = ref('')

const content = {
  en: {
    eyebrow: 'Password recovery',
    description: 'Enter the email connected to your TeamFlow account and we will send a password reset link.',
    emailPlaceholder: 'Enter your email',
    invalidEmail: 'Enter a valid email address.',
    sending: 'Sending...',
    successMessage: 'Password reset email has been sent. It may take up to 5 minutes to arrive.',
    notFound: 'No account was found with this email address.',
    requestError: 'Could not request a password reset. Try again in a moment.'
  },
  lv: {
    eyebrow: 'Paroles atjauno\u0161ana',
    description: 'Ievadiet e-pastu, kas piesaist\u012bts j\u016bsu TeamFlow kontam, un m\u0113s nos\u016bt\u012bsim paroles atiestat\u012b\u0161anas saiti.',
    emailPlaceholder: 'Ievadiet e-pastu',
    invalidEmail: 'Ievadiet der\u012bgu e-pasta adresi.',
    sending: 'S\u016bta...',
    successMessage: 'Paroles atiestat\u012b\u0161anas e-pasts ir nos\u016bt\u012bts. Tas var pien\u0101kt l\u012bdz 5 min\u016b\u0161u laik\u0101.',
    notFound: 'Konts ar \u0161o e-pasta adresi nav atrasts.',
    requestError: 'Neizdev\u0101s piepras\u012bt paroles atiestat\u012b\u0161anu. M\u0113\u0123iniet v\u0113lreiz p\u0113c br\u012b\u017ea.'
  }
}

const copy = computed(() => content[locale.value === 'en' ? 'en' : 'lv'])
const normalizedEmail = computed(() => email.value.trim())
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail.value))
const canSubmit = computed(() => isEmailValid.value && !loading.value)

async function sendResetLink() {
  emailTouched.value = true
  error.value = ''
  message.value = ''

  if (!isEmailValid.value) {
    error.value = copy.value.invalidEmail
    return
  }

  loading.value = true

  try {
    await axios.post('/api/auth/forgot-password', {
      email: normalizedEmail.value
    })

    message.value = copy.value.successMessage
  } catch (err) {
    error.value = err.response?.status === 404
      ? copy.value.notFound
      : copy.value.requestError
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-password-page {
  --forgot-bg: #f6f7fb;
  --forgot-card: #ffffff;
  --forgot-muted-card: #f8fafc;
  --forgot-border: #dbe3ef;
  --forgot-text: #0f172a;
  --forgot-muted: #5f6c7c;
  --forgot-blue: #0b72e7;
  --forgot-blue-strong: #0857b8;
  --forgot-green: #047857;
  --forgot-red: #b91c1c;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background: var(--forgot-bg);
  color: var(--forgot-text);
}

.forgot-card {
  width: min(100%, 480px);
  padding: 30px;
  border: 1px solid var(--forgot-border);
  border-radius: 8px;
  background: var(--forgot-card);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.forgot-heading {
  margin-bottom: 24px;
}

.forgot-kicker {
  margin: 0 0 8px;
  color: var(--forgot-blue);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--forgot-text);
  font-size: clamp(2rem, 5vw, 2.8rem);
  line-height: 1.1;
}

.forgot-heading p {
  margin: 10px 0 0;
  color: var(--forgot-muted);
  line-height: 1.65;
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--forgot-text);
  font-size: 0.86rem;
  font-weight: 800;
}

.field-group > span {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.input-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  border: 1px solid var(--forgot-border);
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.input-shell:focus-within {
  border-color: var(--forgot-blue);
  box-shadow: 0 0 0 4px rgba(11, 114, 231, 0.12);
}

.input-shell.invalid {
  border-color: rgba(185, 28, 28, 0.62);
  box-shadow: 0 0 0 4px rgba(185, 28, 28, 0.08);
}

input {
  width: 100%;
  min-height: 50px;
  min-width: 0;
  border: 0;
  padding: 0 14px;
  background: transparent;
  color: var(--forgot-text);
  font: inherit;
  font-weight: 700;
}

input:focus {
  outline: none;
}

input::placeholder {
  color: #94a3b8;
  font-weight: 600;
}

.field-error {
  margin: -6px 0 0;
  color: var(--forgot-red);
  font-size: 0.9rem;
  font-weight: 700;
}

.status-box {
  padding: 12px 14px;
  border-radius: 8px;
  font-weight: 700;
  line-height: 1.5;
}

.status-box.success {
  border: 1px solid rgba(5, 150, 105, 0.22);
  background: rgba(5, 150, 105, 0.1);
  color: var(--forgot-green);
}

.status-box.error {
  border: 1px solid rgba(185, 28, 28, 0.18);
  background: rgba(185, 28, 28, 0.08);
  color: var(--forgot-red);
}

.form-actions {
  display: grid;
  gap: 10px;
  margin-top: 4px;
}

.primary-action,
.secondary-action {
  min-height: 50px;
  border-radius: 8px;
  font-weight: 800;
  text-align: center;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  background: var(--forgot-blue);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(11, 114, 231, 0.22);
}

.primary-action:hover:not(:disabled) {
  background: var(--forgot-blue-strong);
}

.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  box-shadow: none;
}

.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--forgot-border);
  color: var(--forgot-blue-strong);
  text-decoration: none;
}

.secondary-action:hover {
  background: var(--forgot-muted-card);
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.42);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

html.dark-mode .forgot-password-page,
body.dark-mode .forgot-password-page {
  --forgot-bg: #0f172a;
  --forgot-card: #111827;
  --forgot-muted-card: #1f2937;
  --forgot-border: rgba(148, 163, 184, 0.24);
  --forgot-text: #f8fafc;
  --forgot-muted: #cbd5e1;
  --forgot-blue: #60a5fa;
  --forgot-blue-strong: #93c5fd;
  --forgot-green: #86efac;
  --forgot-red: #fca5a5;
}

html.dark-mode .forgot-password-page .input-shell,
body.dark-mode .forgot-password-page .input-shell {
  background: rgba(15, 23, 42, 0.72);
}

html.dark-mode .forgot-password-page input,
body.dark-mode .forgot-password-page input {
  color: var(--forgot-text);
}

html.dark-mode .forgot-password-page .status-box.success,
body.dark-mode .forgot-password-page .status-box.success {
  background: rgba(74, 222, 128, 0.12);
  color: #86efac;
}

html.dark-mode .forgot-password-page .status-box.error,
body.dark-mode .forgot-password-page .status-box.error {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
}

@media (max-width: 520px) {
  .forgot-password-page {
    padding: 18px 14px;
  }

  .forgot-card {
    padding: 22px;
  }
}
</style>
