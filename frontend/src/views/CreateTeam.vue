<template>
  <div class="create-team-page">
    <div class="create-team-shell">
      <section class="create-team-hero">
        <div class="hero-copy">
          <p class="eyebrow">{{ copy.eyebrow }}</p>
          <h1>{{ $t('team.create') }}</h1>
          <p class="hero-description">
            {{ copy.description }}
          </p>

          <div class="setup-points">
            <div class="setup-point">
              <span>01</span>
              <strong>{{ copy.nameTeam }}</strong>
              <p>{{ copy.nameTeamText }}</p>
            </div>
            <div class="setup-point">
              <span>02</span>
              <strong>{{ copy.shareCode }}</strong>
              <p>{{ copy.shareCodeText }}</p>
            </div>
          </div>
        </div>

        <form class="team-form-card" @submit.prevent="createTeam">
          <div class="form-card-head">
            <p class="eyebrow">{{ copy.coachWorkspace }}</p>
            <h2>{{ copy.formTitle }}</h2>
          </div>

          <div class="form-group">
            <label for="name">{{ $t('team.teamName') }}</label>
            <input type="text" id="name" v-model="teamName" required />
          </div>

          <div class="form-group">
            <label for="teamCode">{{ $t('team.teamCodeAuto') }}</label>
            <div class="code-row">
              <input type="text" id="teamCode" v-model="teamCode" readonly />
              <button type="button" class="code-refresh" @click="generateTeamCode">
                {{ copy.regenerate }}
              </button>
            </div>
          </div>

          <button type="submit" class="submit-btn">{{ $t('team.create') }}</button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const teamName = ref('')
const teamCode = ref('')

const content = {
  en: {
    eyebrow: 'Team setup',
    description: 'Create a shared workspace for your team and invite players with the generated team code.',
    nameTeam: 'Name the team',
    nameTeamText: 'Use a name players will immediately recognize in the app.',
    shareCode: 'Share the code',
    shareCodeText: 'Players can join the roster with this code after registration.',
    coachWorkspace: 'Coach workspace',
    formTitle: 'Create team hub',
    regenerate: 'Regenerate',
    loginRequired: 'You need to log in as a coach.'
  },
  lv: {
    eyebrow: 'Komandas iestatīšana',
    description: 'Izveidojiet kopīgu darba vidi savai komandai un uzaiciniet spēlētājus ar ģenerēto komandas kodu.',
    nameTeam: 'Nosauciet komandu',
    nameTeamText: 'Izmantojiet nosaukumu, ko spēlētāji lietotnē uzreiz atpazīs.',
    shareCode: 'Kopīgojiet kodu',
    shareCodeText: 'Spēlētāji pēc reģistrācijas varēs pievienoties sastāvam ar šo kodu.',
    coachWorkspace: 'Trenera darba vide',
    formTitle: 'Izveidot komandas centru',
    regenerate: 'Ģenerēt no jauna',
    loginRequired: 'Jums jāpieslēdzas kā trenerim.'
  }
}

const copy = computed(() => content[locale.value === 'en' ? 'en' : 'lv'])

// Generate a random team code
function generateTeamCode() {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  teamCode.value = code
}

// Create the team
async function createTeam() {
  if (!auth.token) {
    alert(copy.value.loginRequired)
    return
  }

  try {
    const response = await axios.post(
      '/api/auth/teams',
      {
        name: teamName.value,
        teamCode: teamCode.value,
      },
      {
        headers: { Authorization: `Bearer ${auth.token}` }
      }
    )

    // Refresh user data to get the team ID
    await auth.fetchUser()

    alert(t('messages.teamCreated'))
    router.push('/')
  } catch (error) {
    console.error(error)
    alert(t('messages.error') + ': ' + (error.response?.data.error || error.message))
  }
}

onMounted(() => generateTeamCode())
</script>

<style scoped>
.create-team-page {
  --create-bg: linear-gradient(180deg, #f4efe4 0%, #f9f8f4 42%, #ffffff 100%);
  --create-surface: rgba(255, 255, 255, 0.88);
  --create-panel: #ffffff;
  --create-border: rgba(15, 23, 42, 0.08);
  --create-text: #0f172a;
  --create-muted: #5f6c7c;
  --create-accent: #0b72e7;
  --create-accent-strong: #084da8;
  --create-accent-soft: rgba(11, 114, 231, 0.14);
  --create-warm: #eb8b2d;
  --create-warm-soft: rgba(235, 139, 45, 0.16);
  --create-shadow: 0 24px 60px rgba(15, 23, 42, 0.1);
  --create-hero-bg:
    radial-gradient(circle at top right, rgba(11, 114, 231, 0.12), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.58));
  --create-card-bg: linear-gradient(180deg, var(--create-surface), rgba(255, 255, 255, 0.78));
  --create-point-bg: rgba(255, 255, 255, 0.64);
  --create-input-bg: rgba(255, 255, 255, 0.92);
  --create-input-readonly-bg: rgba(15, 23, 42, 0.03);
  --create-refresh-bg: var(--create-accent-soft);
  --create-refresh-hover-bg: rgba(11, 114, 231, 0.2);
  color-scheme: light;
  min-height: 100vh;
  padding: 28px 20px 56px;
  background:
    radial-gradient(circle at 12% 12%, var(--create-warm-soft), transparent 32%),
    radial-gradient(circle at 88% 18%, var(--create-accent-soft), transparent 34%),
    var(--create-bg);
  color: var(--create-text);
}

.create-team-shell {
  max-width: 1120px;
  margin: 0 auto;
}

.create-team-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  gap: 28px;
  overflow: hidden;
  padding: 34px;
  border: 1px solid var(--create-border);
  border-radius: 34px;
  background: var(--create-hero-bg);
  box-shadow: var(--create-shadow);
}

.create-team-hero::before,
.create-team-hero::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
}

.create-team-hero::before {
  width: 260px;
  height: 260px;
  right: -90px;
  top: -110px;
  background: rgba(11, 114, 231, 0.09);
}

.create-team-hero::after {
  width: 210px;
  height: 210px;
  left: -80px;
  bottom: -100px;
  background: rgba(235, 139, 45, 0.1);
}

.hero-copy,
.team-form-card {
  position: relative;
  z-index: 1;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.eyebrow {
  margin: 0;
  color: var(--create-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  max-width: 12ch;
  margin: 10px 0 0;
  font-size: clamp(2.4rem, 6vw, 4.2rem);
  line-height: 1.02;
  color: var(--create-text);
}

.hero-description {
  max-width: 58ch;
  margin: 18px 0 0;
  color: var(--create-muted);
  font-size: 1.05rem;
  line-height: 1.7;
}

.setup-points {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 28px;
}

.setup-point {
  padding: 18px;
  border: 1px solid var(--create-border);
  border-radius: 22px;
  background: var(--create-point-bg);
}

.setup-point span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  min-height: 34px;
  border-radius: 999px;
  background: var(--create-accent-soft);
  color: var(--create-accent);
  font-weight: 800;
  font-size: 0.82rem;
}

.setup-point strong {
  display: block;
  margin-top: 14px;
  font-size: 1.08rem;
}

.setup-point p {
  margin: 8px 0 0;
  color: var(--create-muted);
  line-height: 1.55;
}

.team-form-card {
  align-self: center;
  padding: 28px;
  border: 1px solid var(--create-border);
  border-radius: 28px;
  background: var(--create-card-bg);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(18px);
}

.form-card-head {
  margin-bottom: 22px;
}

.form-card-head h2 {
  margin: 8px 0 0;
  color: var(--create-text);
  font-size: 1.55rem;
  line-height: 1.15;
}

.form-group {
  margin-bottom: 18px;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--create-muted);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

input[type="text"] {
  width: 100%;
  padding: 0.95rem 1rem;
  border: 1px solid var(--create-border);
  border-radius: 16px;
  background: var(--create-input-bg);
  color: var(--create-text);
  font: inherit;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

input[type="text"]::placeholder {
  color: rgba(95, 108, 124, 0.72);
}

input[type="text"]:focus {
  outline: none;
  border-color: var(--create-accent);
  box-shadow: 0 0 0 3px rgba(11, 114, 231, 0.12);
}

input[type="text"]:read-only {
  background: var(--create-input-readonly-bg);
  color: var(--create-text);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.code-refresh,
.submit-btn {
  border: none;
  cursor: pointer;
  font-weight: 800;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}

.code-refresh {
  padding: 0 14px;
  border-radius: 16px;
  background: var(--create-refresh-bg);
  color: var(--create-accent);
}

.code-refresh:hover {
  transform: translateY(-1px);
  background: var(--create-refresh-hover-bg);
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--create-accent), var(--create-accent-strong));
  color: white;
  box-shadow: 0 16px 32px rgba(11, 114, 231, 0.24);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 42px rgba(11, 114, 231, 0.3);
}

:global(.dark-mode .create-team-page),
:global(html.dark-mode .create-team-page),
:global(body.dark-mode .create-team-page) {
  --create-bg: linear-gradient(180deg, #0f172a 0%, #111827 45%, #182235 100%);
  --create-surface: rgba(15, 23, 42, 0.92);
  --create-panel: rgba(15, 23, 42, 0.86);
  --create-border: rgba(148, 163, 184, 0.22);
  --create-text: #f8fafc;
  --create-muted: #cbd5e1;
  --create-accent: #60a5fa;
  --create-accent-strong: #3b82f6;
  --create-accent-soft: rgba(96, 165, 250, 0.16);
  --create-warm: #f6ad55;
  --create-warm-soft: rgba(246, 173, 85, 0.13);
  --create-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
  --create-hero-bg:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.14), transparent 36%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(17, 24, 39, 0.86));
  --create-card-bg: linear-gradient(180deg, var(--create-surface), rgba(15, 23, 42, 0.78));
  --create-point-bg: rgba(15, 23, 42, 0.58);
  --create-input-bg: rgba(15, 23, 42, 0.82);
  --create-input-readonly-bg: rgba(96, 165, 250, 0.1);
  --create-refresh-bg: rgba(96, 165, 250, 0.14);
  --create-refresh-hover-bg: rgba(96, 165, 250, 0.22);
  color-scheme: dark;
}

:global(.dark-mode .create-team-page .team-form-card),
:global(html.dark-mode .create-team-page .team-form-card),
:global(body.dark-mode .create-team-page .team-form-card) {
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
}

:global(.dark-mode .create-team-page .setup-point),
:global(html.dark-mode .create-team-page .setup-point),
:global(body.dark-mode .create-team-page .setup-point) {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global(.dark-mode .create-team-page .create-team-hero::before),
:global(html.dark-mode .create-team-page .create-team-hero::before),
:global(body.dark-mode .create-team-page .create-team-hero::before) {
  background: rgba(96, 165, 250, 0.12);
}

:global(.dark-mode .create-team-page .create-team-hero::after),
:global(html.dark-mode .create-team-page .create-team-hero::after),
:global(body.dark-mode .create-team-page .create-team-hero::after) {
  background: rgba(246, 173, 85, 0.12);
}

:global(.dark-mode .create-team-page input[type="text"]),
:global(html.dark-mode .create-team-page input[type="text"]),
:global(body.dark-mode .create-team-page input[type="text"]) {
  color: var(--create-text);
  caret-color: var(--create-accent);
}

:global(.dark-mode .create-team-page input[type="text"]::placeholder),
:global(html.dark-mode .create-team-page input[type="text"]::placeholder),
:global(body.dark-mode .create-team-page input[type="text"]::placeholder) {
  color: rgba(203, 213, 225, 0.62);
}

:global(.dark-mode .create-team-page input[type="text"]:focus),
:global(html.dark-mode .create-team-page input[type="text"]:focus),
:global(body.dark-mode .create-team-page input[type="text"]:focus) {
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.16);
}

:global(.dark-mode .create-team-page .code-refresh),
:global(html.dark-mode .create-team-page .code-refresh),
:global(body.dark-mode .create-team-page .code-refresh) {
  color: #bfdbfe;
}

@media (max-width: 900px) {
  .create-team-hero {
    grid-template-columns: 1fr;
  }

  h1 {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .create-team-page {
    padding: 16px 14px 36px;
  }

  .create-team-hero,
  .team-form-card {
    padding: 22px;
    border-radius: 24px;
  }

  .setup-points,
  .code-row {
    grid-template-columns: 1fr;
  }

  .code-refresh {
    min-height: 48px;
  }
}
</style>
