<template>
  <div class="reset-password-page">
    <main class="reset-shell">
      <section class="reset-card">
        <div class="reset-heading">
          <p class="reset-kicker">{{ copy.eyebrow }}</p>
          <h1>{{ $t('password.reset') }}</h1>
          <p>{{ copy.description }}</p>
        </div>

        <div v-if="!hasResetToken" class="status-box error" role="alert">
          {{ copy.missingToken }}
        </div>

        <form v-else class="reset-form" novalidate @submit.prevent="resetPassword">
          <label class="field-group" for="password">
            <span>{{ $t('password.newPassword') }}</span>
            <div class="input-shell" :class="{ invalid: password && !passwordLongEnough }">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :minlength="MIN_PASSWORD_LENGTH"
                required
                :placeholder="copy.passwordPlaceholder"
                :disabled="loading || isComplete"
                :aria-describedby="password && !passwordLongEnough ? 'password-hint password-error' : 'password-hint'"
                :aria-invalid="password && !passwordLongEnough ? 'true' : 'false'"
              />
              <button
                type="button"
                class="visibility-btn"
                :disabled="loading || isComplete"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? copy.hide : copy.show }}
              </button>
            </div>
            <small id="password-hint" class="field-hint">
              {{ copy.passwordHint }}
            </small>
          </label>

          <p v-if="password && !passwordLongEnough" id="password-error" class="field-error">
            {{ copy.minLength }}
          </p>

          <label class="field-group" for="confirm">
            <span>{{ $t('auth.confirmPassword') }}</span>
            <div class="input-shell" :class="{ invalid: confirmPassword && !passwordsMatch }">
              <input
                id="confirm"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :minlength="MIN_PASSWORD_LENGTH"
                required
                :placeholder="copy.confirmPlaceholder"
                :disabled="loading || isComplete"
                :aria-invalid="confirmPassword && !passwordsMatch ? 'true' : 'false'"
              />
              <button
                type="button"
                class="visibility-btn"
                :disabled="loading || isComplete"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                {{ showConfirmPassword ? copy.hide : copy.show }}
              </button>
            </div>
          </label>

          <p v-if="confirmPassword && !passwordsMatch" class="field-error">
            {{ copy.passwordsMismatch }}
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
              {{ loading ? copy.saving : $t('password.savePassword') }}
            </button>
            <router-link class="secondary-action" :to="isComplete ? '/' : '/forgot-password'">
              {{ isComplete ? copy.backHome : copy.requestNewLink }}
            </router-link>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import axios from 'axios'

const { t, locale } = useI18n()
const route = useRoute()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isComplete = ref(false)
const MIN_PASSWORD_LENGTH = 8

const content = {
  en: {
    eyebrow: 'Account security',
    description: 'Create a new password for your TeamFlow account. The reset link can be used only once.',
    passwordPlaceholder: 'Enter new password',
    confirmPlaceholder: 'Repeat new password',
    show: 'Show',
    hide: 'Hide',
    saving: 'Saving...',
    missingToken: 'The reset link is missing or invalid. Request a new password reset link.',
    invalidToken: 'The reset link is missing or invalid.',
    passwordsMismatch: 'Passwords do not match.',
    passwordHint: `Minimum ${MIN_PASSWORD_LENGTH} characters`,
    minLength: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    requestNewLink: 'Request new link',
    backHome: 'Back to home',
    fallbackSuccess: 'Password reset successfully.',
    fallbackError: 'Could not reset password.'
  },
  lv: {
    eyebrow: 'Konta dro\u0161\u012bba',
    description: 'Izveidojiet jaunu TeamFlow konta paroli. Atiestat\u012b\u0161anas saiti var izmantot tikai vienu reizi.',
    passwordPlaceholder: 'Ievadiet jauno paroli',
    confirmPlaceholder: 'Atk\u0101rtojiet jauno paroli',
    show: 'R\u0101d\u012bt',
    hide: 'Sl\u0113pt',
    saving: 'Saglab\u0101...',
    missingToken: 'Atiestat\u012b\u0161anas saite nav nor\u0101d\u012bta vai nav der\u012bga. Pieprasiet jaunu saiti.',
    invalidToken: 'Atiestat\u012b\u0161anas saite nav nor\u0101d\u012bta vai nav der\u012bga.',
    passwordsMismatch: 'Paroles nesakr\u012bt.',
    passwordHint: `Vismaz ${MIN_PASSWORD_LENGTH} rakstz\u012bmes`,
    minLength: `Parolei j\u0101b\u016bt vismaz ${MIN_PASSWORD_LENGTH} rakstz\u012bmes garai.`,
    requestNewLink: 'Piepras\u012bt jaunu saiti',
    backHome: 'Atpaka\u013c uz s\u0101kumu',
    fallbackSuccess: 'Parole veiksm\u012bgi atiestat\u012bta.',
    fallbackError: 'Neizdev\u0101s atiestat\u012bt paroli.'
  }
}

const copy = computed(() => content[locale.value === 'en' ? 'en' : 'lv'])
const resetToken = computed(() => {
  const token = route.query.token
  return typeof token === 'string' ? token.trim() : ''
})
const hasResetToken = computed(() => Boolean(resetToken.value))
const passwordLongEnough = computed(() => password.value.length >= MIN_PASSWORD_LENGTH)
const passwordsMatch = computed(() => password.value === confirmPassword.value)
const canSubmit = computed(() => (
  hasResetToken.value &&
  !loading.value &&
  !isComplete.value &&
  passwordLongEnough.value &&
  passwordsMatch.value &&
  Boolean(confirmPassword.value)
))

async function resetPassword() {
  error.value = ''
  message.value = ''

  if (!hasResetToken.value) {
    error.value = copy.value.invalidToken
    return
  }

  if (!passwordLongEnough.value) {
    error.value = copy.value.minLength
    return
  }

  if (!passwordsMatch.value) {
    error.value = copy.value.passwordsMismatch
    return
  }

  loading.value = true

  try {
    const response = await axios.post('/api/auth/reset-password', {
      token: resetToken.value,
      password: password.value
    })

    message.value = response.data.message || t('messages.passwordReset') || copy.value.fallbackSuccess
    password.value = ''
    confirmPassword.value = ''
    showPassword.value = false
    showConfirmPassword.value = false
    isComplete.value = true
  } catch (err) {
    error.value = err.response?.data?.error || copy.value.fallbackError
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-password-page {
  --reset-bg: #f6f7fb;
  --reset-card: #ffffff;
  --reset-card-muted: #f8fafc;
  --reset-border: #dbe3ef;
  --reset-text: #0f172a;
  --reset-muted: #5f6c7c;
  --reset-blue: #0b72e7;
  --reset-blue-strong: #0857b8;
  --reset-green: #059669;
  --reset-red: #b91c1c;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background: var(--reset-bg);
  color: var(--reset-text);
}

.reset-shell {
  width: min(100%, 480px);
}

.reset-card {
  border: 1px solid var(--reset-border);
  border-radius: 8px;
  background: var(--reset-card);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
  padding: 30px;
}

.reset-heading {
  margin-bottom: 24px;
}

.reset-kicker {
  margin: 0 0 8px;
  color: var(--reset-blue);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--reset-text);
  line-height: 1.1;
}

h1 {
  font-size: clamp(2rem, 5vw, 2.8rem);
}

.reset-heading p {
  margin: 10px 0 0;
  color: var(--reset-muted);
  line-height: 1.65;
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--reset-text);
  font-size: 0.86rem;
  font-weight: 800;
}

.field-group > span {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.input-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid var(--reset-border);
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.input-shell:focus-within {
  border-color: var(--reset-blue);
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
  color: var(--reset-text);
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

.visibility-btn {
  min-height: 36px;
  margin-right: 6px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: var(--reset-card-muted);
  color: var(--reset-blue-strong);
  cursor: pointer;
  font-weight: 800;
}

.visibility-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.field-hint {
  color: var(--reset-muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.field-error {
  margin: -6px 0 0;
  color: var(--reset-red);
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
  color: #047857;
}

.status-box.error {
  border: 1px solid rgba(185, 28, 28, 0.18);
  background: rgba(185, 28, 28, 0.08);
  color: var(--reset-red);
}

.form-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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
  background: var(--reset-blue);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(11, 114, 231, 0.22);
}

.primary-action:hover:not(:disabled) {
  background: var(--reset-blue-strong);
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
  border: 1px solid var(--reset-border);
  color: var(--reset-blue-strong);
  text-decoration: none;
}

.secondary-action:hover {
  background: var(--reset-card-muted);
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

html.dark-mode .reset-password-page,
body.dark-mode .reset-password-page {
  --reset-bg: #0f172a;
  --reset-card: #111827;
  --reset-card-muted: #1f2937;
  --reset-border: rgba(148, 163, 184, 0.24);
  --reset-text: #f8fafc;
  --reset-muted: #cbd5e1;
  --reset-blue: #60a5fa;
  --reset-blue-strong: #93c5fd;
  --reset-green: #86efac;
  --reset-red: #fca5a5;
}

html.dark-mode .reset-password-page .input-shell,
body.dark-mode .reset-password-page .input-shell {
  background: rgba(15, 23, 42, 0.72);
}

html.dark-mode .reset-password-page input,
body.dark-mode .reset-password-page input {
  color: var(--reset-text);
}

html.dark-mode .reset-password-page .status-box.success,
body.dark-mode .reset-password-page .status-box.success {
  background: rgba(74, 222, 128, 0.12);
  color: #86efac;
}

html.dark-mode .reset-password-page .status-box.error,
body.dark-mode .reset-password-page .status-box.error {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
}

@media (max-width: 520px) {
  .reset-password-page {
    padding: 18px 14px;
  }

  .reset-card {
    padding: 22px;
  }
}
</style>
