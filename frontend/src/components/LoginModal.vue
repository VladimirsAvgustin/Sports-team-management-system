<!-- frontend/src/components/LoginModal.vue -->
<template>
  <div class="login-modal" :class="{ dark: effectiveDarkMode }" @click.self="closeModal">
    <div class="login-card" role="dialog" aria-modal="true" :aria-label="$t('buttons.login')">
      <button type="button" class="close-btn" :aria-label="$t('buttons.close')" @click="closeModal">
        &times;
      </button>

      <div class="login-header">
        <span class="login-kicker">TeamFlow</span>
        <h2>{{ $t('buttons.login') }}</h2>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label class="field-group" for="email">
          <span>{{ $t('auth.email') }}</span>
          <input
            v-model="email"
            type="email"
            id="email"
            autocomplete="email"
            :placeholder="$t('auth.enterEmail')"
            required
          />
        </label>

        <label class="field-group" for="password">
          <span>{{ $t('auth.password') }}</span>
          <input
            v-model="password"
            type="password"
            id="password"
            autocomplete="current-password"
            :placeholder="$t('auth.enterPassword')"
            required
          />
        </label>

        <div class="form-row">
          <router-link to="/forgot-password" class="forgot-link" @click="closeModal">
            {{ $t('auth.forgotPassword') }}
          </router-link>
        </div>

        <button type="submit" class="login-submit">{{ $t('buttons.login') }}</button>
        
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  isDarkMode: {
    type: Boolean,
    default: null
  }
})

let themeObserver = null
const detectedDarkMode = ref(false)
const readDocumentDarkMode = () => {
  if (typeof document === 'undefined') {
    return false
  }

  return document.documentElement.classList.contains('dark-mode') ||
    document.body.classList.contains('dark-mode') ||
    localStorage.getItem('darkMode') === 'enabled'
}

const effectiveDarkMode = computed(() => (
  props.isDarkMode === null ? detectedDarkMode.value : props.isDarkMode
))

onMounted(() => {
  detectedDarkMode.value = readDocumentDarkMode()

  if (typeof MutationObserver === 'undefined') return

  themeObserver = new MutationObserver(() => {
    detectedDarkMode.value = readDocumentDarkMode()
  })

  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
})

// Declare emitted events.
const emit = defineEmits(['close','login'])

const email = ref('')
const password = ref('')
const errorMessage = ref('')

// Emit upward; App.vue handles login.
function submit() {
  if (!email.value || !password.value) {
    errorMessage.value = t('messages.fieldsRequired')
    return
  }
  emit('login', email.value, password.value)
}

// Close button and overlay click.
function closeModal() {
  emit('close')
}
</script>

<style scoped>
.login-modal {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 1.25rem;
  background:
    radial-gradient(circle at 50% 18%, rgba(74, 144, 226, 0.28), transparent 34%),
    rgba(4, 12, 28, 0.72);
  backdrop-filter: blur(14px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
}

.login-card {
  width: min(100%, 430px);
  position: relative;
  overflow: hidden;
  padding: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  color: #0f172a;
  box-shadow: 0 30px 90px rgba(2, 6, 23, 0.42);
  animation: modalIn 0.2s ease-out;
}

.login-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: linear-gradient(90deg, #0b72e7, #64b5ff);
}

.login-header {
  margin-bottom: 1.35rem;
}

.login-kicker {
  display: inline-flex;
  margin-bottom: 0.55rem;
  color: #0b72e7;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 2rem;
  line-height: 1.05;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: #334155;
  font-size: 0.9rem;
  font-weight: 700;
}

.field-group input {
  width: 100%;
  min-height: 48px;
  padding: 0.85rem 0.95rem;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-weight: 600;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.field-group input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.field-group input:focus {
  border-color: #0b72e7;
  outline: none;
  box-shadow: 0 0 0 4px rgba(11, 114, 231, 0.14);
}

.form-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -0.1rem;
}

.forgot-link {
  color: #0b72e7;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.login-submit {
  width: 100%;
  min-height: 50px;
  margin-top: 0.15rem;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #0b72e7, #4aa4ff);
  color: #ffffff;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 800;
  box-shadow: 0 16px 34px rgba(11, 114, 231, 0.28);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.login-submit:hover,
.login-submit:focus-visible {
  transform: translateY(-1px);
  filter: brightness(1.03);
  box-shadow: 0 20px 40px rgba(11, 114, 231, 0.34);
  outline: none;
}

.error-message {
  margin: 0.1rem 0 0;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
  font-size: 0.9rem;
  font-weight: 700;
}

.close-btn {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #475569;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.close-btn:hover,
.close-btn:focus-visible {
  background: #eff6ff;
  color: #0b72e7;
  transform: rotate(90deg);
  outline: none;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

:global(html.dark-mode) .login-modal,
:global(body.dark-mode) .login-modal,
:global(.dark-mode) .login-modal,
.login-modal.dark {
  background:
    radial-gradient(circle at 50% 18%, rgba(74, 144, 226, 0.24), transparent 36%),
    rgba(2, 6, 23, 0.78);
}

:global(html.dark-mode) .login-card,
:global(body.dark-mode) .login-card,
:global(.dark-mode) .login-card,
.login-modal.dark .login-card {
  border-color: rgba(148, 163, 184, 0.18);
  background:
    linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.98));
  color: #e5e7eb;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.58);
}

:global(html.dark-mode) .login-header h2,
:global(body.dark-mode) .login-header h2,
:global(.dark-mode) .login-header h2,
.login-modal.dark .login-header h2 {
  color: #f8fafc;
}

:global(html.dark-mode) .field-group,
:global(body.dark-mode) .field-group,
:global(.dark-mode) .field-group,
.login-modal.dark .field-group {
  color: #cbd5e1;
}

:global(html.dark-mode) .field-group input,
:global(body.dark-mode) .field-group input,
:global(.dark-mode) .field-group input,
.login-modal.dark .field-group input {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.86);
  color: #f8fafc;
}

:global(html.dark-mode) .field-group input:focus,
:global(body.dark-mode) .field-group input:focus,
:global(.dark-mode) .field-group input:focus,
.login-modal.dark .field-group input:focus {
  border-color: #6fb2ff;
  box-shadow: 0 0 0 4px rgba(111, 178, 255, 0.16);
}

:global(html.dark-mode) .close-btn,
:global(body.dark-mode) .close-btn,
:global(.dark-mode) .close-btn,
.login-modal.dark .close-btn {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.78);
  color: #cbd5e1;
}

:global(html.dark-mode) .close-btn:hover,
:global(body.dark-mode) .close-btn:hover,
:global(.dark-mode) .close-btn:hover,
.login-modal.dark .close-btn:hover {
  background: rgba(30, 41, 59, 0.95);
  color: #93c5fd;
}

:global(html.dark-mode) .error-message,
:global(body.dark-mode) .error-message,
:global(.dark-mode) .error-message,
.login-modal.dark .error-message {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
}

@media (max-width: 480px) {
  .login-modal {
    align-items: flex-end;
    padding: 0.75rem;
  }

  .login-card {
    padding: 1.5rem;
    border-radius: 22px;
  }

  .login-header h2 {
    font-size: 1.7rem;
  }
}
</style>
