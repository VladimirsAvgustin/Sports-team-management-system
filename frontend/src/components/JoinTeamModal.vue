<template>
  <div class="join-modal" :class="{ dark: effectiveDarkMode }" @click.self="closeModal">
    <section
      class="join-card"
      role="dialog"
      aria-modal="true"
      :aria-label="copy.title"
    >
      <button
        type="button"
        class="close-button"
        :aria-label="$t('buttons.close')"
        @click="closeModal"
      >
        &times;
      </button>

      <header class="join-header">
        <span class="join-kicker">{{ copy.mode }}</span>
        <h2>{{ copy.title }}</h2>
        <p>{{ copy.description }}</p>
      </header>

      <form class="join-form" @submit.prevent="joinTeam">
        <label class="field-group" for="teamCode">
          <span>{{ $t('team.teamCode') }}</span>
          <div class="code-field" :class="{ invalid: hasError }">
            <input
              ref="teamCodeInput"
              v-model="teamCode"
              type="text"
              id="teamCode"
              autocomplete="one-time-code"
              autocapitalize="characters"
              inputmode="text"
              :maxlength="TEAM_CODE_LENGTH"
              spellcheck="false"
              required
              :aria-invalid="hasError ? 'true' : 'false'"
              :placeholder="$t('team.enterTeamCode')"
              :disabled="isSubmitting"
              @input="formatTeamCode"
            />
            <span class="code-count">{{ normalizedTeamCode.length }}/{{ TEAM_CODE_LENGTH }}</span>
          </div>
        </label>

        <div class="code-preview" aria-hidden="true">
          <span
            v-for="(char, index) in previewCharacters"
            :key="index"
            :class="{ filled: char }"
          >
            {{ char || '-' }}
          </span>
        </div>

        <p
          v-if="feedbackMessage"
          class="join-message"
          :class="feedbackType"
          role="status"
        >
          {{ feedbackMessage }}
        </p>

        <div class="join-actions">
          <button
            type="button"
            class="action-button secondary"
            :disabled="isSubmitting"
            @click="closeModal"
          >
            {{ $t('buttons.cancel') }}
          </button>
          <button
            type="submit"
            class="action-button primary"
            :disabled="isSubmitting || !isTeamCodeComplete"
          >
            <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
            {{ submitLabel }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const props = defineProps({
  isCoach: {
    type: Boolean,
    default: false
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  serverError: {
    type: String,
    default: ''
  },
  successMessage: {
    type: String,
    default: ''
  },
  isDarkMode: {
    type: Boolean,
    default: null
  }
})

const emit = defineEmits(['close', 'join'])

const teamCode = ref('')
const localError = ref('')
const teamCodeInput = ref(null)
const detectedDarkMode = ref(false)
let themeObserver = null
const TEAM_CODE_LENGTH = 6

const copyByLocale = {
  en: {
    player: {
      mode: 'Player access',
      title: 'Join Team',
      description: 'Enter the code from your coach to connect your account to the team workspace.',
      invalidLength: 'Team code must be exactly 6 characters.',
      submit: 'Join Team',
      submitting: 'Joining...'
    },
    coach: {
      mode: 'Coach access',
      title: 'Request Coach Access',
      description: 'Send the team code to the head coach so they can approve your assistant coach access.',
      invalidLength: 'Team code must be exactly 6 characters.',
      submit: 'Send Request',
      submitting: 'Sending...'
    }
  },
  lv: {
    player: {
      mode: 'Sp\u0113l\u0113t\u0101ja piek\u013cuve',
      title: 'Pievienoties komandai',
      description: 'Ievadiet trenera nos\u016bt\u012bto kodu, lai piesaist\u012btu kontu komandas darba videi.',
      invalidLength: 'Komandas kodam j\u0101b\u016bt tie\u0161i 6 simboliem.',
      submit: 'Pievienoties komandai',
      submitting: 'Pievieno...'
    },
    coach: {
      mode: 'Trenera piek\u013cuve',
      title: 'Piepras\u012bt trenera piek\u013cuvi',
      description: 'Nos\u016btiet komandas kodu galvenajam trenerim, lai vi\u0146\u0161 var apstiprin\u0101t asistenta piek\u013cuvi.',
      invalidLength: 'Komandas kodam j\u0101b\u016bt tie\u0161i 6 simboliem.',
      submit: 'Nos\u016bt\u012bt piepras\u012bjumu',
      submitting: 'Nos\u016bta...'
    }
  }
}

const copy = computed(() => {
  const language = locale.value === 'en' ? 'en' : 'lv'
  return copyByLocale[language][props.isCoach ? 'coach' : 'player']
})

const effectiveDarkMode = computed(() => (
  props.isDarkMode === null ? detectedDarkMode.value : props.isDarkMode
))

const normalizedTeamCode = computed(() => (
  teamCode.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, TEAM_CODE_LENGTH)
))

const previewCharacters = computed(() => {
  const preview = normalizedTeamCode.value.split('')
  while (preview.length < TEAM_CODE_LENGTH) {
    preview.push('')
  }
  return preview
})

const isTeamCodeComplete = computed(() => normalizedTeamCode.value.length === TEAM_CODE_LENGTH)

const hasError = computed(() => Boolean(localError.value || props.serverError))

const feedbackMessage = computed(() => (
  localError.value || props.serverError || props.successMessage
))

const feedbackType = computed(() => (
  props.successMessage && !hasError.value ? 'success' : 'error'
))

const submitLabel = computed(() => (
  props.isSubmitting ? copy.value.submitting : copy.value.submit
))

const readDocumentDarkMode = () => {
  if (typeof document === 'undefined') {
    return false
  }

  return document.documentElement.classList.contains('dark-mode') ||
    document.body.classList.contains('dark-mode') ||
    localStorage.getItem('darkMode') === 'enabled'
}

function formatTeamCode() {
  const formattedCode = normalizedTeamCode.value
  if (teamCode.value !== formattedCode) {
    teamCode.value = formattedCode
  }
  localError.value = ''
}

function joinTeam() {
  const code = normalizedTeamCode.value

  if (!code) {
    localError.value = t('messages.enterTeamCode')
    return
  }

  if (code.length !== TEAM_CODE_LENGTH) {
    localError.value = copy.value.invalidLength
    return
  }

  localError.value = ''
  emit('join', code)
}

function closeModal() {
  if (props.isSubmitting) {
    return
  }

  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeModal()
  }
}

onMounted(() => {
  detectedDarkMode.value = readDocumentDarkMode()
  document.addEventListener('keydown', handleKeydown)
  nextTick(() => teamCodeInput.value?.focus())

  if (typeof MutationObserver === 'undefined') {
    return
  }

  themeObserver = new MutationObserver(() => {
    detectedDarkMode.value = readDocumentDarkMode()
  })

  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  themeObserver?.disconnect()
})

watch(() => props.successMessage, (message) => {
  if (message) {
    teamCode.value = ''
    localError.value = ''
  }
})
</script>

<style scoped>
.join-modal {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(4, 12, 28, 0.72);
  backdrop-filter: blur(14px);
}

.join-card {
  position: relative;
  width: min(100%, 460px);
  overflow: hidden;
  padding: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 30px 90px rgba(2, 6, 23, 0.36);
  animation: modalIn 0.2s ease-out;
}

.join-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: linear-gradient(90deg, #0b72e7, #eb8b2d);
}

.close-button {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.close-button:hover,
.close-button:focus-visible {
  background: #eff6ff;
  color: #0b72e7;
  outline: none;
  transform: rotate(90deg);
}

.join-header {
  padding-right: 2.25rem;
}

.join-kicker {
  display: inline-flex;
  margin-bottom: 0.55rem;
  color: #0b72e7;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.join-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 2rem;
  line-height: 1.08;
}

.join-header p {
  margin: 0.8rem 0 0;
  color: #5f6c7c;
  font-size: 0.98rem;
  line-height: 1.6;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 1.35rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #334155;
  font-size: 0.86rem;
  font-weight: 800;
}

.field-group > span {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.code-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 50px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.code-field:focus-within {
  border-color: #0b72e7;
  box-shadow: 0 0 0 4px rgba(11, 114, 231, 0.14);
}

.code-field.invalid {
  border-color: #dc2626;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
}

.code-field input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 0.85rem 0.95rem;
  border: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-size: 1.05rem !important;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.code-field input:focus {
  outline: none;
}

.code-field input::placeholder {
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.code-field input:disabled {
  cursor: wait;
}

.code-count {
  padding: 0 0.9rem;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 800;
}

.code-preview {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.45rem;
}

.code-preview span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  min-height: 42px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: #f8fafc;
  color: #94a3b8;
  font-weight: 800;
}

.code-preview span.filled {
  border-color: rgba(11, 114, 231, 0.28);
  background: rgba(11, 114, 231, 0.08);
  color: #0b72e7;
}

.join-message {
  margin: 0;
  padding: 0.78rem 0.85rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.45;
}

.join-message.error {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.join-message.success {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.join-actions {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 0.75rem;
  margin-top: 0.2rem;
}

.action-button {
  min-height: 50px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 800;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, background 0.18s ease;
}

.action-button:hover,
.action-button:focus-visible {
  transform: translateY(-1px);
  outline: none;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.64;
  transform: none;
}

.action-button.secondary {
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: #ffffff;
  color: #334155;
}

.action-button.secondary:hover,
.action-button.secondary:focus-visible {
  background: #f8fafc;
}

.action-button.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  background: linear-gradient(135deg, #0b72e7, #084da8);
  color: #ffffff;
  box-shadow: 0 16px 34px rgba(11, 114, 231, 0.26);
}

.action-button.primary:hover,
.action-button.primary:focus-visible {
  filter: brightness(1.04);
  box-shadow: 0 20px 40px rgba(11, 114, 231, 0.32);
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.42);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: spin 0.75s linear infinite;
}

.join-modal.dark .join-card,
:global(html.dark-mode) .join-card,
:global(body.dark-mode) .join-card,
:global(.dark-mode) .join-card {
  border-color: rgba(148, 163, 184, 0.18);
  background: #111827;
  color: #e5e7eb;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.58);
}

.join-modal.dark .close-button,
:global(html.dark-mode) .close-button,
:global(body.dark-mode) .close-button,
:global(.dark-mode) .close-button {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.82);
  color: #cbd5e1;
}

.join-modal.dark .close-button:hover,
.join-modal.dark .close-button:focus-visible,
:global(html.dark-mode) .close-button:hover,
:global(body.dark-mode) .close-button:hover,
:global(.dark-mode) .close-button:hover {
  background: rgba(30, 41, 59, 0.95);
  color: #93c5fd;
}

.join-modal.dark .join-header h2,
:global(html.dark-mode) .join-header h2,
:global(body.dark-mode) .join-header h2,
:global(.dark-mode) .join-header h2 {
  color: #f8fafc;
}

.join-modal.dark .join-header p,
:global(html.dark-mode) .join-header p,
:global(body.dark-mode) .join-header p,
:global(.dark-mode) .join-header p {
  color: #cbd5e1;
}

.join-modal.dark .field-group,
:global(html.dark-mode) .field-group,
:global(body.dark-mode) .field-group,
:global(.dark-mode) .field-group {
  color: #cbd5e1;
}

.join-modal.dark .code-field,
:global(html.dark-mode) .code-field,
:global(body.dark-mode) .code-field,
:global(.dark-mode) .code-field {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.86);
}

.join-modal.dark .code-field:focus-within,
:global(html.dark-mode) .code-field:focus-within,
:global(body.dark-mode) .code-field:focus-within,
:global(.dark-mode) .code-field:focus-within {
  border-color: #6fb2ff;
  box-shadow: 0 0 0 4px rgba(111, 178, 255, 0.16);
}

.join-modal.dark .code-field input,
:global(html.dark-mode) .code-field input,
:global(body.dark-mode) .code-field input,
:global(.dark-mode) .code-field input {
  color: #f8fafc;
}

.join-modal.dark .code-preview span,
:global(html.dark-mode) .code-preview span,
:global(body.dark-mode) .code-preview span,
:global(.dark-mode) .code-preview span {
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.62);
  color: #64748b;
}

.join-modal.dark .code-preview span.filled,
:global(html.dark-mode) .code-preview span.filled,
:global(body.dark-mode) .code-preview span.filled,
:global(.dark-mode) .code-preview span.filled {
  border-color: rgba(96, 165, 250, 0.34);
  background: rgba(96, 165, 250, 0.13);
  color: #93c5fd;
}

.join-modal.dark .action-button.secondary,
:global(html.dark-mode) .action-button.secondary,
:global(body.dark-mode) .action-button.secondary,
:global(.dark-mode) .action-button.secondary {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
}

.join-modal.dark .action-button.secondary:hover,
.join-modal.dark .action-button.secondary:focus-visible,
:global(html.dark-mode) .action-button.secondary:hover,
:global(body.dark-mode) .action-button.secondary:hover,
:global(.dark-mode) .action-button.secondary:hover {
  background: rgba(30, 41, 59, 0.95);
}

.join-modal.dark .join-message.error,
:global(html.dark-mode) .join-message.error,
:global(body.dark-mode) .join-message.error,
:global(.dark-mode) .join-message.error {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
}

.join-modal.dark .join-message.success,
:global(html.dark-mode) .join-message.success,
:global(body.dark-mode) .join-message.success,
:global(.dark-mode) .join-message.success {
  background: rgba(74, 222, 128, 0.12);
  color: #86efac;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .join-modal {
    align-items: flex-end;
    padding: 0.75rem;
  }

  .join-card {
    padding: 1.5rem;
  }

  .join-header h2 {
    font-size: 1.65rem;
  }

  .join-actions {
    grid-template-columns: 1fr;
  }
}
</style>
